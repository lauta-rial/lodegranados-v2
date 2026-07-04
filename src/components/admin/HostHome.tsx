import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { QrCode, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

type AssignedEvent = {
  event_id: string
  title: string
  kind: string
  date: string
}

// A host's entire admin surface: the events they've been assigned to scan,
// nothing else. Reads event_hosts filtered to their own user_id (RLS: "Host
// reads own assignments"), joined to events (RLS: "Host read assigned
// events") — both scoped narrowly enough that this query can't accidentally
// leak another branch's or host's data.
export function HostHome() {
  const { user, signOut } = useAuth()

  const { data: assignments, isLoading } = useQuery<AssignedEvent[]>({
    queryKey: ['host-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_hosts')
        .select('event_id, events(title, kind, date)')
        .order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any) => ({
        event_id: row.event_id,
        title: row.events?.title ?? '—',
        kind: row.events?.kind ?? 'cata',
        date: row.events?.date,
      }))
    },
    enabled: !!user,
  })

  return (
    <div className="min-h-screen bg-[var(--color-cream)] p-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl text-[var(--color-dark)]">Lo de Granados</p>
            <p className="text-sm text-[var(--color-muted)]">Host — {user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-white transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : !assignments?.length ? (
          <p className="rounded-2xl border border-[var(--color-parchment)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
            Todavía no tenés eventos asignados. Pedile a un admin que te agregue.
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <Link
                key={a.event_id}
                to={`/admin/catas/${a.event_id}/live`}
                className="flex items-center justify-between rounded-2xl border border-[var(--color-parchment)] bg-white p-4 hover:border-[var(--color-wine)]/30 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="font-medium text-[var(--color-dark)]">{a.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)] capitalize">
                    {a.kind === 'curso' ? 'Curso' : 'Cata'} · {a.date ? formatDate(a.date) : '—'}
                  </p>
                </div>
                <QrCode size={18} className="text-[var(--color-wine)]" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
