import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FormField, fieldClass } from '@/components/admin/AdminFormField'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAdmin } from '@/context/AdminContext'
import type { Branch } from '@/types/database'

// Branch admins edit their OWN branch's content here. Slug + active are
// structural (URL routing / site visibility) and stay superadmin-only — shown
// read-only below, and blocked at the DB by trg_enforce_branch_structural.
export function AdminMiSucursal() {
  const { branchId, isSuperAdmin } = useAdmin()

  const { data: branch, isLoading, isError } = useQuery<Branch>({
    queryKey: ['my-branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').eq('id', branchId!).single()
      if (error) throw error
      return data
    },
    enabled: !!branchId,
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-dark)]">Mi Sucursal</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Editá los datos de tu sucursal</p>
      </div>

      {isSuperAdmin ? (
        <p className="rounded-xl border border-[var(--color-parchment)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
          Como superadmin gestionás todas las sucursales desde <span className="font-medium">Sucursales</span>.
        </p>
      ) : !branchId ? (
        <p className="rounded-xl border border-[var(--color-parchment)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
          Tu cuenta no tiene una sucursal asignada. Contactá al superadmin.
        </p>
      ) : isLoading ? (
        <div className="max-w-2xl space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
        </div>
      ) : isError || !branch ? (
        <p className="rounded-xl border border-red-100 bg-red-50 p-8 text-center text-sm text-red-700">
          No pudimos cargar tu sucursal. Reintentá más tarde.
        </p>
      ) : (
        <BranchForm branch={branch} />
      )}
    </div>
  )
}

function BranchForm({ branch }: { branch: Branch }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: branch.name ?? '',
    province: branch.province ?? '',
    city: branch.city ?? '',
    address: branch.address ?? '',
    postal_code: branch.postal_code ?? '',
    phone: branch.phone ?? '',
    instagram: branch.instagram ?? '',
    image_url: branch.image_url ?? '',
  })
  type Status = 'idle' | 'saving' | 'saved' | 'error'
  const [status, setStatus] = useState<Status>('idle')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    // Only content fields — slug/active are omitted on purpose (superadmin-only,
    // and the DB trigger would reject a change anyway).
    const { error } = await supabase.from('branches').update({
      name: form.name,
      province: form.province || null,
      city: form.city || null,
      address: form.address || null,
      postal_code: form.postal_code || null,
      phone: form.phone || null,
      instagram: form.instagram || null,
      image_url: form.image_url || null,
    }).eq('id', branch.id)

    if (error) {
      setStatus('error')
      return
    }
    setStatus('saved')
    qc.invalidateQueries({ queryKey: ['branches'] })
    qc.invalidateQueries({ queryKey: ['my-branch'] })
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-2xl border border-[var(--color-parchment)] bg-white p-6 space-y-4">
      {/* Read-only structural fields — greyed out; the "superadmin only" note
          is a hover tooltip rather than visible label text. */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Slug (URL)">
          <input
            className={`${fieldClass} cursor-not-allowed opacity-60`}
            value={`/${branch.slug ?? ''}`}
            disabled
            title="Solo el superadmin puede cambiar el slug"
          />
        </FormField>
        <FormField label="Estado">
          <input
            className={`${fieldClass} cursor-not-allowed opacity-60`}
            value={branch.active ? 'Activa' : 'Inactiva'}
            disabled
            title="Solo el superadmin puede activar o desactivar la sucursal"
          />
        </FormField>
      </div>

      <FormField label="Nombre">
        <input required className={fieldClass} value={form.name} onChange={set('name')} placeholder="Pichincha" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Provincia">
          <input className={fieldClass} value={form.province} onChange={set('province')} placeholder="Santa Fe" />
        </FormField>
        <FormField label="Ciudad">
          <input className={fieldClass} value={form.city} onChange={set('city')} placeholder="Rosario" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Dirección">
          <input className={fieldClass} value={form.address} onChange={set('address')} placeholder="Av. San Martín 1234" />
        </FormField>
        <FormField label="Código postal">
          <input className={fieldClass} value={form.postal_code} onChange={set('postal_code')} placeholder="S2000" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Teléfono (WhatsApp)">
          <input className={fieldClass} value={form.phone} onChange={set('phone')} placeholder="+54 341 000-0000" type="tel" />
        </FormField>
        <FormField label="Instagram">
          <input className={fieldClass} value={form.instagram} onChange={set('instagram')} placeholder="@lodegranados" />
        </FormField>
      </div>
      <FormField label="Foto de hero">
        <ImageUpload folder="branches/" value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} dimensions="1920 × 1080 px · ratio 16:9" />
      </FormField>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="inline-flex h-10 items-center rounded-lg bg-[var(--color-wine)] px-5 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors disabled:opacity-60"
        >
          {status === 'saving' ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-sm text-emerald-600"><Check size={14} /> Guardado</span>
        )}
        {status === 'saving' && (
          <Loader2 size={16} className="animate-spin text-[var(--color-muted)]" />
        )}
        {status === 'error' && (
          <span className="text-sm text-red-600">No se pudo guardar. Reintentá.</span>
        )}
      </div>
    </form>
  )
}
