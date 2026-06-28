import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'
import { StatusBadge } from './AdminDashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Course, Enrollment } from '@/types/database'

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

      {tab === 'courses' ? <CoursesTab /> : <EnrollmentsTab />}
    </div>
  )
}

function CoursesTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; course?: Course }>({ open: false })

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('start_date', { ascending: true })
      if (error) throw error
      return data
    },
  })

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este curso?')) return
    await supabase.from('courses').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setModal({ open: true })}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors">
          <Plus size={15} /> Nuevo curso
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !courses?.length ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay cursos</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Curso</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Instructor</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Inicio</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Lugares</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Precio</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{c.title}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{c.instructor_name}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)] capitalize">{formatDate(c.start_date)}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{c.available_spots}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{c.price ? formatPrice(c.price) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal({ open: true, course: c })} className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CourseModal
        open={modal.open}
        course={modal.course}
        onClose={() => setModal({ open: false })}
        onSaved={() => {
          setModal({ open: false })
          qc.invalidateQueries({ queryKey: ['admin-courses'] })
          qc.invalidateQueries({ queryKey: ['courses'] })
          qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
        }}
      />
    </>
  )
}

function CourseModal({ open, course, onClose, onSaved }: { open: boolean; course?: Course; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: course?.title ?? '',
    description: course?.description ?? '',
    instructor_name: course?.instructor_name ?? '',
    instructor_bio: course?.instructor_bio ?? '',
    total_classes: course?.total_classes?.toString() ?? '',
    start_date: course?.start_date ?? '',
    schedule: course?.schedule ?? '',
    price: course?.price?.toString() ?? '',
    available_spots: course?.available_spots?.toString() ?? '',
    syllabus: Array.isArray(course?.syllabus) ? (course.syllabus as string[]).join('\n') : '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      instructor_name: form.instructor_name,
      instructor_bio: form.instructor_bio || null,
      total_classes: parseInt(form.total_classes),
      start_date: form.start_date,
      schedule: form.schedule || null,
      price: form.price ? parseInt(form.price) : null,
      available_spots: parseInt(form.available_spots),
      syllabus: form.syllabus ? form.syllabus.split('\n').filter(Boolean) : null,
      active: true,
    }
    const { error } = course?.id
      ? await supabase.from('courses').update(payload).eq('id', course.id)
      : await supabase.from('courses').insert(payload)
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <Modal key={course?.id ?? 'new'} open={open} onClose={onClose} title={course ? 'Editar curso' : 'Nuevo curso'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Título"><input required className={fieldClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Descripción"><textarea rows={2} className={`${fieldClass} resize-none`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Instructor"><input required className={fieldClass} value={form.instructor_name} onChange={e => setForm(f => ({ ...f, instructor_name: e.target.value }))} /></FormField>
          <FormField label="Horario (ej: Lunes 19:00)"><input className={fieldClass} value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} /></FormField>
        </div>
        <FormField label="Bio del instructor"><textarea rows={2} className={`${fieldClass} resize-none`} value={form.instructor_bio} onChange={e => setForm(f => ({ ...f, instructor_bio: e.target.value }))} /></FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Fecha de inicio"><input required type="date" className={fieldClass} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></FormField>
          <FormField label="N° de clases"><input required type="number" min="1" className={fieldClass} value={form.total_classes} onChange={e => setForm(f => ({ ...f, total_classes: e.target.value }))} /></FormField>
          <FormField label="Lugares disponibles"><input required type="number" min="0" className={fieldClass} value={form.available_spots} onChange={e => setForm(f => ({ ...f, available_spots: e.target.value }))} /></FormField>
        </div>
        <FormField label="Precio (ARS)"><input type="number" min="0" className={fieldClass} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></FormField>
        <FormField label="Temario (un tema por línea)"><textarea rows={4} className={`${fieldClass} resize-none`} value={form.syllabus} onChange={e => setForm(f => ({ ...f, syllabus: e.target.value }))} placeholder="Introducción al análisis sensorial&#10;Variedades de uva&#10;..." /></FormField>
        <FormActions onCancel={onClose} loading={loading} label={course ? 'Guardar cambios' : 'Crear curso'} />
      </form>
    </Modal>
  )
}

function EnrollmentsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<(Enrollment & { course_title: string })[]>({
    queryKey: ['admin-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('*, courses(title)').order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((e: any) => ({
        ...e,
        course_title: e.courses?.title ?? '—',
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
              <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-parchment)]">
            {data.map((e) => (
              <tr key={e.id} className="hover:bg-[var(--color-cream)]/50">
                <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{e.name ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{e.email ?? '—'}</td>
                <td className="px-4 py-3 text-[var(--color-dark-muted)]">{e.course_title}</td>
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
