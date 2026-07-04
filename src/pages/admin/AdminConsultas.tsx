import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/context/AdminContext'
import { StatusBadge } from './AdminDashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import type { Inquiry } from '@/types/database'

const statuses = ['all', 'new', 'read', 'archived'] as const

export function AdminConsultas() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const qc = useQueryClient()
  const { branchId } = useAdmin()

  const { data, isLoading } = useQuery<Inquiry[]>({
    queryKey: ['admin-inquiries', statusFilter, branchId],
    queryFn: async () => {
      let q = supabase.from('inquiries').select('*').order('created_at', { ascending: false })
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  async function setStatus(id: string, status: string) {
    await supabase.from('inquiries').update({ status }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-inquiries'] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta consulta permanentemente?')) return
    let q = supabase.from('inquiries').delete().eq('id', id)
    if (branchId) q = q.eq('branch_id', branchId)
    const { error } = await q
    if (error) {
      alert('No se pudo eliminar la consulta.')
      return
    }
    qc.invalidateQueries({ queryKey: ['admin-inquiries'] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-dark)]">Consultas</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Consultas corporativas recibidas</p>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-[var(--color-parchment)] bg-white p-1 w-fit">
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${statusFilter === s ? 'bg-[var(--color-wine)] text-white' : 'text-[var(--color-dark-muted)] hover:text-[var(--color-dark)]'}`}
          >
            {s === 'all' ? 'Todas' : s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : !data?.length ? (
          <div className="rounded-xl border border-[var(--color-parchment)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
            No hay consultas {statusFilter !== 'all' ? `con estado "${statusFilter}"` : ''}
          </div>
        ) : (
          data.map((inq) => (
            <div key={inq.id} className="rounded-xl border border-[var(--color-parchment)] bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-[var(--color-dark)]">{inq.name}</p>
                    <StatusBadge status={inq.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                    {inq.email} · {inq.created_at ? formatDateTime(inq.created_at) : ''}
                  </p>
                  <p className="mt-3 text-sm text-[var(--color-dark-muted)] leading-relaxed">{inq.message}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {inq.status !== 'read' && (
                    <button onClick={() => setStatus(inq.id, 'read')}
                      className="h-8 rounded-lg border border-[var(--color-parchment)] px-3 text-xs font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] transition-colors">
                      Marcar leída
                    </button>
                  )}
                  {inq.status !== 'archived' && (
                    <button onClick={() => setStatus(inq.id, 'archived')}
                      className="h-8 rounded-lg border border-[var(--color-parchment)] px-3 text-xs font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] transition-colors">
                      Archivar
                    </button>
                  )}
                  {inq.status === 'archived' && (
                    <button onClick={() => setStatus(inq.id, 'new')}
                      className="h-8 rounded-lg border border-[var(--color-parchment)] px-3 text-xs font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] transition-colors">
                      Restaurar
                    </button>
                  )}
                  <button onClick={() => handleDelete(inq.id)}
                    className="h-8 rounded-lg border border-transparent px-3 text-xs font-medium text-red-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 size={13} className="inline mr-1" />Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
