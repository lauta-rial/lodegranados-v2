import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'

type StaffRow = { id: string; email: string; role: 'admin' | 'host'; branch_id: string | null; created_at: string }
type BranchOption = { id: string; name: string }

// Every admin/host account gets created here, only here — the event editor's
// host picker (EventHostsManager.tsx) only ever lists accounts already
// created in this CRUD, it never invites inline. get_staff()/manage-staff
// are the only way to read/write these accounts since auth.users isn't
// visible to the client directly.
export function AdminStaff() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)

  const { data: staff, isLoading } = useQuery<StaffRow[]>({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_staff')
      if (error) throw error
      return data as StaffRow[]
    },
  })

  const { data: branches } = useQuery<BranchOption[]>({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name')
      return data ?? []
    },
    staleTime: Infinity,
  })

  function branchName(id: string | null) {
    return branches?.find((b) => b.id === id)?.name ?? '—'
  }

  async function handleRevoke(row: StaffRow) {
    if (!confirm(`¿Quitar el acceso de ${row.email}? Pierde su rol de ${row.role === 'admin' ? 'administrador' : 'host'}.`)) return
    const { data, error } = await supabase.functions.invoke('manage-staff', {
      body: { action: 'revoke', userId: row.id },
    })
    if (error || data?.error) {
      alert(data?.error ?? 'No pudimos quitar el acceso.')
      return
    }
    qc.invalidateQueries({ queryKey: ['admin-staff'] })
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-dark)]">Staff</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Cuentas de administradores y hosts</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
        >
          <Plus size={15} /> Nueva cuenta
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !staff?.length ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay cuentas de staff todavía</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Email</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Sucursal</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Alta</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.role === 'admin' ? 'bg-[var(--color-wine)]/10 text-[var(--color-wine)]' : 'bg-emerald-50 text-emerald-700'}`}>
                      {s.role === 'admin' ? 'Administrador' : 'Host'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{branchName(s.branch_id)}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{formatDateTime(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleRevoke(s)} className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors" title="Quitar acceso">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StaffModal
        open={modal}
        branches={branches ?? []}
        onClose={() => setModal(false)}
        onSaved={() => {
          setModal(false)
          qc.invalidateQueries({ queryKey: ['admin-staff'] })
        }}
      />
    </div>
  )
}

function StaffModal({ open, branches, onClose, onSaved }: {
  open: boolean
  branches: BranchOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', role: 'host' as 'admin' | 'host', branchId: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: fnError } = await supabase.functions.invoke('manage-staff', {
      body: { action: 'invite', email: form.email.trim(), role: form.role, branchId: form.branchId },
    })
    setLoading(false)
    if (fnError || data?.error) {
      setError(data?.error ?? 'No pudimos crear la cuenta.')
      return
    }
    onSaved()
  }

  return (
    <Modal key={open ? 'open' : 'closed'} open={open} onClose={onClose} title="Nueva cuenta de staff">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email">
          <input required type="email" className={fieldClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="nombre@ejemplo.com" />
        </FormField>
        <FormField label="Rol">
          <select className={fieldClass} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'host' }))}>
            <option value="host">Host — escanea entradas de sus eventos asignados</option>
            <option value="admin">Administrador — gestiona su sucursal completa</option>
          </select>
        </FormField>
        <FormField label="Sucursal">
          <select required className={fieldClass} value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
            <option value="">— Elegir sucursal —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </FormField>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-xs text-[var(--color-muted)]">
          Le llegan dos mails: uno para confirmar la cuenta y elegir contraseña, y otro de bienvenida.
        </p>
        <FormActions onCancel={onClose} loading={loading} label="Crear cuenta" />
      </form>
    </Modal>
  )
}
