import { createContext, useContext } from 'react'
import { useAuth } from './AuthContext'

interface AdminContextType {
  isSuperAdmin: boolean
  branchId: string | null
}

const AdminContext = createContext<AdminContextType | null>(null)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role ?? null
  const isSuperAdmin = role === 'superadmin'
  const branchId: string | null = isSuperAdmin
    ? null
    : (user?.app_metadata?.branch_id ?? user?.user_metadata?.branch_id ?? null)

  return (
    <AdminContext.Provider value={{ isSuperAdmin, branchId }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}
