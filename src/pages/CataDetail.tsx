import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CalendarDays, MapPin, Users, ArrowLeft } from 'lucide-react'
import { useEvent } from '@/hooks/useEvents'
import { useBranch } from '@/context/BranchContext'
import { useAuth } from '@/context/AuthContext'
import { useCheckout } from '@/hooks/useCheckout'
import { CheckoutModal } from '@/components/CheckoutModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice } from '@/lib/utils'

export function CataDetail() {
  const { id } = useParams<{ id: string }>()
  const branch = useBranch()
  const { data: event, isLoading, error } = useEvent(id ?? '')
  const { user } = useAuth()
  const { checkout, loading: checkoutLoading, error: checkoutError } = useCheckout()
  const [modalOpen, setModalOpen] = useState(false)
  const [spots, setSpots] = useState(1)

  if (isLoading) return <CataDetailLoading />
  if (error || !event) return <CataDetailError />

  const soldOut = event.available_spots === 0
  const maxSpots = Math.min(event.available_spots ?? 1, 10)

  function handleReservar() {
    if (!event) return
    if (user) {
      checkout({ type: 'event', id: event.id, title: event.title, price: event.price ?? 0, spots })
    } else {
      setModalOpen(true)
    }
  }

  function handleModalConfirm(name: string, email: string) {
    if (!event) return
    checkout({ type: 'event', id: event.id, title: event.title, price: event.price ?? 0, spots, payerName: name, payerEmail: email })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        to={`/${branch?.slug ?? ''}/catas`}
        className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors"
      >
        <ArrowLeft size={14} /> Volver a catas
      </Link>

      {/* Hero image */}
      <div
        className="h-72 w-full rounded-3xl overflow-hidden sm:h-96"
        style={{ background: 'linear-gradient(135deg, #7b1c35 0%, #2c1810 100%)' }}
      >
        {event.image_url && (
          <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h1 className="font-display text-4xl font-light text-[var(--color-dark)] sm:text-5xl">
            {event.title}
          </h1>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-[var(--color-dark-muted)]">
              <CalendarDays size={16} className="text-[var(--color-wine)]" />
              <span className="capitalize">{formatDate(event.date)} · {event.time.slice(0, 5)} hs</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--color-dark-muted)]">
              <MapPin size={16} className="text-[var(--color-wine)]" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--color-dark-muted)]">
              <Users size={16} className="text-[var(--color-wine)]" />
              <span>
                {soldOut
                  ? 'Sin lugares disponibles'
                  : `${event.available_spots} de ${event.total_spots} lugares disponibles`}
              </span>
            </div>
          </div>

          {event.description && (
            <div className="mt-8">
              <h2 className="font-display text-2xl text-[var(--color-dark)]">Sobre esta cata</h2>
              <p className="mt-3 leading-relaxed text-[var(--color-dark-muted)]">{event.description}</p>
            </div>
          )}
        </div>

        {/* CTA Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-[var(--color-parchment)] bg-white p-6 shadow-sm">
            {event.price != null && (
              <p className="font-display text-4xl font-semibold text-[var(--color-wine)]">
                {formatPrice(event.price)}
              </p>
            )}
            <p className="mt-1 text-sm text-[var(--color-muted)]">por persona</p>

            {soldOut ? (
              <div className="mt-6">
                <Badge variant="neutral" className="mb-3">Sin lugares disponibles</Badge>
                <button
                  disabled
                  className="mt-2 h-12 w-full rounded-full bg-[var(--color-parchment)] text-sm font-medium text-[var(--color-muted)] cursor-not-allowed"
                >
                  Agotado
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-[var(--color-dark-muted)]">Entradas</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSpots(s => Math.max(1, s - 1))}
                      disabled={spots <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-parchment)] text-[var(--color-dark)] transition-colors hover:bg-[var(--color-cream-dark)] disabled:opacity-40"
                    >−</button>
                    <span className="w-4 text-center text-sm font-semibold text-[var(--color-dark)]">{spots}</span>
                    <button
                      onClick={() => setSpots(s => Math.min(maxSpots, s + 1))}
                      disabled={spots >= maxSpots}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-parchment)] text-[var(--color-dark)] transition-colors hover:bg-[var(--color-cream-dark)] disabled:opacity-40"
                    >+</button>
                  </div>
                </div>
                {event.price != null && spots > 1 && (
                  <p className="mt-2 text-right text-sm text-[var(--color-muted)]">
                    Total: <span className="font-semibold text-[var(--color-wine)]">{formatPrice(event.price * spots)}</span>
                  </p>
                )}
                <button
                  onClick={handleReservar}
                  disabled={checkoutLoading}
                  className="mt-4 h-12 w-full rounded-full bg-[var(--color-wine)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutLoading ? 'Redirigiendo…' : spots > 1 ? `Reservar ${spots} lugares` : 'Reservar mi lugar'}
                </button>
                {checkoutError && (
                  <p className="mt-2 text-xs text-red-600">{checkoutError}</p>
                )}
              </>
            )}

            <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
              Pago seguro vía MercadoPago
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {!soldOut && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-parchment)] bg-white/95 backdrop-blur-sm px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            {event.price != null && (
              <p className="font-display text-xl font-semibold text-[var(--color-wine)]">
                {formatPrice(event.price)}
              </p>
            )}
            <button
              onClick={handleReservar}
              disabled={checkoutLoading}
              className="h-11 rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)] disabled:opacity-60"
            >
              {checkoutLoading ? 'Redirigiendo…' : spots > 1 ? `Reservar ${spots} lugares` : 'Reservar mi lugar'}
            </button>
          </div>
        </div>
      )}

      <CheckoutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        title={event.title}
        price={event.price}
        spots={spots}
        loading={checkoutLoading}
        error={checkoutError}
      />
    </div>
  )
}

function CataDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Skeleton className="mb-8 h-5 w-32" />
      <Skeleton className="h-96 w-full rounded-3xl" />
      <div className="mt-10 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
}

function CataDetailError() {
  const branch = useBranch()
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
      <p className="font-display text-2xl text-[var(--color-dark)]">No encontramos esta cata</p>
      <Link to={`/${branch?.slug ?? ''}/catas`} className="mt-4 inline-flex items-center gap-2 text-[var(--color-wine)]">
        <ArrowLeft size={14} /> Ver todas las catas
      </Link>
    </div>
  )
}
