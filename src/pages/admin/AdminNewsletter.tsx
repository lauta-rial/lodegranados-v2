import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'

type Subscriber = { id: string; email: string; created_at: string | null }

export function AdminNewsletter() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

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

  async function handleDelete(id: string, email: string) {
    if (!confirm(`¿Eliminar a ${email} de la lista?`)) return
    const { error } = await supabase.from('newsletter').delete().eq('id', id)
    if (error) {
      alert('No se pudo eliminar el suscriptor.')
      return
    }
    qc.invalidateQueries({ queryKey: ['admin-newsletter'] })
  }

  function exportCSV() {
    if (!data?.length) return
    const rows = ['Email,Fecha'].concat(
      data.map(s => `${s.email},${s.created_at ? new Date(s.created_at).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : ''}`)
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
        <div className="flex items-center gap-2">
          {data && data.length > 0 && (
            <button
              onClick={exportCSV}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-parchment)] bg-white px-4 text-sm font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] transition-colors"
            >
              <Mail size={14} /> Exportar CSV
            </button>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 text-[var(--color-dark)]">{s.email}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id, s.email)}
                      className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors"
                      title="Eliminar suscriptor"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddSubscriberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false)
          qc.invalidateQueries({ queryKey: ['admin-newsletter'] })
        }}
      />
    </div>
  )
}

function AddSubscriberModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: dbErr } = await supabase.from('newsletter').insert({ email })
    setLoading(false)
    if (dbErr) {
      setError(dbErr.code === '23505' ? 'Este email ya está suscripto.' : 'Error al guardar.')
    } else {
      setEmail('')
      onSaved()
    }
  }

  return (
    <Modal key={open ? 'open' : 'closed'} open={open} onClose={onClose} title="Agregar suscriptor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email">
          <input
            type="email"
            required
            autoFocus
            className={fieldClass}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="nombre@email.com"
          />
        </FormField>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormActions onCancel={onClose} loading={loading} label="Agregar" />
      </form>
    </Modal>
  )
}
