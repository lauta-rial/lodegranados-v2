import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Lo de Granados <noreply@lodegranados.com>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    console.error('Resend error:', await res.text())
  }
}

function qrImgTag(token: string): string {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${token}&bgcolor=ffffff&color=6b2737&margin=10`
  return `<img src="${url}" width="220" height="220" alt="QR entrada" style="display:block;border-radius:8px;" />`
}

function emailBase(title: string, body: string, ctaUrl: string, ctaLabel: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf9f6;margin:0;padding:40px 0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e1d9">
  <div style="background:#6b2737;padding:32px 40px">
    <p style="color:#f5e6c8;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;margin:0">Lo de Granados</p>
    <h1 style="color:#fff;font-size:28px;font-weight:300;margin:8px 0 0">${title}</h1>
  </div>
  <div style="padding:40px">
    ${body}
    <div style="margin-top:32px;text-align:center">
      <a href="${ctaUrl}" style="display:inline-block;background:#6b2737;color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:14px;font-weight:500">${ctaLabel}</a>
    </div>
    <p style="margin-top:32px;font-size:12px;color:#9c8f83;text-align:center">Lo de Granados · Mendoza, Argentina</p>
  </div>
</div></body></html>`
}

function qrSection(tokens: string[]): string {
  if (tokens.length === 0) return ''
  const items = tokens.map((token, i) =>
    `<div style="text-align:center;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:13px;color:#6b2737;font-weight:600;letter-spacing:0.05em">ENTRADA ${i + 1}</p>
      ${qrImgTag(token)}
      <p style="margin:8px 0 0;font-size:11px;color:#9c8f83;word-break:break-all">${token}</p>
    </div>`
  ).join('')

  return `<div style="margin-top:28px;border-top:1px solid #e8e1d9;padding-top:28px">
    <p style="color:#3d2b1f;font-size:14px;font-weight:600;margin:0 0 20px;text-align:center">
      ${tokens.length > 1 ? 'Tus entradas' : 'Tu entrada'} — mostrá este QR en el ingreso
    </p>
    ${items}
  </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { type, ref, paymentId, userId, payerName, payerEmail, to, name, data: meta } = body

    const siteUrl = meta?.siteUrl ?? 'https://lodegranados-v2-chi.vercel.app'
    const spots = Math.max(1, parseInt(meta?.spots ?? '1') || 1)

    if (type === 'welcome') {
      const html = emailBase(
        '¡Bienvenido/a!',
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${name}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu cuenta en Lo de Granados fue creada exitosamente. Ya podés explorar nuestras catas, cursos y el Club DeVinos.</p>`,
        siteUrl,
        'Ir al sitio',
      )
      await sendEmail(to, 'Bienvenido/a a Lo de Granados', html)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (type === 'reservation') {
      let registrationId: string | null = null
      let skipDecrement = false

      // Idempotency check — but allow retry if tickets were never created
      if (paymentId) {
        const { data: existing } = await supabase
          .from('registrations')
          .select('id')
          .eq('event_id', ref)
          .eq('payment_id', paymentId)
          .maybeSingle()
        if (existing) {
          const { count } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .eq('registration_id', existing.id)
          if ((count ?? 0) > 0) {
            return new Response(JSON.stringify({ ok: true, skipped: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
          // Registration exists but no tickets — reuse it, skip re-inserting
          registrationId = existing.id
          skipDecrement = true
        }
      }

      if (!registrationId) {
        const { data: reg, error: dbErr } = await supabase.from('registrations').insert({
          event_id: ref,
          user_id: userId ?? null,
          name: payerName ?? name ?? null,
          email: payerEmail ?? to ?? null,
          payment_id: paymentId ?? null,
          spots,
        }).select('id').single()

        if (dbErr || !reg?.id) {
          console.error('DB insert error (registrations):', dbErr?.message)
          return new Response(JSON.stringify({ error: 'Error al registrar la reserva' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        registrationId = reg.id
      }

      if (!skipDecrement) {
        const { error: decrementErr } = await supabase.rpc('decrement_event_spots', { p_event_id: ref, p_amount: spots })
        if (decrementErr) console.error('decrement_event_spots error:', decrementErr.message)
      }

      const ticketRows = Array.from({ length: spots }, () => ({
        registration_id: registrationId!,
        event_id: ref,
      }))
      const { data: tickets, error: ticketErr } = await supabase
        .from('tickets')
        .insert(ticketRows)
        .select('token')
      if (ticketErr) {
        console.error('DB insert error (tickets):', ticketErr.message)
        return new Response(JSON.stringify({ error: 'Error al crear las entradas' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const tokensList = tickets.map((t: { token: string }) => t.token)

      const spotsLabel = spots > 1 ? ` (${spots} entradas)` : ''
      const html = emailBase(
        'Reserva confirmada',
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${payerName || name}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu reserva para <strong>${meta?.title ?? 'la cata'}</strong>${spotsLabel}${meta?.price ? ` por <strong>${meta.price}</strong>` : ''} fue confirmada. Te esperamos.</p>
         ${qrSection(tokensList)}`,
        `${siteUrl}/catas`,
        'Ver catas',
      )
      await sendEmail(payerEmail ?? to, 'Tu reserva está confirmada — Lo de Granados', html)
    }

    if (type === 'enrollment') {
      if (paymentId) {
        const { data: existing } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', ref)
          .eq('payment_id', paymentId)
          .maybeSingle()
        if (existing) {
          return new Response(JSON.stringify({ ok: true, skipped: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { error: dbErr } = await supabase.from('enrollments').insert({
        course_id: ref,
        user_id: userId ?? null,
        name: payerName ?? name ?? null,
        email: payerEmail ?? to ?? null,
        payment_id: paymentId ?? null,
        status: 'enrolled',
      })
      if (dbErr) {
        console.error('DB insert error (enrollments):', dbErr.message)
        return new Response(JSON.stringify({ error: 'Error al registrar la inscripción' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: decrementErr } = await supabase.rpc('decrement_course_spots', { p_course_id: ref })
      if (decrementErr) console.error('decrement_course_spots error:', decrementErr.message)

      const html = emailBase(
        'Inscripción confirmada',
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${payerName || name}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu inscripción al curso <strong>${meta?.title ?? ''}</strong>${meta?.price ? ` por <strong>${meta.price}</strong>` : ''} fue confirmada. Te contactaremos con más detalles.</p>`,
        `${siteUrl}/cursos`,
        'Ver cursos',
      )
      await sendEmail(payerEmail ?? to, 'Tu inscripción está confirmada — Lo de Granados', html)
    }

    if (type === 'subscription') {
      // Idempotency by payment_id
      if (paymentId) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('payment_id', paymentId)
          .maybeSingle()
        if (existing) {
          return new Response(JSON.stringify({ ok: true, skipped: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { data: plan } = await supabase.from('plans').select('branch_id, price').eq('id', ref).single()

      const { error: dbErr } = await supabase.from('subscriptions').insert({
        plan_id: ref,
        user_id: userId ?? null,
        branch_id: plan?.branch_id ?? null,
        monthly_price: meta?.priceAmount ?? plan?.price ?? null,
        start_date: new Date().toISOString().slice(0, 10),
        status: 'active',
        payment_id: paymentId ?? null,
      })
      if (dbErr) {
        console.error('DB insert error (subscriptions):', dbErr.message)
        return new Response(JSON.stringify({ error: 'Error al registrar la suscripción' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const html = emailBase(
        '¡Bienvenido/a al Club!',
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${payerName || name}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu suscripción al <strong>${meta?.title ?? 'Club DeVinos'}</strong>${meta?.price ? ` (${meta.price}/mes)` : ''} fue activada. Cada mes recibirás vinos seleccionados por nuestro sommelier.</p>`,
        `${siteUrl}/club`,
        'Ver mi Club',
      )
      await sendEmail(payerEmail ?? to, 'Bienvenido/a al Club DeVinos — Lo de Granados', html)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
