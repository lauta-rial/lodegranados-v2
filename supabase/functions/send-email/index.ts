import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { encodeBase64 } from "jsr:@std/encoding@1/base64"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Lo de Granados <noreply@lodegranados.com>'
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type Attachment = { filename: string; content: string }

async function sendEmail(to: string, subject: string, html: string, attachments?: Attachment[]) {
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
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html, ...(attachments?.length ? { attachments } : {}) }),
  })
  if (!res.ok) {
    console.error('Resend error:', await res.text())
  }
}

// Builds a branch-scoped link (all catas/cursos/club routes live under /:branchSlug/...).
// Falls back to the site root (branch picker) when we don't know the branch.
function branchUrl(siteUrl: string, branchSlug: string | undefined | null, path: string): string {
  return branchSlug ? `${siteUrl}/${branchSlug}/${path}` : siteUrl
}

// branchSlug/title are derived here from the DB via `ref`, rather than trusted
// purely from the caller's `data` payload — mp-webhook (the server-to-server
// MP webhook, which can legitimately win the idempotency race against the
// browser's own call) never had branch/title info to send, which produced
// confirmation emails with a broken CTA link and a blank course name. `meta`
// values (when a caller does have them) still take priority — this is only
// a fallback.
async function resolveBranchSlug(branchId: string | null | undefined): Promise<string | null> {
  if (!branchId) return null
  const { data } = await supabase.from('branches').select('slug').eq('id', branchId).maybeSingle()
  return data?.slug ?? null
}

type VerifiedCheckout = {
  ref: string
  type: string
  spots: number
  price: number | null
  payerName: string | null
  payerEmail: string | null
  userId: string | null
}

// This is the one gate that decides whether 'reservation'/'subscription'
// actually get to write a registration/subscription + generate tickets.
// Both callers of this function (mp-webhook, server-to-server; and
// PagoExitoso.tsx, directly from the browser — this endpoint is
// verify_jwt:false on purpose, so anyone with the public anon key can reach
// it) used to be trusted to say "the payment was approved" themselves.
// mp-webhook actually does verify against MercadoPago before calling this,
// but PagoExitoso.tsx only checked a client-side `status` URL param, which
// is fully attacker-controlled — no server ever confirmed a real payment
// existed. Re-verifying here, independent of the caller, closes that gap
// for good regardless of which path reaches this function. `ref`/`spots`/
// `price` are read back from the DB row created at preference-creation
// time (server-side, in create-mp-preference) rather than trusted from the
// request body, so a caller can't claim a different (cheaper, or entirely
// unpaid-for) event/spots count than what was actually paid.
async function verifyApprovedPayment(paymentId: string | null | undefined): Promise<VerifiedCheckout | null> {
  if (!paymentId || !MP_ACCESS_TOKEN) return null

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  })
  if (!mpRes.ok) {
    console.error('verifyApprovedPayment: MP payment fetch failed', await mpRes.text())
    return null
  }
  const payment = await mpRes.json()
  if (payment.status !== 'approved' || !payment.external_reference) return null

  const { data: pending } = await supabase
    .from('pending_checkouts')
    .select('*')
    .eq('id', payment.external_reference)
    .maybeSingle()
  if (!pending) return null

  return {
    ref: pending.ref,
    type: pending.type,
    spots: pending.spots ?? 1,
    price: pending.price ?? null,
    payerName: pending.payer_name ?? null,
    payerEmail: pending.payer_email ?? null,
    userId: pending.user_id ?? null,
  }
}

function formatEventDateTime(date: string | null, time: string | null): string {
  if (!date) return ''
  // events.date is a plain calendar date with no time-of-day/timezone — it
  // means "this day", full stop. new Date(date) anchors it to UTC midnight of
  // the right day, so formatting in UTC preserves that day exactly. (Do NOT
  // format this in America/Argentina/Buenos_Aires — that shifts UTC midnight
  // back to 21:00 the PREVIOUS day, showing the wrong date/weekday for every
  // single event. Matches formatDate() in src/lib/utils.ts, same reasoning.)
  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
  const timeLabel = time ? ` · ${time.slice(0, 5)} hs` : ''
  return `${dateLabel}${timeLabel}`
}

