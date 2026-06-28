import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, BookOpen, Users, MessageSquare, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/catas', icon: CalendarDays, label: 'Catas' },
  { to: '/admin/cursos', icon: BookOpen, label: 'Cursos' },
  { to: '/admin/club', icon: Users, label: 'Club' },
  { to: '/admin/consultas', icon: MessageSquare, label: 'Consultas' },
]

export function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r border-[var(--color-parchment)] bg-white">
      <div className="border-b border-[var(--color-parchment)] px-5 py-5">
        <p className="font-display text-lg font-semibold text-[var(--color-dark)]">Lo de Granados</p>
        <p className="text-xs text-[var(--color-muted)]">Panel de administración</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-wine)]/10 text-[var(--color-wine)]'
                  : 'text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] hover:text-[var(--color-dark)]',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-parchment)] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-dark-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
