import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Wine, BookOpen, Users } from 'lucide-react'
import { useEvents } from '@/hooks/useEvents'
import { supabase } from '@/lib/supabase'
import { formatDate, formatPrice } from '@/lib/utils'

export function Home() {
  const { data: events } = useEvents()
  const nextEvent = events?.[0]

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-end overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #2c1810 0%, #7b1c35 40%, #c4956a 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4956a]">
            Mendoza, Argentina
          </p>
          <h1 className="mt-4 font-display text-6xl font-light leading-none text-white sm:text-7xl lg:text-8xl">
            El vino <br />
            <em className="font-semibold not-italic text-[#c4956a]">es una historia.</em>
            <br />
            Contala con nosotros.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            Catas guiadas, cursos de sommelier y un club exclusivo para los amantes del vino en Mendoza.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/catas"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-medium text-[var(--color-wine)] transition-colors hover:bg-white/90"
            >
              Ver próximas catas
            </Link>
            <Link
              to="/club"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              Conocé el Club <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Experiencias
          </p>
          <h2 className="mt-3 font-display text-4xl font-light text-[var(--color-dark)] sm:text-5xl">
            Tres formas de vivir el vino
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
          {/* Catas — tall left */}
          <Link
            to="/catas"
            className="group relative overflow-hidden rounded-2xl md:row-span-2"
            style={{ minHeight: '480px' }}
          >
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{
                background: 'linear-gradient(160deg, #7b1c35 0%, #2c1810 100%)',
              }}
            />
            <div className="absolute inset-0 flex flex-col justify-between p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Wine className="text-white" size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Experiencia
                </p>
                <h3 className="mt-2 font-display text-4xl font-semibold text-white">
                  Catas de Vino
                </h3>
                <p className="mt-3 text-white/70">
                  Noches íntimas guiadas por sommelier. Descubrí varietales, terroirs y el arte del maridaje.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors group-hover:bg-white/10">
                  Ver catas <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </Link>

          {/* Cursos — top right */}
          <Link
            to="/cursos"
            className="group relative overflow-hidden rounded-2xl md:col-span-2"
            style={{ minHeight: '220px' }}
          >
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{
                background: 'linear-gradient(120deg, #c4956a 0%, #8b5e3c 100%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-between p-8">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <BookOpen className="text-white" size={18} />
                </div>
                <h3 className="mt-4 font-display text-3xl font-semibold text-white">
                  Cursos de Sommelier
                </h3>
                <p className="mt-2 text-white/80">
                  Formación profesional en análisis sensorial y servicio del vino.
                </p>
              </div>
              <ArrowRight className="text-white/60 transition-transform group-hover:translate-x-1" size={24} />
            </div>
          </Link>

          {/* Club — bottom right */}
          <Link
            to="/club"
            className="group relative overflow-hidden rounded-2xl md:col-span-2"
            style={{ minHeight: '220px' }}
          >
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{
                background: 'linear-gradient(120deg, #2c1810 0%, #5c4033 100%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-between p-8">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Users className="text-white" size={18} />
                </div>
                <h3 className="mt-4 font-display text-3xl font-semibold text-white">
                  Club DeVinos
                </h3>
                <p className="mt-2 text-white/80">
                  Recibi vinos seleccionados cada mes. Tres planes para cada estilo de vida.
                </p>
              </div>
              <ArrowRight className="text-white/60 transition-transform group-hover:translate-x-1" size={24} />
            </div>
          </Link>
        </div>
      </section>

      {/* Próxima cata destacada */}
      {nextEvent && (
        <section className="bg-[var(--color-cream-dark)]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Próximamente
            </p>
            <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-4xl font-light text-[var(--color-dark)]">
                  {nextEvent.title}
                </h2>
                <p className="mt-3 text-[var(--color-dark-muted)] capitalize">
                  {formatDate(nextEvent.date)} · {nextEvent.time.slice(0, 5)} hs
                </p>
                <p className="mt-1 text-[var(--color-dark-muted)]">{nextEvent.location}</p>
                {nextEvent.price && (
                  <p className="mt-3 font-display text-2xl font-semibold text-[var(--color-wine)]">
                    {formatPrice(nextEvent.price)}
                  </p>
                )}
              </div>
              <Link
                to={`/catas/${nextEvent.id}`}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-wine)] px-8 text-base font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
              >
                Reservar lugar
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <NewsletterSection />
    </div>
  )
}

function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const { error } = await supabase.from('newsletter').insert({ email })
    if (!error) {
      setStatus('success')
      setEmail('')
    } else if (error.code === '23505') {
      setStatus('duplicate')
    } else {
      setStatus('error')
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-[var(--color-wine)] px-8 py-16 text-center sm:px-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
          Newsletter
        </p>
        <h2 className="mt-3 font-display text-4xl font-light text-white">
          Recibí novedades y degustaciones exclusivas
        </h2>
        <p className="mt-4 text-white/70">
          Sin spam. Solo las mejores catas, maridajes y ofertas del club.
        </p>

        {status === 'success' ? (
          <p className="mt-8 font-display text-xl text-white">
            ¡Gracias! Te vamos a mantener al tanto. 🍷
          </p>
        ) : (
          <>
            <form
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
              onSubmit={handleSubmit}
            >
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="h-12 rounded-full bg-white/10 px-5 text-white placeholder:text-white/40 border border-white/20 focus:outline-none focus:border-white/50 sm:w-72"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-[var(--color-wine)] transition-colors hover:bg-white/90 disabled:opacity-70"
              >
                {status === 'loading' ? 'Enviando…' : 'Suscribirme'}
              </button>
            </form>
            {status === 'duplicate' && (
              <p className="mt-3 text-sm text-white/70">Ya estás suscripto con ese email.</p>
            )}
            {status === 'error' && (
              <p className="mt-3 text-sm text-white/70">Hubo un error. Intentá de nuevo.</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
