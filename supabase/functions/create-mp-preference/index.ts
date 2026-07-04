import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://lodegranados-v2-chi.vercel.app'

const ALLOWED_ORIGINS = [
  SITE_URL,
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin ?? '') ? (origin ?? SITE_URL) : SITE_URL
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const { type, id, title, quantity = 1, userId, payerName, payerEmail, siteUrl } = await req.json()

    if (!type || !id || !title || !siteUrl) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Exact match or path-prefix — prevents subdomain-suffix bypass
    if (!ALLOWED_ORIGINS.some((o) => siteUrl === o || siteUrl.startsWith(o + '/'))) {
      return new Response(JSON.stringify({ error: 'Origen no permitido' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const numQuantity = Number(quantity)
    if (!Number.isInteger(numQuantity) || numQuantity < 1 || numQuantity > 20) {
      return new Response(JSON.stringify({ error: 'Cantidad inválida' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // The price is looked up server-side from the real row, never trusted
    // from the request body — a client used to be able to send any `price`
    // it wanted here and MercadoPago would just charge that. `type` still
    // distinguishes 'event'/'course' (both live in `events` now, kind is
    // irrelevant for pricing) from 'plan' (Club DeVinos, in `plans`).
    const priceTable = type === 'plan' ? 'plans' : 'events'
    const { data: priceRow, error: priceErr } = await supabase
      .from(priceTable)
      .select('price')
      .eq('id', id)
      .maybeSingle()
    if (priceErr || !priceRow || priceRow.price == null) {
      return new Response(JSON.stringify({ error: 'No se encontró el producto a pagar' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const numPrice = Number(priceRow.price)
    if (isNaN(numPrice) || numPrice <= 0) {
      return new Response(JSON.stringify({ error: 'El precio debe ser mayor a 0' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Save checkout intent to DB before redirecting to MP
    const { data: pending, error: pendingErr } = await supabase
      .from('pending_checkouts')
      .insert({
        type,
        ref: id,
        user_id: userId ?? null,
        payer_name: payerName ?? null,
        payer_email: payerEmail ?? null,
        spots: numQuantity,
        price: Math.round(numPrice),
      })
      .select('id')
      .single()

    if (pendingErr || !pending) {
      console.error('Error creating pending_checkout:', pendingErr?.message)
      return new Response(JSON.stringify({ error: 'Error al preparar el pago' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const backUrl = (status: string) =>
      `${siteUrl}/pago-${status}?type=${type}&ref=${id}`

    const payload = {
      items: [
        {
          title,
          quantity: numQuantity,
          unit_price: numPrice,
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: payerName ?? '',
        email: payerEmail ?? '',
      },
      back_urls: {
        success: backUrl('exitoso'),
        failure: backUrl('fallido'),
        pending: backUrl('pendiente'),
      },
      auto_return: 'approved',
      external_reference: pending.id,
      metadata: { type, ref: id },
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!mpRes.ok) {
      const err = await mpRes.text()
      console.error('MP API error:', err)
      return new Response(JSON.stringify({ error: 'Error al crear preferencia de pago' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const data = await mpRes.json()
    const url = MP_ACCESS_TOKEN.startsWith('TEST-') ? data.sandbox_init_point : data.init_point

    // Store preference ID for traceability
    await supabase
      .from('pending_checkouts')
      .update({ preference_id: data.id })
      .eq('id', pending.id)

    return new Response(JSON.stringify({ url, preferenceId: data.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    })
  }
})
