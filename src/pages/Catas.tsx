import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Users, ArrowRight } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { useBranch } from '@/context/BranchContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice } from '@/lib/utils'
import { defaultImageFor } from '@/lib/defaultImages'
import type { Event } from '@/types/database'

export function Catas() {
  const branch = useBranch()
  const { data: events, isLoading, error } = useEvents(branch?.id)

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Agenda
        </p>
        <h1 className="mt-3 font-display text-5xl font-light text-[var(--color-dark)]">
          Catas de Vino
        </h1>
        <p className="mt-4 max-w-xl text-[var(--color-dark-muted)]">
          Experiencias íntimas guiadas por nuestro sommelier. Conocé los mejores vinos en un ambiente único.
        </p>
      </div>

      {isLoading && <CatasLoading />}
      {error && <CatasError />}
      {!isLoading && !error && events?.length === 0 && <CatasEmpty />}
      {!isLoading && !error && events && events.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} branchSlug={branch?.slug ?? ''} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, branchSlug }: { event: Event; branchSlug: string }) {
  const spotsLeft = event.available_spots
  const soldOut = spotsLeft === 0

  return (
    <Link
      to={`/${branchSlug}/catas/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-parchment)] bg-white transition-shadow hover:shadow-lg"
    >
      {/* Image placeholder */}
      <div
        className="relative h-48 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7b1c35 0%, #2c1810 100%)' }}
      >
        <img
          src={event.image_url || defaultImageFor('cata', event.id)}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute right-3 top-3">
          {soldOut ? (
            <Badge variant="neutral">Sin lugares</Badge>
          ) : spotsLeft <= 5 ? (
            <Badge variant="wine">Últimos {spotsLeft} lugares</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold text-[var(--color-dark)]">
          {event.title}
        </h3>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)]">
            <CalendarDays size={14} className="text-[var(--color-wine)]" />
            <span className="capitalize">{formatDate(event.date)} · {event.time?.slice(0, 5)} hs</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)]">
            <MapPin size={14} className="text-[var(--color-wine)]" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)]">
            <Users size={14} className="text-[var(--color-wine)]" />
            <span>{spotsLeft} lugares disponibles</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          {event.price ? (
            <p className="font-display text-2xl font-semibold text-[var(--color-wine)]">
              {formatPrice(event.price)}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Consultar precio</p>
          )}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-wine)] transition-transform group-hover:translate-x-0.5">
            Ver detalle <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  )
}

function CatasLoading() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-[var(--color-parchment)]">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-1/3 mt-4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CatasError() {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-12 text-center">
      <p className="font-display text-xl text-red-800">No pudimos cargar las catas</p>
      <p className="mt-2 text-sm text-red-600">
        Por favor, intentá de nuevo o contactanos por WhatsApp.
      </p>
    </div>
  )
}

function CatasEmpty() {
  return (
    <div className="rounded-2xl border border-[var(--color-parchment)] bg-[var(--color-cream-dark)] p-16 text-center">
      <p className="font-display text-2xl text-[var(--color-dark)]">
        No hay catas programadas por ahora
      </p>
      <p className="mt-3 text-[var(--color-muted)]">
        Seguinos en redes o suscribite al newsletter para enterarte de las próximas fechas.
      </p>
    </div>
  )
}
