import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fieldClass } from '@/components/admin/AdminFormField'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Event } from '@/types/database'

type AssignedHost = { id: string; user_id: string; email: string }
type HostOption = { id: string; email: string }

// Inline section (lives inside the event edit modal now, not its own modal).
// Assigning a host never invites anyone inline — every host account has to
// already exist (created in the Staff CRUD, AdminStaff.tsx) before it shows up
// here. The dropdown is branch-scoped (get_branch_hosts) because an event
// belongs to a branch — a host from another branch never appears as an option.
export function EventHostsSection({ event }: { event: Event }) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')

  const { data: assigned, isLoading } = useQuery<AssignedHost[]>({
    queryKey: ['event-hosts', event.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_hosts', { p_event_id: event.id })
      if (error) throw error
      return data
    },
  })

  const { data: branchHosts } = useQuery<HostOption[]>({
    queryKey: ['branch-hosts', event.branch_id],
    queryFn: async () => {
      if (!event.branch_id) return []
      const { data, error } = await supabase.rpc('get_branch_hosts', { p_branch_id: event.branch_id })
      if (error) throw error
      return data
    },
    enabled: !!event.branch_id,
  })

  const availableOptions = (branchHosts ?? []).filter((h) => !assigned?.some((a) => a.user_id === h.id))

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError('')
    setAssigning(true)
    const { data, error } = await supabase.functions.invoke('assign-host', {
      body: { eventId: event.id, userId: selected },
    })
    setAssigning(false)
    if (error || data?.error) {
      setError(data?.error ?? 'No pudimos asignar el host.')
      return
    }
    setSelected('')
    qc.invalidateQueries({ queryKey: ['event-hosts', event.id] })
  }

  async function handleRemove(id: string) {
    if (!confirm('¿Quitar a este host del evento?')) return
    const { error } = await supabase.from('event_hosts').delete().eq('id', id)
    if (error) {
      alert('No se pudo quitar al host.')
      return
    }
    qc.invalidateQueries({ queryKey: ['event-hosts', event.id] })
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-dark)]">Hosts</h3>

      <form onSubmit={handleAssign} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-[var(--color-dark-muted)]">Asignar host</label>
          <select className={fieldClass} value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Elegir —</option>
            {availableOptions.map(h => <option key={h.id} value={h.id}>{h.email}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={assigning || !selected}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors disabled:opacity-60"
        >
          <Plus size={15} /> {assigning ? 'Asignando…' : 'Asignar'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {branchHosts?.length === 0 && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Esta sucursal no tiene hosts todavía — dalos de alta primero en la sección Staff.
        </p>
      )}
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Le llega un mail avisándole que fue asignado a este evento.
      </p>

      <div className="mt-4 rounded-xl border border-[var(--color-parchment)] overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !assigned?.length ? (
          <p className="p-6 text-center text-sm text-[var(--color-muted)]">No hay hosts asignados todavía.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-parchment)]">
            {assigned.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm text-[var(--color-dark)]">
                {a.email}
                <button type="button" onClick={() => handleRemove(a.id)} className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
