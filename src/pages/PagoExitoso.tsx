import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatPrice } from '@/lib/utils'

const emailType: Record<string, string> = {
  event: 'reservation',
  course: 'reservation',
}

export function PagoExitoso() {
  const [params] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const type = params.get('type') ?? ''
  const ref = params.get('ref') ?? ''
  const paymentId = params.get('payment_id') ?? ''
  const status = params.get('status') ?? ''
  // Club DeVinos plans are real MercadoPago PreApproval subscriptions —
  // the redirect back from MP's subscription checkout carries this instead
  // of status/payment_id (that pair only exists on checkout/preferences
  // returns). Different flow, handled separately below.
  const preapprovalId = params.get('preapproval_id') ?? ''
  const processed = useRef(false)

  const [branchSlug] = useState<string>(() => {
    try {
      const raw = sessionStorage.getItem('mp_checkout')
      return raw ? (JSON.parse(raw).branchSlug ?? '') : ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    if (processed.current || authLoading) return

    // Club DeVinos plans are real recurring MercadoPago PreApproval
    // subscriptions now (create-mp-preference rejects type:'plan' outright)
    // — this redirect comes from MP's subscription checkout, whose back_url
    // is fixed per-plan in MP's own config and carries preapproval_id, not
    // status/payment_id (send-email verifies this server-side against MP
    // before activating anything, same as the payment flow below).
    if (type === 'plan' && preapprovalId) {
      processed.current = true
      const raw = sessionStorage.getItem('mp_checkout')
      sessionStorage.removeItem('mp_checkout')
      let cached: { payerName?: string; payerEmail?: string; branchSlug?: string; branchId?: string } = {}
      try { cached = raw ? JSON.parse(raw) : {} } catch { /* best-effort */ }

      supabase.functions.invoke('send-email', {
        body: {
          type: 'subscription',
          preapprovalId,
          userId: user?.id ?? null,
          payerName: cached.payerName,
          payerEmail: cached.payerEmail,
          to: cached.payerEmail,
          name: cached.payerName || cached.payerEmail?.split('@')[0],
          data: { branchId: cached.branchId, branchSlug: cached.branchSlug, siteUrl: window.location.origin },
        },
      })
      return
    }

    if (!ref || status !== 'approved') return

    const raw = sessionStorage.getItem('mp_checkout')
    if (!raw) return
    sessionStorage.removeItem('mp_checkout')
    processed.current = true

    try {
      const { payerEmail, payerName, title, price, spots = 1 } = JSON.parse(raw) as {
        type: string
        title: string
        price: number
        spots?: number
        payerName: string
        payerEmail: string
        branchSlug?: string
      }

      // DB insert + email handled server-side by the edge function (service role bypasses RLS)
      supabase.functions.invoke('send-email', {
        body: {
          type: emailType[type] ?? 'reservation',
          ref,
          paymentId,
          userId: user?.id ?? null,
          payerName,
          payerEmail,
          to: payerEmail,
          name: payerName || payerEmail.split('@')[0],
          data: {
            title,
            price: price ? formatPrice(price * spots) : undefined,
            priceAmount: price ?? null,
            spots,
            branchSlug,
            siteUrl: window.location.origin,
          },
        },
      })
    } catch {
      // silent — both DB write and email are best-effort
    }
  }, [type, ref, paymentId, preapprovalId, status, user, authLoading])

  const prefix = branchSlug ? `/${branchSlug}` : ''
  const backLink =
    type === 'event'  ? `${prefix}/catas`  :
    type === 'course' ? `${prefix}/cursos` :
    type === 'plan'   ? `${prefix}/club`   : '/'
  const backLabel =
    type === 'event'
      ? 'Ver todas las catas'
      : type === 'course'
        ? 'Ver todos los cursos'
        : type === 'plan'
          ? 'Volver al Club'
          : 'Ir al inicio'

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle size={40} className="text-emerald-600" />
      </div>

      <h1 className="mt-8 font-display text-4xl font-light text-[var(--color-dark)]">
        ¡Pago aprobado!
      </h1>
      <p className="mt-4 text-[var(--color-dark-muted)]">
        {type === 'course'
          ? 'Tu inscripción fue confirmada. Vas a recibir un email con todos los detalles.'
          : type === 'plan'
            ? 'Tu suscripción al Club fue activada. Vas a recibir un email de bienvenida.'
            : 'Tu reserva fue confirmada. Vas a recibir un email con todos los detalles.'}
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to={backLink}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
        >
          {backLabel}
        </Link>
        <Link
          to="/"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-parchment)] px-6 text-sm font-medium text-[var(--color-dark-muted)] transition-colors hover:bg-[var(--color-cream-dark)]"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
