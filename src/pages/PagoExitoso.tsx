import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'

const emailType: Record<string, string> = {
  event: 'reservation',
  course: 'enrollment',
  plan: 'subscription',
}

export function PagoExitoso() {
  const [params] = useSearchParams()
  const type = params.get('type') ?? ''
  const emailSent = useRef(false)

  useEffect(() => {
    if (emailSent.current) return
    const raw = sessionStorage.getItem('mp_checkout')
    if (!raw) return
    sessionStorage.removeItem('mp_checkout')
    emailSent.current = true

    try {
      const { payerEmail, payerName, title, price } = JSON.parse(raw) as {
        type: string
        title: string
        price: number
        payerName: string
        payerEmail: string
      }
      if (!payerEmail) return

      supabase.functions.invoke('send-email', {
        body: {
          type: emailType[type] ?? 'reservation',
          to: payerEmail,
          name: payerName || payerEmail,
          data: {
            title,
            price: price ? formatPrice(price) : undefined,
          },
        },
      })
    } catch {
      // silent — email is best-effort
    }
  }, [type])

  const backLink =
    type === 'event' ? '/catas' : type === 'course' ? '/cursos' : type === 'plan' ? '/club' : '/'
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
        Tu reserva fue confirmada. Vas a recibir un email con todos los detalles.
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
