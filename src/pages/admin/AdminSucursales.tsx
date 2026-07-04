import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAdmin } from '@/context/AdminContext'
import type { Branch } from '@/types/database'

export function AdminSucursales() {
  const qc = useQueryClient()
  const { isSuperAdmin } = useAdmin()
  const [modal, setModal] = useState<{ open: boolean; branch?: Branch }>({ open: false })

  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ['admin-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta sucursal? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) {
      alert('No se pudo eliminar la sucursal — probablemente todavía tiene eventos, cursos o planes asociados.')
      return
    }
    qc.invalidateQueries({ queryKey: ['admin-branches'] })
    qc.invalidateQueries({ queryKey: ['branches'] })
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-dark)]">Sucursales</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Gestión de la red de sucursales</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
        >
          <Plus size={15} /> Nueva sucursal
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !branches?.length ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay sucursales</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Ciudad</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Teléfono</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)]">/{b.slug}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{b.city ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{b.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${b.active ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--color-cream-dark)] text-[var(--color-muted)]'}`}>
                      {b.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ open: true, branch: b })}
                        className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BranchModal
        open={modal.open}
        branch={modal.branch}
        onClose={() => setModal({ open: false })}
        onSaved={() => {
          setModal({ open: false })
          qc.invalidateQueries({ queryKey: ['admin-branches'] })
          qc.invalidateQueries({ queryKey: ['branches'] })
        }}
      />
    </div>
  )
}

function BranchModal({ open, branch, onClose, onSaved }: {
  open: boolean
  branch?: Branch
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: branch?.name ?? '',
    slug: branch?.slug ?? '',
    city: branch?.city ?? '',
    address: branch?.address ?? '',
    phone: branch?.phone ?? '',
    instagram: branch?.instagram ?? '',
    image_url: branch?.image_url ?? '',
    active: branch?.active ?? true,
  })

  const key = branch?.id ?? 'new'

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name,
      slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
      city: form.city || null,
      address: form.address || null,
      phone: form.phone || null,
      instagram: form.instagram || null,
      image_url: form.image_url || null,
      active: form.active,
    }
    const { error } = branch?.id
      ? await supabase.from('branches').update(payload).eq('id', branch.id)
      : await supabase.from('branches').insert(payload)
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <Modal key={key} open={open} onClose={onClose} title={branch ? 'Editar sucursal' : 'Nueva sucursal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre">
            <input required className={fieldClass} value={form.name} onChange={set('name')} placeholder="Pichincha" />
          </FormField>
          <FormField label="Slug (URL)">
            <input required className={fieldClass} value={form.slug} onChange={set('slug')} placeholder="pichincha" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Ciudad">
            <input className={fieldClass} value={form.city} onChange={set('city')} placeholder="Rosario" />
          </FormField>
          <FormField label="Teléfono (WhatsApp)">
            <input className={fieldClass} value={form.phone} onChange={set('phone')} placeholder="+54 341 000-0000" />
          </FormField>
        </div>
        <FormField label="Dirección">
          <input className={fieldClass} value={form.address} onChange={set('address')} placeholder="Av. San Martín 1234" />
        </FormField>
        <FormField label="Instagram">
          <input className={fieldClass} value={form.instagram} onChange={set('instagram')} placeholder="@lodegranados" />
        </FormField>
        <FormField label="Foto de hero">
          <ImageUpload folder="branches/" value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} dimensions="1920 × 1080 px · ratio 16:9" />
        </FormField>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            className="h-4 w-4 rounded border-[var(--color-parchment)] accent-[var(--color-wine)]"
          />
          <label htmlFor="active" className="text-sm font-medium text-[var(--color-dark)]">Sucursal activa</label>
        </div>
        <FormActions onCancel={onClose} loading={loading} label={branch ? 'Guardar cambios' : 'Crear sucursal'} />
      </form>
    </Modal>
  )
}
