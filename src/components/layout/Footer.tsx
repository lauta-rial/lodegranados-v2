import { Link } from 'react-router-dom'
import { MapPin, Phone, Instagram } from 'lucide-react'
import { useBranch } from '@/context/BranchContext'

export function Footer() {
  const branch = useBranch()
  const prefix = branch ? `/${branch.slug}` : ''

  const experienceLinks = [
    { to: `${prefix}/catas`, label: 'Catas de Vino' },
    { to: `${prefix}/cursos`, label: 'Cursos' },
    { to: `${prefix}/club`, label: 'Club DeVinos' },
    { to: `${prefix}/empresas`, label: 'Eventos Corporativos' },
    { to: `${prefix}/faq`, label: 'Preguntas Frecuentes' },
  ]

  const waUrl = branch?.phone
    ? `https://wa.me/${branch.phone.replace(/\D/g, '')}`
    : null

  return (
    <footer className="border-t border-[var(--color-parchment)] bg-[var(--color-cream-dark)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-dark)]">Lo de Granados</p>
            {branch ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-wine)]">
                {branch.name}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Experiencias únicas alrededor del vino.
            </p>
            <Link
              to="/"
              className="mt-3 inline-block text-xs text-[var(--color-muted)] hover:text-[var(--color-wine)] transition-colors"
            >
              Ver todas las sucursales →
            </Link>
          </div>

          {/* Experiencias — solo cuando hay branch activa */}
          {branch ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Experiencias</p>
              <ul className="mt-3 space-y-2">
                {experienceLinks.map(({ to, label }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm text-[var(--color-dark-muted)] hover:text-[var(--color-wine)] transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div />
          )}

          {/* Contacto */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Contacto</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-dark-muted)]">
              {branch ? (
                <>
                  {branch.address && (
                    <li className="flex items-start gap-1.5">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                      {branch.address}{branch.city && branch.city !== 'Rosario' ? `, ${branch.city}` : ''}
                    </li>
                  )}
                  {waUrl && (
                    <li>
                      <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[var(--color-wine)] transition-colors">
                        <Phone size={13} className="text-[var(--color-muted)]" />
                        {branch.phone}
                      </a>
                    </li>
                  )}
                  {branch.instagram && (
                    <li>
                      <a
                        href={`https://instagram.com/${branch.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 hover:text-[var(--color-wine)] transition-colors"
                      >
                        <Instagram size={13} className="text-[var(--color-muted)]" />
                        {branch.instagram}
                      </a>
                    </li>
                  )}
                  <li>
                    <a href="mailto:info@lodegranados.com" className="hover:text-[var(--color-wine)] transition-colors">
                      info@lodegranados.com
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>Rosario, Santa Fe, Argentina</li>
                  <li>
                    <a href="mailto:info@lodegranados.com" className="hover:text-[var(--color-wine)] transition-colors">
                      info@lodegranados.com
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-parchment)] pt-6 text-center text-xs text-[var(--color-muted)]">
          © {new Date().getFullYear()} Lo de Granados. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
