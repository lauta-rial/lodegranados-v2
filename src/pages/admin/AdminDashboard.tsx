import { useQuery } from '@tanstack/react-query'
import { CalendarDays, BookOpen, Users, MessageSquare, ClipboardList, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/context/AdminContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

interface Counts {
  events: number
  courses: number
  subscriptions: number
  inquiries_new: number
  registrations: number
  enrollments: number
}

function useDashboard(branchId: string | null) {
  return useQuery<Counts>({
    queryKey: ['admin-dashboard', branchId],
    queryFn: async () => {
      if (branchId) {
        // Branch admin: filter by branch. Registrations/enrollments via ID lists.
        const [eventsQ, coursesQ, subsQ, inquiriesQ] = await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('active', true).eq('branch_id', branchId),
          supabase.from('courses').select('*', { count: 'exact', head: true }).eq('active', true).eq('branch_id', branchId),
          supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('branch_id', branchId),
          supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new').eq('branch_id', branchId),
        ])
        const [eventsIds, coursesIds] = await Promise.all([
          supabase.from('events').select('id').eq('branch_id', branchId),
          supabase.from('courses').select('id').eq('branch_id', branchId),
        ])
        const eventIds = eventsIds.data?.map(e => e.id) ?? []
        const courseIds = coursesIds.data?.map(c => c.id) ?? []
        const [regQ, enrQ] = await Promise.all([
          eventIds.length > 0
            ? supabase.from('registrations').select('*', { count: 'exact', head: true }).in('event_id', eventIds)
            : Promise.resolve({ count: 0 }),
          courseIds.length > 0
            ? supabase.from('enrollments').select('*', { count: 'exact', head: true }).in('course_id', courseIds).eq('status', 'enrolled')
            : Promise.resolve({ count: 0 }),
        ])
        return {
          events: eventsQ.count ?? 0,
          courses: coursesQ.count ?? 0,
          subscriptions: subsQ.count ?? 0,
          inquiries_new: inquiriesQ.count ?? 0,
          registrations: regQ.count ?? 0,
          enrollments: enrQ.count ?? 0,
        }
      }

      // Superadmin: global counts
      const [events, courses, subscriptions, inquiries, registrations, enrollments] =
        await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('active', true),
          supabase.from('courses').select('*', { count: 'exact', head: true }).eq('active', true),
          supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
          supabase.from('registrations').select('*', { count: 'exact', head: true }),
          supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'enrolled'),
        ])
      return {
        events: events.count ?? 0,
        courses: courses.count ?? 0,
        subscriptions: subscriptions.count ?? 0,
        inquiries_new: inquiries.count ?? 0,
        registrations: registrations.count ?? 0,
        enrollments: enrollments.count ?? 0,
      }
    },
  })
}

function useRecentInquiries(branchId: string | null) {
  return useQuery({
    queryKey: ['admin-recent-inquiries', branchId],
    queryFn: async () => {
      let q = supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(5)
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function AdminDashboard() {
  const { branchId, isSuperAdmin } = useAdmin()
  const { data: counts, isLoading } = useDashboard(branchId)
  const { data: inquiries } = useRecentInquiries(branchId)

  const kpis = [
    { label: 'Eventos activos', value: counts?.events, icon: CalendarDays, color: 'text-[var(--color-wine)]', bg: 'bg-[var(--color-wine)]/10' },
    { label: 'Cursos activos', value: counts?.courses, icon: BookOpen, color: 'text-[var(--color-terracotta)]', bg: 'bg-[var(--color-terracotta)]/10' },
    { label: 'Suscripciones activas', value: counts?.subscriptions, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Consultas nuevas', value: counts?.inquiries_new, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Inscripciones a catas', value: counts?.registrations, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Inscripciones a cursos', value: counts?.enrollments, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-[var(--color-dark)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {isSuperAdmin ? 'Resumen global — todas las sucursales' : 'Resumen de tu sucursal'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-[var(--color-parchment)] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--color-muted)]">{label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-3 font-display text-3xl font-semibold text-[var(--color-dark)]">
                {value ?? 0}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-display text-xl text-[var(--color-dark)]">Consultas recientes</h2>
        <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
          {!inquiries || inquiries.length === 0 ? (
            <p className="p-6 text-sm text-center text-[var(--color-muted)]">No hay consultas aún</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-parchment)]">
                {inquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-[var(--color-cream)]/50">
                    <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{inq.name}</td>
                    <td className="px-4 py-3 text-[var(--color-dark-muted)]">{inq.email}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)] capitalize">
                      {inq.created_at ? formatDate(inq.created_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inq.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-amber-50 text-amber-700',
    read: 'bg-blue-50 text-blue-700',
    archived: 'bg-[var(--color-cream-dark)] text-[var(--color-muted)]',
    active: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-red-50 text-red-700',
    pending: 'bg-[var(--color-cream-dark)] text-[var(--color-muted)]',
    enrolled: 'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
    dropped: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export { StatusBadge }
