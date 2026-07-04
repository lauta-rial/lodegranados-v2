import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import type { Event, EventSession } from '@/types/database'

// Only meaningful for kind='curso' — a cata always has exactly one session,
// auto-created and kept in sync with the event's own date/time/location by
// a DB trigger (see migration per_session_tickets_and_session_lifecycle),
// so there's nothing to manage there. A course's classes 2..N have no
// stored date until an admin adds them here — existing multi-class courses
// migrated from the old `courses` table only ever had a free-text
// `schedule` string, never per-class dates, so there's no way to
// auto-populate these; that's a real, unavoidable manual step.
export function SessionsManager({ open, event, onClose }: {
  open: boolean
  event: Event
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<EventSession | 'new' | null>(null)

  const { data: sessions, isLoading } = useQuery<EventSession[]>({
    queryKey: ['event-sessions', event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_sessions')
        .select('*')
        .eq('event_id', event.id)
        .order('session_number', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: open,
  })

  async function handleDelete(session: EventSession) {
    if (!confirm(`¿Eliminar la Clase ${session.session_number}?`)) return
    const { error } = await supabase.from('event_sessions').delete().eq('id', session.id)
    if (error) {
      // The DB blocks deleting a session that already has validated
      // tickets (real attendance history) — surface that message as-is,
      // it's already written for admins, not developers.
      alert(error.message.includes('validadas') ? error.message : 'No se pudo eliminar la clase.')
      return
    }
    qc.invalidateQueries({ queryKey: ['event-sessions', event.id] })
  }

  return (
    <Modal open={open} onClose={onClose} title={`Sesiones · ${event.title}`} size="lg">
      {editing ? (
        <SessionForm
          eventId={event.id}
          session={editing === 'new' ? undefined : editing}
          nextNumber={(sessions?.length ?? 0) + 1}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            qc.invalidateQueries({ queryKey: ['event-sessions', event.id] })
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEditing('new')}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
            >
              <Plus size={15} /> Nueva clase
            </button>
          </div>

          <div className="rounded-xl border border-[var(--color-parchment)] overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !sessions?.length ? (
              <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay clases todavía.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Clase</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Hora</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Ubicación</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-parchment)]">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--color-cream)]/50">
                      <td className="px-4 py-3 font-medium text-[var(--color-dark)]">Clase {s.session_number}</td>
                      <td className="px-4 py-3 text-[var(--color-dark-muted)] capitalize">{s.date ? formatDate(s.date) : '—'}</td>
                      <td className="px-4 py-3 text-[var(--color-dark-muted)]">{s.time?.slice(0, 5) ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--color-dark-muted)]">{s.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditing(s)} className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(s)} className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors">
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
        </div>
      )}
    </Modal>
  )
}

function SessionForm({ eventId, session, nextNumber, onCancel, onSaved }: {
  eventId: string
  session?: EventSession
  nextNumber: number
  onCancel: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    date: session?.date ?? '',
    time: session?.time?.slice(0, 5) ?? '',
    location: session?.location ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      date: form.date || null,
      time: form.time || null,
      location: form.location || null,
    }
    const { error } = session
      ? await supabase.from('event_sessions').update(payload).eq('id', session.id)
      : await supabase.from('event_sessions').insert({ ...payload, event_id: eventId, session_number: nextNumber })
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium text-[var(--color-dark)]">
        {session ? `Editar Clase ${session.session_number}` : `Nueva Clase ${nextNumber}`}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fecha">
          <input type="date" className={fieldClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </FormField>
        <FormField label="Hora">
          <input type="time" className={fieldClass} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
        </FormField>
      </div>
      <FormField label="Ubicación">
        <input className={fieldClass} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
      </FormField>
      <FormActions onCancel={onCancel} loading={loading} label={session ? 'Guardar cambios' : 'Crear clase'} />
    </form>
  )
}
