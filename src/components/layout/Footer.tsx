import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-parchment)] bg-[var(--color-cream-dark)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-dark)]">Lo de Granados</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Bodega boutique en Mendoza. Experiencias únicas alrededor del vino.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Experiencias</p>
            <ul className="mt-3 space-y-2">
              {[
                { to: '/catas', label: 'Catas de Vino' },
                { to: '/cursos', label: 'Cursos' },
                { to: '/club', label: 'Club DeVinos' },
                { to: '/empresas', label: 'Eventos Corporativos' },
                { to: '/faq', label: 'Preguntas Frecuentes' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-[var(--color-dark-muted)] hover:text-[var(--color-wine)] transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Contacto</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-dark-muted)]">
              <li>Mendoza, Argentina</li>
              <li>
                <a href="https://wa.me/5492612345678" className="hover:text-[var(--color-wine)] transition-colors">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:info@lodegranados.com" className="hover:text-[var(--color-wine)] transition-colors">
                  info@lodegranados.com
                </a>
              </li>
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
