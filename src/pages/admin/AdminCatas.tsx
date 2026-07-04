import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EventsTab } from '@/components/admin/EventsTab'
import { useAdmin } from '@/context/AdminContext'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Registration } from '@/types/database'

type Tab = 'events' | 'registrations'

export function AdminCatas() {
  const [tab, setTab] = useState<Tab>('events')

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-dark)]">Catas</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Gestión de eventos y registraciones</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-[var(--color-parchment)] bg-white p-1 w-fit">
        {(['events', 'registrations'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-[var(--color-wine)] text-white'
                : 'text-[var(--color-dark-muted)] hover:text-[var(--color-dark)]'
            }`}
          >
            {t === 'events' ? 'Eventos' : 'Inscripciones'}
          </button>
        ))}
      </div>

      {tab === 'events' ? <EventsTab kind="cata" /> : <RegistrationsTab />}
    </div>
  )
}

function RegistrationsTab() {
  const qc = useQueryClient()
  const { branchId, isSuperAdmin } = useAdmin()
  const { data, isLoading } = useQuery<(Registration & { event_title: string; event_branch_name: string })[]>({
    queryKey: ['admin-registrations', branchId],
    queryFn: async () => {
      let q = supabase
        .from('registrations')
        .select('*, events(title, branches(name))')
        .order('created_at', { ascending: false })

      if (branchId) {
        const { data: eventData } = await supabase.from('events').select('id').eq('branch_id', branchId).eq('kind', 'cata')
        const eventIds = (eventData ?? []).map((e) => e.id)
        if (eventIds.length === 0) return []
        q = q.in('event_id', eventIds)
      }

      const { data, error } = await q
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        ...r,
        event_title: r.events?.title ?? '—',
        event_branch_name: r.events?.branches?.name ?? '—',
      }))
    },
  })

  async function toggleAttendance(id: string, current: boolean | null) {
    await supabase.from('registrations').update({ attended: !current }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-registrations'] })
  }

  return (
    <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
      {isLoading ? (
        <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !data?.length ? (
        <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay inscripciones</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Email</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Evento</th>
              {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Sucursal</th>}
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Cupos</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Asistió</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-parchment)]">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--color-cream)]/50">
                <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{r.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.email ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.event_title}</td>
                {isSuperAdmin && <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.event_branch_name}</td>}
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.spots ?? 1}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleAttendance(r.id, r.attended)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                      r.attended
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                        : 'border-[var(--color-parchment)] text-[var(--color-muted)] hover:border-emerald-300'
                    }`}
                  >
                    <Check size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
