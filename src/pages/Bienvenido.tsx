import { Link } from 'react-router-dom'
import { Wine, MapPin, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export function Bienvenido() {
  const { user } = useAuth()
  const name = user?.email?.split('@')[0] ?? ''

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-wine)]/10">
        <Wine size={36} className="text-[var(--color-wine)]" />
      </div>

      <h1 className="mt-8 font-display text-4xl font-light text-[var(--color-dark)]">
        ¡Bienvenido/a{name ? `, ${name}` : ''}!
      </h1>
      <p className="mt-4 text-[var(--color-dark-muted)]">
        Tu cuenta fue confirmada. Ya sos parte de la comunidad Lo de Granados — elegí tu sucursal para descubrir catas, cursos y el Club DeVinos.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
        >
          <MapPin size={16} />
          Elegí tu sucursal
        </Link>
        <Link
          to="/mi-cuenta"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-parchment)] px-6 text-sm font-medium text-[var(--color-dark-muted)] transition-colors hover:bg-[var(--color-cream-dark)]"
        >
          <User size={16} />
          Mi cuenta
        </Link>
      </div>
    </div>
  )
}
