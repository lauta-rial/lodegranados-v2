import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { EventsTab } from '@/components/admin/EventsTab'
import { useAdmin } from '@/context/AdminContext'
import { StatusBadge } from './AdminDashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Enrollment } from '@/types/database'

type Tab = 'courses' | 'enrollments'

export function AdminCursos() {
  const [tab, setTab] = useState<Tab>('courses')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-dark)]">Cursos</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Gestión de cursos e inscripciones</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-[var(--color-parchment)] bg-white p-1 w-fit">
        {(['courses', 'enrollments'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--color-wine)] text-white' : 'text-[var(--color-dark-muted)] hover:text-[var(--color-dark)]'}`}
          >
            {t === 'courses' ? 'Cursos' : 'Inscripciones'}
          </button>
        ))}
      </div>

      {tab === 'courses' ? <EventsTab kind="curso" /> : <EnrollmentsTab />}
    </div>
  )
}

function EnrollmentsTab() {
  const qc = useQueryClient()
  const { branchId, isSuperAdmin } = useAdmin()
  const { data, isLoading } = useQuery<(Enrollment & { course_title: string; course_branch_name: string })[]>({
    queryKey: ['admin-enrollments', branchId],
    queryFn: async () => {
      let q = supabase.from('enrollments').select('*, courses(title, branches(name))').order('created_at', { ascending: false })

      if (branchId) {
        const { data: courseData } = await supabase.from('courses').select('id').eq('branch_id', branchId)
        const courseIds = (courseData ?? []).map((c) => c.id)
        if (courseIds.length === 0) return []
        q = q.in('course_id', courseIds)
      }

      const { data, error } = await q
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((e: any) => ({
        ...e,
        course_title: e.courses?.title ?? '—',
        course_branch_name: e.courses?.branches?.name ?? '—',
      }))
    },
  })

  const statusCycle: Record<string, string> = { enrolled: 'completed', completed: 'dropped', dropped: 'enrolled' }

  async function cycleStatus(id: string, current: string) {
    await supabase.from('enrollments').update({ status: statusCycle[current] ?? 'enrolled' }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-enrollments'] })
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
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Curso</th>
              {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Sucursal</th>}
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-parchment)]">
            {data.map((e) => (
              <tr key={e.id} className="hover:bg-[var(--color-cream)]/50">
                <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{e.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{e.email ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{e.course_title}</td>
                {isSuperAdmin && <td className="px-4 py-3 text-[var(--color-dark-muted)]">{e.course_branch_name}</td>}
                <td className="px-4 py-3">
                  <button onClick={() => cycleStatus(e.id, e.status)} title="Click para cambiar estado">
                    <StatusBadge status={e.status} />
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
