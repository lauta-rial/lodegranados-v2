import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/Skeleton'

type Subscriber = { id: string; email: string; created_at: string | null }

export function AdminNewsletter() {
  const { data, isLoading } = useQuery<Subscriber[]>({
    queryKey: ['admin-newsletter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  function exportCSV() {
    if (!data?.length) return
    const rows = ['Email,Fecha'].concat(
      data.map(s => `${s.email},${s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR') : ''}`)
    )
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'newsletter.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-dark)]">Newsletter</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {data ? `${data.length} suscriptor${data.length !== 1 ? 'es' : ''}` : '—'}
          </p>
        </div>
        {data && data.length > 0 && (
          <button
            onClick={exportCSV}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-parchment)] bg-white px-4 text-sm font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] transition-colors"
          >
            <Mail size={14} /> Exportar CSV
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data?.length ? (
          <div className="p-12 text-center">
            <Mail size={32} className="mx-auto text-[var(--color-parchment)]" />
            <p className="mt-3 text-sm text-[var(--color-muted)]">Todavía no hay suscriptores</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Email</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Fecha de suscripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 text-[var(--color-dark)]">{s.email}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
