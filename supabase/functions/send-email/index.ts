import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { encodeBase64 } from "jsr:@std/encoding@1/base64"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Lo de Granados <noreply@lodegranados.com>'

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

function formatEventDateTime(date: string | null, time: string | null): string {
  if (!date) return ''
  // Matches formatDate() in src/lib/utils.ts: parse the date-only string as UTC
  // midnight, then render in Argentina's timezone explicitly (not the server's
  // ambient TZ) so the date shown here always matches what the site displays.
  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(date))
  const timeLabel = time ? ` · ${time.slice(0, 5)} hs` : ''
  return `${dateLabel}${timeLabel}`
}

function qrPngUrl(token: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${token}&bgcolor=ffffff&color=6b2737&margin=10`
}

function qrImgTag(token: string): string {
  // margin:0 auto centers the image — text-align:center on the parent has no
  // effect here because the <img> is display:block.
  return `<img src="${qrPngUrl(token)}" width="220" height="220" alt="QR entrada" style="display:block;margin:0 auto;border-radius:8px;" />`
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
// confirmation copy and the QR codes so the email reads like an actual ticket.
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

function qrSection(tokens: string[]): string {
  if (tokens.length === 0) return ''
  const items = tokens.map((token, i) =>
    `<div style="text-align:center;margin-bottom:16px;padding:20px;border:1px solid #e8e1d9;border-radius:12px">
      <p style="margin:0 0 12px;font-size:12px;color:#6b2737;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Entrada ${i + 1} de ${tokens.length}</p>
      ${qrImgTag(token)}
      <p style="margin:10px 0 0;font-size:10px;color:#c4b8ab;word-break:break-all">${token}</p>
    </div>`
  ).join('')

  return `<div style="margin-top:28px;border-top:1px solid #e8e1d9;padding-top:28px">
    <p style="color:#3d2b1f;font-size:14px;font-weight:600;margin:0 0 20px;text-align:center">
      ${tokens.length > 1 ? 'Tus entradas' : 'Tu entrada'} — mostrá este QR en el ingreso
    </p>
    ${items}
    <p style="margin-top:16px;font-size:12px;color:#9c8f83;text-align:center">
      ${tokens.length > 1 ? 'Cada entrada también va adjunta como PDF individual, para que puedas reenviarla por separado.' : 'Tu entrada también va adjunta como PDF.'}
    </p>
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
async function buildTicketPdf(params: {
  eventTitle: string
  dateTimeLabel: string
  location: string
  index: number
  total: number
  token: string
}): Promise<Uint8Array> {
  const qrRes = await fetch(qrPngUrl(params.token, 440))
  const qrBytes = new Uint8Array(await qrRes.arrayBuffer())

  const doc = await PDFDocument.create()
  const page = doc.addPage([420, 620])
  const width = page.getWidth()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { type, ref, paymentId, userId, payerName, payerEmail, to, name, data: meta } = body

    const siteUrl = meta?.siteUrl ?? 'https://lodegranados-v2-chi.vercel.app'
    const branchSlug = meta?.branchSlug ?? null
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

      const { data: eventRow } = await supabase
        .from('events')
        .select('date, time, location')
        .eq('id', ref)
        .maybeSingle()

      const dateTimeLabel = formatEventDateTime(eventRow?.date ?? null, eventRow?.time ?? null)
      const eventTitle = meta?.title ?? 'Lo de Granados'

      let attachments: Attachment[] = []
      try {
        const pdfs = await Promise.all(
          tokensList.map((token: string, i: number) =>
            buildTicketPdf({
              eventTitle,
              dateTimeLabel,
              location: eventRow?.location ?? '',
              index: i + 1,
              total: tokensList.length,
              token,
            })
          )
        )
        attachments = pdfs.map((bytes, i) => ({
          filename: tokensList.length > 1 ? `entrada-${i + 1}-de-${tokensList.length}.pdf` : 'entrada.pdf',
          content: encodeBase64(bytes),
        }))
      } catch (pdfErr) {
        console.error('PDF ticket generation error:', pdfErr instanceof Error ? pdfErr.message : pdfErr)
      }

      const spotsLabel = spots > 1 ? ` (${spots} entradas)` : ''
      const html = emailBase(
        'Reserva confirmada',
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${greetingName}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu reserva para <strong>${eventTitle}</strong>${spotsLabel}${meta?.price ? ` por <strong>${meta.price}</strong>` : ''} fue confirmada. Te esperamos.</p>
         ${detailsCard([
           ['Cuándo', dateTimeLabel],
           ['Dónde', eventRow?.location ?? ''],
         ])}
         ${qrSection(tokensList)}`,
        branchUrl(siteUrl, branchSlug, 'catas'),
        'Ver catas',
      )
      await sendEmail(payerEmail ?? to, 'Tu reserva está confirmada — Lo de Granados', html, attachments)
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
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${greetingName}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu inscripción al curso <strong>${meta?.title ?? ''}</strong>${meta?.price ? ` por <strong>${meta.price}</strong>` : ''} fue confirmada. Te contactaremos con más detalles.</p>`,
        branchUrl(siteUrl, branchSlug, 'cursos'),
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
        `<p style="color:#3d2b1f;line-height:1.7">Hola <strong>${greetingName}</strong>,</p>
         <p style="color:#3d2b1f;line-height:1.7">Tu suscripción al <strong>${meta?.title ?? 'Club DeVinos'}</strong>${meta?.price ? ` (${meta.price}/mes)` : ''} fue activada. Cada mes recibirás vinos seleccionados por nuestro sommelier.</p>`,
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
