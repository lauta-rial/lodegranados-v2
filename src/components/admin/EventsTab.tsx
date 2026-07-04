import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, QrCode, CalendarRange } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { SessionsManager } from '@/components/admin/SessionsManager'
import { useAdmin } from '@/context/AdminContext'
import { StatusBadge } from '@/pages/admin/AdminDashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Event } from '@/types/database'

export type EventKind = 'cata' | 'curso'

type EventWithBranch = Event & { branches: { name: string } | null }

// Catas and cursos are both rows in `events` (kind: 'cata' | 'curso') — this
// component covers the catalog CRUD for both, since they share every column
// except a handful of curso-only fields (instructor/schedule/syllabus/total_classes)
// and cata-only required fields (time/location). Registrations/enrollments
// stay as separate tabs/tables for now (unchanged in this phase).
export function EventsTab({ kind }: { kind: EventKind }) {
  const qc = useQueryClient()
  const { branchId, isSuperAdmin } = useAdmin()
  const [modal, setModal] = useState<{ open: boolean; event?: Event }>({ open: false })
  const [sessionsModal, setSessionsModal] = useState<{ open: boolean; event?: Event }>({ open: false })
  const noun = kind === 'cata' ? 'evento' : 'curso'

  const { data: events, isLoading } = useQuery<EventWithBranch[]>({
    queryKey: ['admin-events', kind, branchId],
    queryFn: async () => {
      let q = supabase.from('events').select('*, branches(name)').eq('kind', kind).order('date', { ascending: true })
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any as EventWithBranch[]
    },
  })

  async function handleDelete(id: string) {
    if (!confirm(`¿Eliminar este ${noun}?`)) return
    await supabase.from('events').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-events', kind] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setModal({ open: true })}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
        >
          <Plus size={15} /> {kind === 'cata' ? 'Nuevo evento' : 'Nuevo curso'}
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !events?.length ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">{kind === 'cata' ? 'No hay eventos' : 'No hay cursos'}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">{kind === 'cata' ? 'Evento' : 'Curso'}</th>
                {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Sucursal</th>}
                {kind === 'curso' && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Instructor</th>}
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">{kind === 'cata' ? 'Fecha' : 'Inicio'}</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Lugares</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Precio</th>
                {kind === 'cata' && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{ev.title}</td>
                  {isSuperAdmin && <td className="px-4 py-3 text-[var(--color-dark-muted)]">{ev.branches?.name ?? '—'}</td>}
                  {kind === 'curso' && <td className="px-4 py-3 text-[var(--color-dark-muted)]">{ev.instructor_name ?? '—'}</td>}
                  <td className="px-4 py-3 text-[var(--color-dark-muted)] capitalize">{formatDate(ev.date)}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{ev.available_spots}/{ev.total_spots}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{ev.price ? formatPrice(ev.price) : '—'}</td>
                  {kind === 'cata' && (
                    <td className="px-4 py-3">
                      <StatusBadge status={ev.active ? 'active' : 'cancelled'} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/catas/${ev.id}/live`} className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-wine)] transition-colors" title="Ver en vivo">
                        <QrCode size={14} />
                      </Link>
                      {kind === 'curso' && (
                        <button onClick={() => setSessionsModal({ open: true, event: ev })} className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-wine)] transition-colors" title="Sesiones">
                          <CalendarRange size={14} />
                        </button>
                      )}
                      <button onClick={() => setModal({ open: true, event: ev })} className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors">
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

      <EventModal
        key={modal.event?.id ?? 'new'}
        kind={kind}
        open={modal.open}
        event={modal.event}
        branchId={branchId}
        onClose={() => setModal({ open: false })}
        onSaved={() => {
          setModal({ open: false })
          qc.invalidateQueries({ queryKey: ['admin-events', kind] })
          qc.invalidateQueries({ queryKey: ['events'] })
          qc.invalidateQueries({ queryKey: ['courses'] })
          qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
        }}
      />

      {sessionsModal.event && (
        <SessionsManager
          open={sessionsModal.open}
          event={sessionsModal.event}
          onClose={() => setSessionsModal({ open: false })}
        />
      )}
    </>
  )
}

function EventModal({ kind, open, event, branchId, onClose, onSaved }: {
  kind: EventKind
  open: boolean
  event?: Event
  branchId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { isSuperAdmin } = useAdmin()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    date: event?.date ?? '',
    time: event?.time?.slice(0, 5) ?? '',
    location: event?.location ?? '',
    instructor_name: event?.instructor_name ?? '',
    instructor_bio: event?.instructor_bio ?? '',
    schedule: event?.schedule ?? '',
    total_classes: event?.total_classes?.toString() ?? '',
    syllabus: Array.isArray(event?.syllabus) ? (event.syllabus as string[]).join('\n') : '',
    total_spots: event?.total_spots?.toString() ?? '',
    available_spots: event?.available_spots?.toString() ?? '',
    price: event?.price?.toString() ?? '',
    image_url: event?.image_url ?? '',
    branch_id: event?.branch_id ?? '',
    active: event?.active ?? true,
  })

  const { data: branches } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name')
      return data ?? []
    },
    enabled: isSuperAdmin,
    staleTime: Infinity,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const resolvedBranchId = isSuperAdmin ? (form.branch_id || null) : (branchId ?? null)
    const payload = {
      title: form.title,
      description: form.description || null,
      date: form.date,
      time: kind === 'cata' ? form.time : null,
      location: kind === 'cata' ? form.location : null,
      instructor_name: kind === 'curso' ? form.instructor_name : null,
      instructor_bio: kind === 'curso' ? (form.instructor_bio || null) : null,
      schedule: kind === 'curso' ? (form.schedule || null) : null,
      total_classes: kind === 'curso' ? parseInt(form.total_classes) : null,
      syllabus: kind === 'curso' && form.syllabus ? form.syllabus.split('\n').filter(Boolean) : null,
      total_spots: parseInt(form.total_spots),
      available_spots: parseInt(form.available_spots),
      price: form.price ? parseInt(form.price) : null,
      image_url: form.image_url || null,
      active: form.active,
      branch_id: resolvedBranchId,
      kind,
    }
    const { error } = event?.id
      ? await supabase.from('events').update(payload).eq('id', event.id)
      : await supabase.from('events').insert(payload)
    setLoading(false)
    if (!error) onSaved()
  }

  const title = event
    ? (kind === 'cata' ? 'Editar evento' : 'Editar curso')
    : (kind === 'cata' ? 'Nuevo evento' : 'Nuevo curso')

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Título">
          <input required className={fieldClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </FormField>
        {isSuperAdmin && (
          <FormField label="Sucursal">
            <select className={fieldClass} value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
              <option value="">— Sin sucursal —</option>
              {branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Descripción">
          <textarea rows={kind === 'cata' ? 3 : 2} className={`${fieldClass} resize-none`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </FormField>

        {kind === 'curso' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Instructor">
              <input required className={fieldClass} value={form.instructor_name} onChange={e => setForm(f => ({ ...f, instructor_name: e.target.value }))} />
            </FormField>
            <FormField label="Horario (ej: Lunes 19:00)">
              <input className={fieldClass} value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} />
            </FormField>
          </div>
        )}
        {kind === 'curso' && (
          <FormField label="Bio del instructor">
            <textarea rows={2} className={`${fieldClass} resize-none`} value={form.instructor_bio} onChange={e => setForm(f => ({ ...f, instructor_bio: e.target.value }))} />
          </FormField>
        )}

        {kind === 'cata' ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fecha">
              <input required type="date" className={fieldClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Hora">
              <input required type="time" className={fieldClass} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </FormField>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fecha de inicio">
              <input required type="date" className={fieldClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="N° de clases">
              <input required type="number" min="1" className={fieldClass} value={form.total_classes} onChange={e => setForm(f => ({ ...f, total_classes: e.target.value }))} />
            </FormField>
          </div>
        )}

        {kind === 'cata' && (
          <FormField label="Ubicación">
            <input required className={fieldClass} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </FormField>
        )}

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Cupos totales">
            <input required type="number" min="1" className={fieldClass} value={form.total_spots} onChange={e => setForm(f => ({ ...f, total_spots: e.target.value }))} />
          </FormField>
          <FormField label="Cupos disponibles">
            <input required type="number" min="0" className={fieldClass} value={form.available_spots} onChange={e => setForm(f => ({ ...f, available_spots: e.target.value }))} />
          </FormField>
          <FormField label="Precio (ARS)">
            <input type="number" min="0" className={fieldClass} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </FormField>
        </div>

        {kind === 'curso' && (
          <FormField label="Temario (un tema por línea)">
            <textarea rows={4} className={`${fieldClass} resize-none`} value={form.syllabus} onChange={e => setForm(f => ({ ...f, syllabus: e.target.value }))} placeholder="Introducción al análisis sensorial&#10;Variedades de uva&#10;..." />
          </FormField>
        )}

        <FormField label="Imagen">
          <ImageUpload
            folder={kind === 'cata' ? 'events/' : 'courses/'}
            value={form.image_url}
            onChange={url => setForm(f => ({ ...f, image_url: url }))}
            dimensions={kind === 'cata' ? '1200 × 600 px · ratio 2:1' : '800 × 600 px · ratio 4:3'}
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-[var(--color-parchment)] accent-[var(--color-wine)]" />
          <span className="text-[var(--color-dark)]">{kind === 'cata' ? 'Evento activo (visible en el sitio)' : 'Curso activo (visible en el sitio)'}</span>
        </label>
        <FormActions onCancel={onClose} loading={loading} label={event ? 'Guardar cambios' : (kind === 'cata' ? 'Crear evento' : 'Crear curso')} />
      </form>
    </Modal>
  )
}
