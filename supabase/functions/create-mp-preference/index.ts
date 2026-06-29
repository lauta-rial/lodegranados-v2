import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, id, title, price, quantity = 1, payerName, payerEmail, siteUrl } = await req.json()

    if (!type || !id || !title || price == null || !siteUrl) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const backUrl = (status: string) =>
      `${siteUrl}/pago-${status}?type=${type}&ref=${id}`

    const payload = {
      items: [
        {
          title,
          quantity,
          unit_price: Number(price),
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await mpRes.json()
    // sandbox_init_point for testing, init_point for production
    const url = MP_ACCESS_TOKEN.startsWith('TEST-') ? data.sandbox_init_point : data.init_point

    return new Response(JSON.stringify({ url, preferenceId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
