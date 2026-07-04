import { Link, useSearchParams } from 'react-router-dom'
import { XCircle } from 'lucide-react'
import { useBranches } from '@/hooks/useBranches'
import { getWhatsAppUrl, getMpCheckout } from '@/lib/utils'

export function PagoFallido() {
  const [searchParams] = useSearchParams()
  const { data: branches } = useBranches()

  const mpCheckout = getMpCheckout()
  const branchSlug = mpCheckout?.branchSlug
  const branch = branches?.find((b) => b.slug === branchSlug)
  const waUrl = getWhatsAppUrl(branch?.phone)

  const type = searchParams.get('type')
  const ref = searchParams.get('ref')
  const retryUrl = branchSlug && type && ref
    ? `/${branchSlug}/${type === 'event' ? 'catas' : type === 'course' ? 'cursos' : 'club'}/${ref}`
    : null

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <XCircle size={40} className="text-red-500" />
      </div>

      <h1 className="mt-8 font-display text-4xl font-light text-[var(--color-dark)]">
        El pago no se completó
      </h1>
      <p className="mt-4 text-[var(--color-dark-muted)]">
        Hubo un problema al procesar tu pago. Podés intentarlo de nuevo o contactarnos.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {retryUrl ? (
          <Link
            to={retryUrl}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
          >
            Intentar de nuevo
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
          >
            Volver al inicio
          </Link>
        )}
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-parchment)] px-6 text-sm font-medium text-[var(--color-dark-muted)] transition-colors hover:bg-[var(--color-cream-dark)]"
        >
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  )
}
