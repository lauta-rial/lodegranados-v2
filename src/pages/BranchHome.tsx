import { Link } from 'react-router-dom'
import { Wine, BookOpen, Users, MapPin, Phone, Instagram, ArrowRight } from 'lucide-react'
import { useBranch } from '@/context/BranchContext'
import { useEvents } from '@/hooks/useEvents'
import { formatDate, formatPrice } from '@/lib/utils'

export function BranchHome() {
  const branch = useBranch()!
  const { data: events } = useEvents(branch.id)
  const nextEvent = events?.[0]
  const prefix = `/${branch.slug}`

  return (
    <div>
      {/* Branch hero */}
      <section className="relative flex min-h-[55vh] items-end overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #2c1810 0%, #7b1c35 50%, #c4956a 100%)' }}
        />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4956a]">
            Lo de Granados
          </p>
          <h1 className="mt-3 font-display text-5xl font-light leading-none text-white sm:text-6xl lg:text-7xl">
            {branch.name}
          </h1>
          {branch.address && (
            <div className="mt-4 flex items-center gap-2 text-white/60">
              <MapPin size={14} />
              <span className="text-sm">{branch.address}{branch.city && branch.city !== 'Rosario' ? `, ${branch.city}` : ''}</span>
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={`${prefix}/catas`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-[var(--color-wine)] transition-colors hover:bg-white/90"
            >
              Ver catas
            </Link>
            <Link
              to={`${prefix}/club`}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
            >
              Club DeVinos <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Contact strip */}
      {(branch.phone || branch.instagram) && (
        <div className="border-b border-[var(--color-parchment)] bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-4 sm:px-6 lg:px-8">
            {branch.phone && (
              <a
                href={`https://wa.me/${branch.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)] hover:text-[var(--color-wine)] transition-colors"
              >
                <Phone size={14} />
                {branch.phone}
              </a>
            )}
            {branch.instagram && (
              <a
                href={`https://instagram.com/${branch.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)] hover:text-[var(--color-wine)] transition-colors"
              >
                <Instagram size={14} />
                {branch.instagram}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Experience cards */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl font-light text-[var(--color-dark)]">
            Experiencias
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            to={`${prefix}/catas`}
            className="group relative overflow-hidden rounded-2xl"
            style={{ minHeight: '260px' }}
          >
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{ background: 'linear-gradient(160deg, #7b1c35 0%, #2c1810 100%)' }} />
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Wine className="text-white" size={18} />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-white">Catas de Vino</h3>
                <p className="mt-2 text-sm text-white/70">Noches íntimas guiadas por sommelier.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-white/60 group-hover:text-white/90 transition-colors">
                  Ver catas <ArrowRight size={12} />
                </div>
              </div>
            </div>
          </Link>

          <Link
            to={`${prefix}/cursos`}
            className="group relative overflow-hidden rounded-2xl"
            style={{ minHeight: '260px' }}
          >
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{ background: 'linear-gradient(160deg, #c4956a 0%, #8b5e3c 100%)' }} />
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <BookOpen className="text-white" size={18} />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-white">Cursos</h3>
                <p className="mt-2 text-sm text-white/80">Formación en análisis sensorial y sommelier.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-white/70 group-hover:text-white transition-colors">
                  Ver cursos <ArrowRight size={12} />
                </div>
              </div>
            </div>
          </Link>

          <Link
            to={`${prefix}/club`}
            className="group relative overflow-hidden rounded-2xl"
            style={{ minHeight: '260px' }}
          >
            <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{ background: 'linear-gradient(160deg, #2c1810 0%, #5c4033 100%)' }} />
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Users className="text-white" size={18} />
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-white">Club DeVinos</h3>
                <p className="mt-2 text-sm text-white/80">Vinos seleccionados cada mes en tu puerta.</p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-white/70 group-hover:text-white transition-colors">
                  Ver planes <ArrowRight size={12} />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Next event highlight */}
      {nextEvent && (
        <section className="bg-[var(--color-cream-dark)]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Próximamente
            </p>
            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-3xl font-light text-[var(--color-dark)]">
                  {nextEvent.title}
                </h2>
                <p className="mt-3 text-[var(--color-dark-muted)] capitalize">
                  {formatDate(nextEvent.date)} · {nextEvent.time.slice(0, 5)} hs
                </p>
                <p className="text-[var(--color-dark-muted)]">{nextEvent.location}</p>
                {nextEvent.price && (
                  <p className="mt-2 font-display text-2xl font-semibold text-[var(--color-wine)]">
                    {formatPrice(nextEvent.price)}
                  </p>
                )}
              </div>
              <Link
                to={`${prefix}/catas/${nextEvent.id}`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
              >
                Reservar lugar
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
