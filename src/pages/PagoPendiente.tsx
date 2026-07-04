import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useBranches } from '@/hooks/useBranches'
import { getWhatsAppUrl, getMpCheckout } from '@/lib/utils'

export function PagoPendiente() {
  const { data: branches } = useBranches()
  const mpCheckout = getMpCheckout()
  const branchSlug = mpCheckout?.branchSlug
  const branch = branches?.find((b) => b.slug === branchSlug)
  const waUrl = getWhatsAppUrl(branch?.phone)

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
        <Clock size={40} className="text-amber-500" />
      </div>

      <h1 className="mt-8 font-display text-4xl font-light text-[var(--color-dark)]">
        Pago en proceso
      </h1>
      <p className="mt-4 text-[var(--color-dark-muted)]">
        Tu pago está siendo procesado. Vas a recibir un email cuando se confirme la operación.
        Esto puede demorar hasta 24 horas.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/mi-cuenta"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
        >
          Ver mis reservas
        </Link>
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-parchment)] px-6 text-sm font-medium text-[var(--color-dark-muted)] transition-colors hover:bg-[var(--color-cream-dark)]"
        >
          Consultar por WhatsApp
        </a>
      </div>
    </div>
  )
}
