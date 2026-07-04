import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { mpPlanId } = await req.json()
    if (!mpPlanId) {
      return new Response(JSON.stringify({ error: 'Falta mpPlanId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only proxy to preapproval plans we actually sell — a real Club plan
    // row must point at this mpPlanId. MP's own auth already scopes
    // /preapproval_plan/{id} to our collector, so this isn't closing a
    // cross-tenant leak; it's just refusing to act as a blind lookup proxy
    // for any preapproval_plan we've ever created (including old/retired
    // ones no longer meant to be sold).
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('id')
      .eq('mp_plan_id', mpPlanId)
      .eq('active', true)
      .maybeSingle()
    if (planErr) console.error('create-mp-subscription: plans lookup failed', planErr.message)
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Unlike checkout/preferences, a preapproval_plan's back_url is fixed
    // at plan-creation time in MercadoPago (not passed per-checkout) — so
    // there's nothing dynamic to build here, just fetch the plan's own
    // init_point where the user authorizes the recurring charge.
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval_plan/${mpPlanId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    if (!mpRes.ok) {
      console.error('MP preapproval_plan fetch error:', await mpRes.text())
      return new Response(JSON.stringify({ error: 'Error al obtener el plan de MercadoPago' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await mpRes.json()
    if (data.status !== 'active' || !data.init_point) {
      return new Response(JSON.stringify({ error: 'Este plan no está disponible para suscripción' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ url: data.init_point }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-mp-subscription error:', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
