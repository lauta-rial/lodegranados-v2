import { useState } from 'react'
import { X, ShieldCheck } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const field =
  'w-full rounded-lg border border-[var(--color-parchment)] bg-white px-3 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-muted)] focus:border-[var(--color-wine)] focus:outline-none focus:ring-1 focus:ring-[var(--color-wine)] transition-colors'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (name: string, email: string) => void
  title: string
  price: number | null
  spots?: number
  loading: boolean
  error: string | null
}

export function CheckoutModal({ open, onClose, onConfirm, title, price, spots = 1, loading, error }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onConfirm(name, email)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-dark)] transition-colors"
        >
          <X size={17} />
        </button>

        <h2 className="font-display text-2xl text-[var(--color-dark)]">Completá tus datos</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {title}
          {price != null && (
            <> · <span className="font-semibold text-[var(--color-wine)]">{formatPrice(price * spots)}</span></>
          )}
          {spots > 1 && <span className="ml-1 text-[var(--color-muted)]">({spots} entradas)</span>}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-dark)]">
              Nombre completo
            </label>
            <input
              required
              autoFocus
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan García"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-dark)]">
              Email
            </label>
            <input
              required
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@email.com"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-full bg-[var(--color-wine)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Redirigiendo…' : 'Continuar al pago'}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
            <ShieldCheck size={13} />
            Pago seguro vía MercadoPago
          </div>
        </form>
      </div>
    </div>
  )
}
