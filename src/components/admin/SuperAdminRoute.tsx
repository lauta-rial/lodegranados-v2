import { Navigate } from 'react-router-dom'
import { useAdmin } from '@/context/AdminContext'

// Sidebar already hides these links for branch admins, but that's UI-only —
// this guards the route itself so a direct URL visit doesn't reach a page
// backed by superadmin-only data (branches, newsletter).
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAdmin()

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}
