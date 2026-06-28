import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from './Sidebar'

export function AdminLayout() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />

  const isAdmin = user.user_metadata?.role === 'admin'
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-cream)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
