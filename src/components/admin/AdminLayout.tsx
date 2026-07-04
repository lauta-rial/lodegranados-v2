import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AdminProvider } from '@/context/AdminContext'
import { Sidebar } from './Sidebar'
import { HostHome } from './HostHome'
import { supabase } from '@/lib/supabase'
import { getUserRole, getUserBranchId } from '@/lib/adminRole'

function AdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl text-[var(--color-dark)]">Lo de Granados</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Panel de administración</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--color-parchment)] bg-white p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-dark-muted)]">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-parchment)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-wine)] transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-dark-muted)]">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-parchment)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-dark)] outline-none focus:border-[var(--color-wine)] transition-colors"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[var(--color-wine)] text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!user) return <AdminLoginForm />

  const role = getUserRole(user)
  if (!role) return <Navigate to="/" replace />

  // A host has a branch_id (used only to decide which events they can be
  // assigned to — see get_branch_hosts), but is never scoped like a branch
  // admin: they don't get the full admin shell for their branch, only the
  // specific events assigned to them via event_hosts. Must be checked
  // before the branchId guard below so they don't fall into the branch-admin
  // path. They can only ever reach their assigned event's live page —
  // anything else (including /admin itself) shows their own event list
  // instead of the full admin shell (Sidebar/AdminProvider assume
  // branch-scoping, which doesn't apply here).
  if (role === 'host') {
    const onOwnLivePage = /^\/admin\/catas\/[^/]+\/live$/.test(location.pathname)
    return onOwnLivePage ? <Outlet /> : <HostHome />
  }

  const branchId = getUserBranchId(user)
  if (role === 'admin' && !branchId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] p-4">
        <div className="max-w-sm text-center">
          <p className="font-display text-2xl text-[var(--color-dark)]">Cuenta sin sucursal</p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Tu cuenta no tiene una sucursal asignada. Contactá al superadmin para configurarla.
          </p>
        </div>
      </div>
    )
  }

  return (
    <AdminProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-cream)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </AdminProvider>
  )
}
