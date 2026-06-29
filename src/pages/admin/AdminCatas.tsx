import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Check, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { useAdmin } from '@/context/AdminContext'
import { StatusBadge } from './AdminDashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Event, Registration } from '@/types/database'

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

      {tab === 'events' ? <EventsTab /> : <RegistrationsTab />}
    </div>
  )
}

type EventWithBranch = Event & { branches: { name: string } | null }

function EventsTab() {
  const qc = useQueryClient()
  const { branchId, isSuperAdmin } = useAdmin()
  const [modal, setModal] = useState<{ open: boolean; event?: Event }>({ open: false })

  const { data: events, isLoading } = useQuery<EventWithBranch[]>({
    queryKey: ['admin-events', branchId],
    queryFn: async () => {
      let q = supabase.from('events').select('*, branches(name)').order('date', { ascending: true })
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any as EventWithBranch[]
    },
  })

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('events').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-events'] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setModal({ open: true })}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
        >
          <Plus size={15} /> Nuevo evento
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !events?.length ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay eventos</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Evento</th>
                {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Sucursal</th>}
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Lugares</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Precio</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{ev.title}</td>
                  {isSuperAdmin && <td className="px-4 py-3 text-[var(--color-dark-muted)]">{ev.branches?.name ?? '—'}</td>}
                  <td className="px-4 py-3 text-[var(--color-dark-muted)] capitalize">{formatDate(ev.date)}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{ev.available_spots}/{ev.total_spots}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{ev.price ? formatPrice(ev.price) : '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ev.active ? 'active' : 'cancelled'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/scanner/${ev.id}`} className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-wine)] transition-colors" title="Escanear entradas">
                        <QrCode size={14} />
                      </Link>
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
        open={modal.open}
        event={modal.event}
        branchId={branchId}
        onClose={() => setModal({ open: false })}
        onSaved={() => {
          setModal({ open: false })
          qc.invalidateQueries({ queryKey: ['admin-events'] })
          qc.invalidateQueries({ queryKey: ['events'] })
          qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
        }}
      />
    </>
  )
}

function EventModal({ open, event, branchId, onClose, onSaved }: {
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
    total_spots: event?.total_spots?.toString() ?? '',
    available_spots: event?.available_spots?.toString() ?? '',
    price: event?.price?.toString() ?? '',
    image_url: event?.image_url ?? '',
    branch_id: event?.branch_id ?? '',
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

  // Reset form when event changes
  const key = event?.id ?? 'new'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const resolvedBranchId = isSuperAdmin ? (form.branch_id || null) : (branchId ?? null)
    const payload = {
      title: form.title,
      description: form.description || null,
      date: form.date,
      time: form.time,
      location: form.location,
      total_spots: parseInt(form.total_spots),
      available_spots: parseInt(form.available_spots),
      price: form.price ? parseInt(form.price) : null,
      image_url: form.image_url || null,
      active: true,
      branch_id: resolvedBranchId,
    }
    const { error } = event?.id
      ? await supabase.from('events').update(payload).eq('id', event.id)
      : await supabase.from('events').insert(payload)
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <Modal key={key} open={open} onClose={onClose} title={event ? 'Editar evento' : 'Nuevo evento'} size="lg">
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
          <textarea rows={3} className={`${fieldClass} resize-none`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Fecha">
            <input required type="date" className={fieldClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>
          <FormField label="Hora">
            <input required type="time" className={fieldClass} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Ubicación">
          <input required className={fieldClass} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </FormField>
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
        <FormField label="Imagen">
          <ImageUpload folder="events/" value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} dimensions="1200 × 600 px · ratio 2:1" />
        </FormField>
        <FormActions onCancel={onClose} loading={loading} label={event ? 'Guardar cambios' : 'Crear evento'} />
      </form>
    </Modal>
  )
}

function RegistrationsTab() {
  const qc = useQueryClient()
  const { isSuperAdmin } = useAdmin()
  const { data, isLoading } = useQuery<(Registration & { event_title: string; event_branch_name: string })[]>({
    queryKey: ['admin-registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, events(title, branches(name))')
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