function qrPngUrl(token: string, size: number): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${token}&bgcolor=ffffff&color=6b2737&margin=10`
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

// A light info card for event details (date/time/location) — sits between the
// confirmation copy and the attachments notice so the email reads like an actual ticket.
function detailsCard(rows: Array<[string, string]>): string {
  const visible = rows.filter(([, value]) => value)
  if (visible.length === 0) return ''
  const items = visible.map(([label, value]) =>
    `<tr>
      <td style="padding:4px 12px 4px 0;font-size:12px;color:#9c8f83;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:4px 0;font-size:14px;color:#3d2b1f;">${value}</td>
    </tr>`
  ).join('')
  return `<table style="margin-top:20px;width:100%;background:#faf9f6;border-radius:10px;padding:16px 18px;border-collapse:collapse">${items}</table>`
}

// The QR codes themselves only live in the attached PDFs now — the body just
// points to them, so the email doesn't duplicate the same ticket twice.
// `attached` reflects what actually made it into the email (some tickets' PDF
// generation can fail independently — see buildAllTicketPdfs), not how many
// tickets were purchased, so this never claims something isn't really there.
function attachmentsNotice(attached: number, expected: number): string {
  if (attached === 0) {
    return `<div style="margin-top:28px;border-top:1px solid #e8e1d9;padding-top:24px;text-align:center">
      <p style="color:#b45309;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px">
        No pudimos generar tu${expected > 1 ? 's' : ''} entrada${expected > 1 ? 's' : ''} en PDF
      </p>
      <p style="color:#3d2b1f;font-size:13px;line-height:1.6;margin:0">Respondé este email o escribinos y te la reenviamos.</p>
    </div>`
  }
  const partialNote = attached < expected
    ? ` (no pudimos generar ${expected - attached} — respondé este email si te falta alguna)`
    : ''
  const label = attached > 1
    ? `Te adjuntamos ${attached} entradas en PDF, cada una por separado — reenviá solo la que corresponda si compartís la reserva.${partialNote}`
    : `Te adjuntamos tu entrada en PDF — mostrá el código QR en el ingreso.${partialNote}`
  return `<div style="margin-top:28px;border-top:1px solid #e8e1d9;padding-top:24px;text-align:center">
    <p style="color:#6b2737;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 8px">
      ${attached > 1 ? `${attached} entradas adjuntas (PDF)` : 'Entrada adjunta (PDF)'}
    </p>
    <p style="color:#3d2b1f;font-size:13px;line-height:1.6;margin:0">${label}</p>
  </div>`
}

const WINE = rgb(0x6b / 255, 0x27 / 255, 0x37 / 255)
const DARK = rgb(0x3d / 255, 0x2b / 255, 0x1f / 255)
const MUTED = rgb(0x9c / 255, 0x8f / 255, 0x83 / 255)
const CREAM = rgb(0xf5 / 255, 0xe6 / 255, 0xc8 / 255)

function drawCenteredText(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = DARK) {
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: (page.getWidth() - width) / 2, y, size, font, color })
}

// One ticket per PDF — each attachment is self-contained (event info + a single
// centered QR) so a buyer can forward just one entrada without exposing the rest.
// Fonts are embedded fresh per ticket: a PDFFont from pdf-lib holds an indirect
// reference that's only meaningful inside the PDFDocument that embedded it —
// reusing one across separate documents corrupts the font resource on save
// (confirmed: pypdf couldn't even parse the font dict of a shared-font PDF).
// Standard-font embedding is cheap, so there's no real cost to doing it per doc.
async function buildTicketPdf(params: {
  eventTitle: string
  dateTimeLabel: string
  location: string
  index: number
  total: number
  token: string
}): Promise<Uint8Array> {
  const qrRes = await fetch(qrPngUrl(params.token, 440))
  if (!qrRes.ok) throw new Error(`QR fetch failed: ${qrRes.status}`)
  const qrBytes = new Uint8Array(await qrRes.arrayBuffer())

  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([420, 620])
  const width = page.getWidth()

  page.drawRectangle({ x: 0, y: page.getHeight() - 96, width, height: 96, color: WINE })
  drawCenteredText(page, 'LO DE GRANADOS', bold, 11, page.getHeight() - 38, CREAM)
  drawCenteredText(page, params.eventTitle, bold, 17, page.getHeight() - 64, rgb(1, 1, 1))

  let y = page.getHeight() - 130
  if (params.dateTimeLabel) {
    drawCenteredText(page, params.dateTimeLabel, regular, 11, y, DARK)
    y -= 18
  }
  if (params.location) {
    drawCenteredText(page, params.location, regular, 11, y, DARK)
    y -= 18
  }

  const qrImage = await doc.embedPng(qrBytes)
  const qrSize = 260
  const qrY = y - qrSize - 24
  page.drawImage(qrImage, { x: (width - qrSize) / 2, y: qrY, width: qrSize, height: qrSize })

  drawCenteredText(page, `ENTRADA ${params.index} DE ${params.total}`, bold, 12, qrY - 26, WINE)
  drawCenteredText(page, 'Mostrá este QR en el ingreso', regular, 10, qrY - 44, MUTED)
  drawCenteredText(page, params.token, regular, 8, 40, MUTED)

  return doc.save()
}

// Builds every ticket PDF independently — one failing (e.g. a transient QR
// fetch error) no longer takes the rest down with it (Promise.all would
// reject the whole batch on a single rejection).
async function buildAllTicketPdfs(
  tokensList: string[],
  eventTitle: string,
  dateTimeLabel: string,
  location: string,
): Promise<Attachment[]> {
  if (tokensList.length === 0) return []

  const results = await Promise.allSettled(
    tokensList.map((token, i) =>
      buildTicketPdf({ eventTitle, dateTimeLabel, location, index: i + 1, total: tokensList.length, token })
    )
  )

  const attachments: Attachment[] = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      attachments.push({
        filename: tokensList.length > 1 ? `entrada-${i + 1}-de-${tokensList.length}.pdf` : 'entrada.pdf',
        content: encodeBase64(result.value),
      })
    } else {
      console.error(`PDF generation failed for ticket ${i + 1}/${tokensList.length}:`, result.reason)
    }
  })
  return attachments
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
    const greetingName = payerName || name

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

    // Staff (admin/host) accounts are created by manage-staff (service role,
    // auth.admin.inviteUserByEmail) — that call already triggers Supabase's
    // own "confirm your account" email. This is the *second*, separate
    // welcome mail the admin asked for, explaining what the role means.
    if (type === 'staff_welcome') {
      const role = meta?.role === 'admin' ? 'administrador/a' : 'host'
      const html = emailBase(
        '¡Bienvenido/a al equipo!',
        `<p style="color:#3d2b1f;line-height:1.7">Hola,</p>
         <p style="color:#3d2b1f;line-height:1.7">Te dimos de alta como <strong>${role}</strong> en el panel de Lo de Granados. Ya recibiste (o vas a recibir en un instante) un mail separado para confirmar tu cuenta y elegir una contraseña — una vez que la confirmes, vas a poder ingresar al panel.</p>`,
        siteUrl,
        'Ir al panel',
      )
      await sendEmail(to, 'Bienvenido/a al equipo de Lo de Granados', html)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fired by assign-host every time an admin assigns a host to a specific
    // event — the host needs to know without having to check the panel.
    if (type === 'staff_event_assigned') {
      const html = emailBase(
        'Te asignaron un evento',
        `<p style="color:#3d2b1f;line-height:1.7">Hola,</p>
         <p style="color:#3d2b1f;line-height:1.7">Te asignaron como host de <strong>${meta?.eventTitle ?? ''}</strong>${meta?.eventDate ? ` (${meta.eventDate})` : ''}. Vas a poder escanear las entradas desde el panel el día del evento.</p>`,
        `${siteUrl}/admin`,
        'Ir al panel',
      )
      await sendEmail(to, `Te asignaron a "${meta?.eventTitle ?? 'un evento'}"`, html)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (type === 'reservation') {
      // events absorbed courses (kind: 'cata'|'curso') and registrations
      // absorbed enrollments — this branch now covers both. Tickets are no
      // longer inserted by hand: a DB trigger on `registrations` (AFTER
      // INSERT) generates `spots` tickets per existing session automatically,
      // in the same transaction as the insert — see migration
      // per_session_tickets_and_session_lifecycle. Calling
      // backfill_tickets_for_registration explicitly below is a no-op for a
      // fresh insert (the trigger already did it) and is what actually
      // creates the tickets for the "existing registration, retry" path,
      // replacing the old manual insert-tickets-on-retry branch.
      //
      // ref/spots below are read from the verified pending_checkouts row,
      // never from the request body — see verifyApprovedPayment. Without
      // this, anyone with the public anon key could call this endpoint
      // directly (verify_jwt is false on purpose, for mp-webhook and
      // PagoExitoso.tsx) and claim any ref/spots with no real payment at
      // all — confirmed exploitable, not theoretical, before this fix.
      const verified = await verifyApprovedPayment(paymentId)
      if (!verified) {
        return new Response(JSON.stringify({ error: 'No pudimos verificar el pago' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const ref = verified.ref
      const spots = Math.max(1, verified.spots)

      const { data: eventRow } = await supabase
        .from('events')
        .select('title, date, time, location, branch_id, kind')
        .eq('id', ref)
        .maybeSingle()
      const isCata = eventRow?.kind !== 'curso'

      let registrationId: string | null = null

      if (paymentId) {
        const { data: existing } = await supabase
          .from('registrations')
          .select('id, spots')
          .eq('event_id', ref)
          .eq('payment_id', paymentId)
          .maybeSingle()
        if (existing) {
          if (!isCata) {
            // cursos never attach ticket PDFs to the email — just make sure
            // the tickets exist (safety net) and stop, same as before.
            await supabase.rpc('backfill_tickets_for_registration', {
              p_registration_id: existing.id, p_event_id: ref, p_spots: existing.spots ?? 1,
            })
            return new Response(JSON.stringify({ ok: true, skipped: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
          const { count } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .eq('registration_id', existing.id)
          if ((count ?? 0) >= (existing.spots ?? 1)) {
            return new Response(JSON.stringify({ ok: true, skipped: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
          // Registration exists but is short on tickets (partial failure on
          // a previous attempt) — reuse it, top up tickets below.
          registrationId = existing.id
        }
      }

      if (!registrationId) {
        // available_spots is derived by a DB trigger from this table's rows
        // (see migration self_healing_event_available_spots) — inserting
        // here is what updates the count, no separate decrement call needed.
        const { data: reg, error: dbErr } = await supabase.from('registrations').insert({
          event_id: ref,
          user_id: userId ?? null,
          name: payerName ?? name ?? null,
          email: payerEmail ?? to ?? null,
          payment_id: paymentId ?? null,
          spots: isCata ? spots : 1,
          status: isCata ? null : 'enrolled',
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

      const dateTimeLabel = formatEventDateTime(eventRow?.date ?? null, eventRow?.time ?? null)
      const eventTitle = meta?.title ?? eventRow?.title ?? 'Lo de Granados'
      const branchSlug = meta?.branchSlug ?? await resolveBranchSlug(eventRow?.branch_id)

      if (!isCata) {
        await supabase.rpc('backfill_tickets_for_registration', {
          p_registration_id: registrationId, p_event_id: ref, p_spots: 1,
        })
        const html = emailBase(
          'Inscripción confirmada',
          `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${greetingName}</strong>,</p>
           <p style="color:#3d2b1f;line-height:1.7">Tu inscripción al curso <strong>${eventTitle}</strong>${meta?.price ? ` por <strong>${meta.price}</strong>` : ''} fue confirmada. Te contactaremos con más detalles.</p>`,
          branchUrl(siteUrl, branchSlug, 'cursos'),
          'Ver cursos',
        )
        await sendEmail(payerEmail ?? to, 'Tu inscripción está confirmada — Lo de Granados', html)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { error: ticketErr } = await supabase.rpc('backfill_tickets_for_registration', {
        p_registration_id: registrationId, p_event_id: ref, p_spots: spots,
      })
      if (ticketErr) {
        console.error('Ticket backfill error:', ticketErr.message)
        return new Response(JSON.stringify({ error: 'Error al crear las entradas' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: tickets } = await supabase.from('tickets').select('token').eq('registration_id', registrationId)
      const tokensList = (tickets ?? []).map((t: { token: string }) => t.token)

      const attachments = await buildAllTicketPdfs(tokensList, eventTitle, dateTimeLabel, eventRow?.location ?? '')

      const spotsLabel = spots > 1 ? ` (${spots} entradas)` : ''
      const html = emailBase(
        'Reserva confirmada',
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${greetingName}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu reserva para <strong>${eventTitle}</strong>${spotsLabel}${meta?.price ? ` por <strong>${meta.price}</strong>` : ''} fue confirmada. Te esperamos.</p>
         ${detailsCard([
           ['Cuándo', dateTimeLabel],
           ['Dónde', eventRow?.location ?? ''],
         ])}
         ${attachmentsNotice(attachments.length, tokensList.length)}`,
        branchUrl(siteUrl, branchSlug, 'catas'),
        'Ver catas',
      )
      await sendEmail(payerEmail ?? to, 'Tu reserva está confirmada — Lo de Granados', html, attachments)
    }

    if (type === 'subscription') {
      // Same verification gate as 'reservation' above, same reason: this
      // endpoint is reachable directly with just the public anon key, and
      // must not activate a subscription without confirming a real
      // approved payment first. `ref` (the plan id) comes from the
      // verified pending_checkouts row, not the request body.
      const verifiedSub = await verifyApprovedPayment(paymentId)
      if (!verifiedSub) {
        return new Response(JSON.stringify({ error: 'No pudimos verificar el pago' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const ref = verifiedSub.ref

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

      const { data: plan } = await supabase.from('plans').select('name, branch_id, price').eq('id', ref).single()

      const { error: dbErr } = await supabase.from('subscriptions').insert({
        plan_id: ref,
        user_id: userId ?? null,
        branch_id: plan?.branch_id ?? null,
        // Always the DB's own price, never meta?.priceAmount — that came
        // from the request body, which is exactly the value this whole
        // verification gate exists to stop trusting.
        monthly_price: plan?.price ?? null,
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

      const planTitle = meta?.title ?? plan?.name ?? 'Club DeVinos'
      const branchSlug = meta?.branchSlug ?? await resolveBranchSlug(plan?.branch_id)

      const html = emailBase(
        '¡Bienvenido/a al Club!',
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${greetingName}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu suscripción al <strong>${planTitle}</strong>${meta?.price ? ` (${meta.price}/mes)` : ''} fue activada. Cada mes recibirás vinos seleccionados por nuestro sommelier.</p>`,
        branchUrl(siteUrl, branchSlug, 'club'),
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
