import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { handleOptions, jsonResponse } from "../_shared/http.ts"
import { getBranchMp, encodeSubRef, sanitizePayerEmail } from "../_shared/mp.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://lodegranados-v2-chi.vercel.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  const pre = handleOptions(req)
  if (pre) return pre

  try {
    const { planId, branchId, payerEmail, siteUrl } = await req.json()
    if (!planId) return jsonResponse({ error: 'Falta planId' }, 400)
    if (!branchId) return jsonResponse({ error: 'Falta branchId' }, 400)
    if (!payerEmail) return jsonResponse({ error: 'Falta el email del pagador' }, 400)

    // Who's subscribing — derived from the caller's JWT, never trusted from the
    // body. Guests (no session) resolve to null and subscribe by email only.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    let userId: string | null = null
    if (jwt) {
      const { data } = await supabase.auth.getUser(jwt)
      userId = data.user?.id ?? null
    }

    // Price + name come from our own plans row, never the client — that's what
    // the subscriber will actually be charged each month.
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('id, name, price')
      .eq('id', planId)
      .eq('active', true)
      .maybeSingle()
    if (planErr) console.error('create-mp-subscription: plans lookup failed', planErr.message)
    if (!plan || plan.price == null) return jsonResponse({ error: 'Plan no encontrado' }, 404)

    // Which MercadoPago account this branch collects into (global fallback).
    const { accessToken } = await getBranchMp(supabase, branchId)

    // MP's /preapproval endpoint 500s ("Internal server error") on a payer_email
    // that carries plus-addressing (juan+tag@gmail.com) — a legitimate address
    // real users have. In the pending flow the payer re-authenticates at the
    // init_point and MP ignores this email anyway (it comes back empty), so we
    // strip the +tag purely to get past MP's broken validation. See
    // sanitizePayerEmail.
    const cleanPayerEmail = sanitizePayerEmail(payerEmail)

    // Create the subscription WITHOUT a preapproval_plan_id — an inline
    // auto_recurring config is the only shape MP returns an init_point for
    // (a plan_id preapproval demands a card_token_id and gives no redirect),
    // and it lets us carry our own external_reference through to the webhook.
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `Club DeVinos — ${plan.name}`,
        payer_email: cleanPayerEmail,
        external_reference: encodeSubRef(branchId, userId, plan.id),
        back_url: `${siteUrl || SITE_URL}/pago-exitoso?type=plan`,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.price,
          currency_id: 'ARS',
        },
      }),
    })

    if (!mpRes.ok) {
      console.error('MP preapproval create error:', await mpRes.text())
      return jsonResponse({ error: 'No se pudo iniciar la suscripción' }, 502)
    }

    const data = await mpRes.json()
    const initPoint = data.init_point ?? data.sandbox_init_point
    if (!initPoint) {
      console.error('MP preapproval create: no init_point', JSON.stringify(data))
      return jsonResponse({ error: 'Este plan no está disponible para suscripción' }, 409)
    }

    return jsonResponse({ url: initPoint })
  } catch (err) {
    console.error('create-mp-subscription error:', err)
    return jsonResponse({ error: 'Error interno' }, 500)
  }
})
