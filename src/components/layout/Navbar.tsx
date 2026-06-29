import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, LayoutDashboard, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const branch = useBranch()
  const navigate = useNavigate()

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'superadmin'
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Mi cuenta'
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  const prefix = branch ? `/${branch.slug}` : ''
  const links = branch
    ? [
        { to: `${prefix}/catas`, label: 'Catas' },
        { to: `${prefix}/cursos`, label: 'Cursos' },
        { to: `${prefix}/club`, label: 'Club DeVinos' },
        { to: `${prefix}/empresas`, label: 'Empresas' },
      ]
    : []

  async function handleSignOut() {
    await signOut()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-parchment)] bg-[var(--color-cream)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-display text-xl font-semibold tracking-wide text-[var(--color-dark)]">
            Lo de Granados
          </span>
          {branch && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-wine)] mt-0.5">
              {branch.name}
            </span>
          )}
        </Link>

        {links.length > 0 && (
          <nav className="hidden items-center gap-8 md:flex">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium transition-colors',
                    isActive
                      ? 'text-[var(--color-wine)]'
                      : 'text-[var(--color-dark-muted)] hover:text-[var(--color-dark)]',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-[var(--color-parchment)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-[var(--color-cream-dark)]"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <User size={15} className="text-[var(--color-muted)]" />
                )}
                <span className="max-w-[120px] truncate">{displayName}</span>
                <ChevronDown size={13} className={cn('text-[var(--color-muted)] transition-transform', userMenuOpen && 'rotate-180')} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-[var(--color-parchment)] bg-white py-1 shadow-lg">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-dark)] hover:bg-[var(--color-cream)]"
                      >
                        <LayoutDashboard size={14} className="text-[var(--color-wine)]" />
                        Panel admin
                      </Link>
                    )}
                    <Link
                      to="/mi-cuenta"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-dark)] hover:bg-[var(--color-cream)]"
                    >
                      <User size={14} className="text-[var(--color-muted)]" />
                      Mi cuenta
                    </Link>
                    <hr className="my-1 border-[var(--color-parchment)]" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[var(--color-dark-muted)] hover:text-[var(--color-dark)] transition-colors"
              >
                Ingresar
              </Link>
              {branch && (
                <Link
                  to={`${prefix}/club`}
                  className="rounded-full bg-[var(--color-wine)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
                >
                  Unirme al Club
                </Link>
              )}
            </>
          )}
        </div>

        <button
          className="md:hidden text-[var(--color-dark)]"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--color-parchment)] bg-[var(--color-cream)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'text-base font-medium',
                    isActive ? 'text-[var(--color-wine)]' : 'text-[var(--color-dark-muted)]',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            {links.length > 0 && <hr className="border-[var(--color-parchment)]" />}
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="text-sm font-medium text-[var(--color-wine)]">
                    Panel admin
                  </Link>
                )}
                <Link to="/mi-cuenta" onClick={() => setOpen(false)} className="text-sm font-medium text-[var(--color-dark-muted)]">
                  Mi cuenta
                </Link>
                <button
                  onClick={() => { setOpen(false); handleSignOut() }}
                  className="text-left text-sm font-medium text-red-600"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="text-base font-medium text-[var(--color-dark-muted)]"
                >
                  Ingresar
                </Link>
                {branch && (
                  <Link
                    to={`${prefix}/club`}
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-[var(--color-wine)] px-4 py-2 text-center text-sm font-medium text-white"
                  >
                    Unirme al Club
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
