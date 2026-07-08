import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { getBranchMp, decodeSubRef } from "../_shared/mp.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function validateSignature(req: Request, resourceId: string | number, secret: string): Promise<boolean> {
  if (!secret) return false // fail closed if secret not configured

  const signature = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''

  const parts: Record<string, string> = {}
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=')
    if (key && value) parts[key.trim()] = value.trim()
  }

  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === v1
}

// Fired on every change to a subscriber's recurring authorization (created,
// authorized, paused, cancelled). 'authorized' is forwarded to send-email —
// same idempotent activation path PagoExitoso.tsx uses on the browser
// redirect, a backup in case the user closes their browser right after
// authorizing, before that redirect's JS runs. The branch + user come from the
// preapproval's external_reference (stamped by create-mp-subscription), since
// the notification itself carries no such context. 'cancelled'/'paused' are
// synced directly here.
async function handleSubscriptionPreapproval(preapprovalId: string, accessToken: string, siteUrl: string) {
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!mpRes.ok) {
    console.error('mp-webhook: preapproval fetch failed', await mpRes.text())
    return
  }
  const preapproval = await mpRes.json()

  if (preapproval.status === 'authorized') {
    const { branchId, userId } = decodeSubRef(preapproval.external_reference)
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'subscription',
        preapprovalId,
        userId,
        to: preapproval.payer_email ?? '',
        data: { branchId, siteUrl },
      }),
    })
    if (!emailRes.ok) console.error('mp-webhook: send-email (subscription) error:', await emailRes.text())
    return
  }

  if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: preapproval.status })
      .eq('preapproval_id', preapprovalId)
    if (error) console.error('mp-webhook: subscriptions status sync failed', error.message)
  }
}

// Fired once per recurring charge (roughly monthly, per subscriber) — always
// forwarded to send-email, which independently re-verifies the
// authorized_payment against MP before sending a receipt.
async function handleSubscriptionAuthorizedPayment(authorizedPaymentId: string, branchId: string | null, siteUrl: string) {
  const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'subscription_charged', authorizedPaymentId, data: { branchId, siteUrl } }),
  })
  if (!emailRes.ok) console.error('mp-webhook: send-email (subscription_charged) error:', await emailRes.text())
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('ok', { status: 200 })
  }

  try {
    // Which branch's MercadoPago account sent this notification. Each branch
    // that loads its own MP credentials configures its webhook URL with
    // ?branch=<id>; without it (the winery's shared account) we fall back to
    // the global token/secret. The branch decides which secret verifies the
    // signature and which token fetches the resource.
    const branchQ = new URL(req.url).searchParams.get('branch')
    const { accessToken, webhookSecret } = await getBranchMp(supabase, branchQ)
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://lodegranados-v2-chi.vercel.app'

    const body = await req.json()
    const { type, data } = body

    if (!data?.id) {
      return new Response('ok', { status: 200 })
    }

    // The HMAC manifest is `id:{data.id};request-id:...;ts:...` regardless
    // of topic — MP uses the same signature scheme for payment, preapproval,
    // and authorized_payment notifications alike.
    const valid = await validateSignature(req, data.id, webhookSecret)
    if (!valid) {
      console.warn('Invalid webhook signature for', type, data.id)
      return new Response('unauthorized', { status: 401 })
    }

    if (type === 'subscription_preapproval') {
      await handleSubscriptionPreapproval(String(data.id), accessToken, siteUrl)
      return new Response('ok', { status: 200 })
    }

    if (type === 'subscription_authorized_payment') {
      await handleSubscriptionAuthorizedPayment(String(data.id), branchQ, siteUrl)
      return new Response('ok', { status: 200 })
    }

    if (type !== 'payment') {
      return new Response('ok', { status: 200 })
    }

    // Fetch payment details from MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!mpRes.ok) {
      console.error('MP payment fetch error:', await mpRes.text())
      return new Response('ok', { status: 200 })
    }

    const payment = await mpRes.json()

    if (payment.status !== 'approved') {
      return new Response('ok', { status: 200 })
    }

    const externalRef = payment.external_reference
    if (!externalRef) {
      console.warn('No external_reference in payment', payment.id)
      return new Response('ok', { status: 200 })
    }

    const { data: pending, error: lookupErr } = await supabase
      .from('pending_checkouts')
      .select('*')
      .eq('id', externalRef)
      .maybeSingle()

    if (lookupErr || !pending) {
      console.error('pending_checkout not found for external_reference:', externalRef)
      return new Response('ok', { status: 200 })
    }

    if (pending.processed_at) {
      return new Response('ok', { status: 200 })
    }

    // 'event' and 'course' both land on 'reservation' — registrations
    // absorbed enrollments, and events absorbed courses (kind: 'cata'|'curso'),
    // so send-email's reservation branch handles both by looking at the
    // event's own kind. 'plan' can't reach this 'payment' handler — Club
    // subscriptions go through handleSubscriptionPreapproval above instead.
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'reservation',
        ref: pending.ref,
        paymentId: String(payment.id),
        userId: pending.user_id ?? null,
        payerName: pending.payer_name ?? '',
        payerEmail: pending.payer_email ?? '',
        to: pending.payer_email ?? '',
        name: pending.payer_name ?? '',
        data: {
          spots: pending.spots ?? 1,
          price: pending.price ? `$${(pending.price).toLocaleString('es-AR')}` : undefined,
          priceAmount: pending.price ?? null,
          siteUrl,
        },
      }),
    })

    if (!emailRes.ok) {
      console.error('send-email error:', await emailRes.text())
      // Don't stamp processed_at — let MercadoPago retry the webhook
      return new Response('ok', { status: 200 })
    }

    await supabase
      .from('pending_checkouts')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', pending.id)

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('mp-webhook error:', err)
    return new Response('ok', { status: 200 })
  }
})
