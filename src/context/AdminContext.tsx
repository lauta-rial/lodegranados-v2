import { createContext, useContext } from 'react'
import { useAuth } from './AuthContext'
import { getUserRole, getUserBranchId } from '@/lib/adminRole'

interface AdminContextType {
  isSuperAdmin: boolean
  branchId: string | null
}

const AdminContext = createContext<AdminContextType | null>(null)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isSuperAdmin = getUserRole(user) === 'superadmin'
  const branchId: string | null = isSuperAdmin ? null : getUserBranchId(user)

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
