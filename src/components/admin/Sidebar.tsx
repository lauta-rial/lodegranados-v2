import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, BookOpen, Users, MessageSquare, MapPin, Store, Mail, UserCog, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useAdmin } from '@/context/AdminContext'
import { useBranches } from '@/hooks/useBranches'

const allLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, superAdminOnly: false, branchAdminOnly: false },
  { to: '/admin/catas', icon: CalendarDays, label: 'Catas', end: false, superAdminOnly: false, branchAdminOnly: false },
  { to: '/admin/cursos', icon: BookOpen, label: 'Cursos', end: false, superAdminOnly: false, branchAdminOnly: false },
  { to: '/admin/club', icon: Users, label: 'Club', end: false, superAdminOnly: false, branchAdminOnly: false },
  { to: '/admin/consultas', icon: MessageSquare, label: 'Consultas', end: false, superAdminOnly: false, branchAdminOnly: false },
  // Branch admins edit their own branch here; superadmins use "Sucursales" (all branches).
  { to: '/admin/mi-sucursal', icon: Store, label: 'Mi Sucursal', end: false, superAdminOnly: false, branchAdminOnly: true },
  { to: '/admin/sucursales', icon: MapPin, label: 'Sucursales', end: false, superAdminOnly: true, branchAdminOnly: false },
  { to: '/admin/newsletter', icon: Mail, label: 'Newsletter', end: false, superAdminOnly: true, branchAdminOnly: false },
  { to: '/admin/staff', icon: UserCog, label: 'Staff', end: false, superAdminOnly: true, branchAdminOnly: false },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut, user } = useAuth()
  const { isSuperAdmin, branchId } = useAdmin()
  const { data: branches, isLoading: branchesLoading } = useBranches()
  const navigate = useNavigate()
  const email = user?.email ?? ''
  const branchName = branches?.find(b => b.id === branchId)?.name ?? null

  const links = allLinks.filter(l => {
    if (l.superAdminOnly && !isSuperAdmin) return false
    if (l.branchAdminOnly && (isSuperAdmin || !branchId)) return false
    return true
  })

  async function handleLogout() {
    await signOut()
    navigate('/admin')
  }

  return (
    <aside
      className={cn(
        // Static column on desktop; slide-in drawer on mobile.
        'fixed inset-y-0 left-0 z-40 flex h-full w-56 flex-col border-r border-[var(--color-parchment)] bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
        open ? 'translate-x-0 shadow-xl' : '-translate-x-full',
      )}
    >
      <div className="border-b border-[var(--color-parchment)] px-5 py-5">
        <p className="font-display text-lg font-semibold text-[var(--color-dark)]">Lo de Granados</p>
        {/* Branch admins get their sucursal name here; while the (cached) branch
            list resolves, show a skeleton instead of nothing so it doesn't pop in. */}
        {branchId && (
          branchName ? (
            <p className="text-sm font-medium text-[var(--color-wine)]">{branchName}</p>
          ) : branchesLoading ? (
            <div className="mt-1 h-4 w-24 animate-pulse rounded bg-[var(--color-parchment)]" />
          ) : null
        )}
        <p className="text-xs text-[var(--color-muted)]">
          {isSuperAdmin ? 'Super Admin' : 'Admin'}
        </p>
        {email && (
          <p title={email} className="mt-0.5 max-w-full truncate text-xs text-[var(--color-muted)] cursor-default">
            {email}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
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
