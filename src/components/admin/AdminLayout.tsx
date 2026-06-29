import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AdminProvider } from '@/context/AdminContext'
import { Sidebar } from './Sidebar'
import { supabase } from '@/lib/supabase'

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

  if (loading) return null

  if (!user) return <AdminLoginForm />

  const role = user.user_metadata?.role
  const isAllowed = role === 'admin' || role === 'superadmin'
  if (!isAllowed) return <Navigate to="/" replace />

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
