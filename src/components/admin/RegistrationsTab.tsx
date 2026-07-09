import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/context/AdminContext'
import { StatusBadge } from '@/pages/admin/AdminDashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Registration } from '@/types/database'
import type { EventKind } from './EventsTab'

type RegistrationRow = Registration & { event_title: string; event_branch_name: string }

const statusCycle: Record<string, string> = { enrolled: 'completed', completed: 'dropped', dropped: 'enrolled' }

// registrations absorbed enrollments — a cata registration and a curso
// registration are the same table now, distinguished by their event's kind.
// Catas show attendance read-only (attended is set automatically: a validated
// ticket flips it to SÍ, and closing the event flips the rest to NO — see the
// attendance triggers migration). Cursos keep the enrolled/completed/dropped
// status cycle that used to live on enrollments.status.
export function RegistrationsTab({ kind }: { kind: EventKind }) {
  const qc = useQueryClient()
  const { branchId, isSuperAdmin } = useAdmin()

  const { data, isLoading } = useQuery<RegistrationRow[]>({
    queryKey: ['admin-registrations', kind, branchId],
    queryFn: async () => {
      let eventsQ = supabase.from('events').select('id').eq('kind', kind)
      if (branchId) eventsQ = eventsQ.eq('branch_id', branchId)
      const { data: eventData } = await eventsQ
      const eventIds = (eventData ?? []).map((e) => e.id)
      if (eventIds.length === 0) return []

      const { data, error } = await supabase
        .from('registrations')
        .select('*, events(title, branches(name))')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        ...r,
        event_title: r.events?.title ?? '—',
        event_branch_name: r.events?.branches?.name ?? '—',
      }))
    },
  })

  async function cycleStatus(id: string, current: string | null) {
    await supabase.from('registrations').update({ status: statusCycle[current ?? ''] ?? 'enrolled' }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-registrations', kind] })
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
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">{kind === 'cata' ? 'Evento' : 'Curso'}</th>
              {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Sucursal</th>}
              {kind === 'cata' ? (
                <>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Entradas</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Asistió</th>
                </>
              ) : (
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-parchment)]">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--color-cream)]/50">
                <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{r.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.email ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.event_title}</td>
                {isSuperAdmin && <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.event_branch_name}</td>}
                {kind === 'cata' ? (
                  <>
                    <td className="px-4 py-3 text-[var(--color-dark-muted)]">{r.spots ?? 1}</td>
                    <td className="px-4 py-3">
                      <AttendedBadge attended={r.attended} />
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-3">
                    <button onClick={() => cycleStatus(r.id, r.status)} title="Click para cambiar estado">
                      <StatusBadge status={r.status ?? 'enrolled'} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Read-only attendance, set automatically by DB triggers:
// null → '-' (before/undecided), true → 'SÍ' (a ticket was scanned),
// false → 'NO' (event closed without a scan).
function AttendedBadge({ attended }: { attended: boolean | null }) {
  if (attended === null) return <span className="text-[var(--color-muted)]">—</span>
  return attended ? (
    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">SÍ</span>
  ) : (
    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">NO</span>
  )
}
