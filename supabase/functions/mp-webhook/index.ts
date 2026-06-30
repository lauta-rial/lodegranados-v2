import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  // MP sends GET to verify the webhook URL on setup
  if (req.method === 'GET') {
    return new Response('ok', { status: 200 })
  }

  try {
    const body = await req.json()
    const { type, data } = body

    // Only handle payment notifications
    if (type !== 'payment' || !data?.id) {
      return new Response('ok', { status: 200 })
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

    // Look up the pending checkout
    const { data: pending, error: lookupErr } = await supabase
      .from('pending_checkouts')
      .select('*')
      .eq('id', externalRef)
      .maybeSingle()

    if (lookupErr || !pending) {
      console.error('pending_checkout not found for external_reference:', externalRef)
      return new Response('ok', { status: 200 })
    }

    // Idempotency: already processed
    if (pending.processed_at) {
      return new Response('ok', { status: 200 })
    }

    // Map type to send-email type
    const emailType = pending.type === 'event'
      ? 'reservation'
      : pending.type === 'course'
      ? 'enrollment'
      : 'subscription'

    // Call send-email edge function
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
          siteUrl: 'https://lodegranados-v2-chi.vercel.app',
        },
      }),
    })

    if (!emailRes.ok) {
      console.error('send-email error:', await emailRes.text())
    }

    // Mark as processed
    await supabase
      .from('pending_checkouts')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', pending.id)

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('mp-webhook error:', err)
    // Always return 200 to MP to avoid retries on our errors
    return new Response('ok', { status: 200 })
  }
})
