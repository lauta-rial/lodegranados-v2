import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function validateSignature(req: Request, paymentId: string | number): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) return false // fail closed if secret not configured

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

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(MP_WEBHOOK_SECRET),
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

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('ok', { status: 200 })
  }

  try {
    const body = await req.json()
    const { type, data } = body

    if (type !== 'payment' || !data?.id) {
      return new Response('ok', { status: 200 })
    }

    // Validate MP signature
    const valid = await validateSignature(req, data.id)
    if (!valid) {
      console.warn('Invalid webhook signature for payment', data.id)
      return new Response('unauthorized', { status: 401 })
    }

    // Fetch payment details from MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
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

    const emailType = pending.type === 'event'
      ? 'reservation'
      : pending.type === 'course'
      ? 'enrollment'
      : 'subscription'

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: emailType,
        purchaseType: pending.type,
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
          siteUrl: Deno.env.get('SITE_URL') ?? 'https://lodegranados-v2-chi.vercel.app',
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
