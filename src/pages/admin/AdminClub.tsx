import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/admin/Modal'
import { FormField, FormActions, fieldClass } from '@/components/admin/AdminFormField'
import { ImageUpload } from '@/components/admin/ImageUpload'
import { useAdmin } from '@/context/AdminContext'
import { StatusBadge } from './AdminDashboard'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatPrice, currentPeriod, periodLabel } from '@/lib/utils'
import type { Plan, Subscription } from '@/types/database'

type Tab = 'plans' | 'subscriptions'

export function AdminClub() {
  const [tab, setTab] = useState<Tab>('plans')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-dark)]">Club DeVinos</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Planes y suscripciones</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-[var(--color-parchment)] bg-white p-1 w-fit">
        {(['plans', 'subscriptions'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--color-wine)] text-white' : 'text-[var(--color-dark-muted)] hover:text-[var(--color-dark)]'}`}
          >
            {t === 'plans' ? 'Planes' : 'Suscripciones'}
          </button>
        ))}
      </div>

      {tab === 'plans' ? <PlansTab /> : <SubscriptionsTab />}
    </div>
  )
}

function PlansTab() {
  const qc = useQueryClient()
  const { isSuperAdmin } = useAdmin()
  const [modal, setModal] = useState<{ open: boolean; plan?: Plan }>({ open: false })

  // Plans are company-wide now — every admin sees the same catalogue,
  // superadmin-only to edit.
  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este plan?')) return
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) {
      alert('No se pudo eliminar el plan — probablemente todavía tiene suscripciones activas.')
      return
    }
    qc.invalidateQueries({ queryKey: ['admin-plans'] })
    qc.invalidateQueries({ queryKey: ['plans'] })
  }

  return (
    <>
      {/* Plans are company-wide now — only a superadmin creates/edits them. */}
      {isSuperAdmin ? (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setModal({ open: true })}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors">
            <Plus size={15} /> Nuevo plan
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Los planes del Club son globales y solo los gestiona el superadmin. Acá los ves en modo lectura.
        </p>
      )}

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !plans?.length ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay planes</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Precio</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Destacado</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
                {isSuperAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{p.emoji} {p.name}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{p.price ? formatPrice(p.price) : '—'}/mes</td>
                  <td className="px-4 py-3">{p.highlighted ? <StatusBadge status="active" /> : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.active ? 'active' : 'cancelled'} /></td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModal({ open: true, plan: p })} className="rounded p-1 text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="rounded p-1 text-[var(--color-muted)] hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PlanModal
        open={modal.open}
        plan={modal.plan}
        onClose={() => setModal({ open: false })}
        onSaved={() => {
          setModal({ open: false })
          qc.invalidateQueries({ queryKey: ['admin-plans'] })
          qc.invalidateQueries({ queryKey: ['plans'] })
        }}
      />
    </>
  )
}

function PlanModal({ open, plan, onClose, onSaved }: { open: boolean; plan?: Plan; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    emoji: plan?.emoji ?? '',
    price: plan?.price?.toString() ?? '',
    badge: plan?.badge ?? '',
    highlighted: plan?.highlighted ?? false,
    features: Array.isArray(plan?.features) ? (plan.features as string[]).join('\n') : '',
    image_url: plan?.image_url ?? '',
    active: plan?.active ?? true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name,
      emoji: form.emoji || null,
      price: form.price ? parseInt(form.price) : null,
      badge: form.badge || null,
      highlighted: form.highlighted,
      features: form.features ? form.features.split('\n').filter(Boolean) : null,
      image_url: form.image_url || null,
      active: form.active,
    }
    const { error } = plan?.id
      ? await supabase.from('plans').update(payload).eq('id', plan.id)
      : await supabase.from('plans').insert(payload)
    setLoading(false)
    if (!error) onSaved()
  }

  return (
    <Modal key={plan?.id ?? 'new'} open={open} onClose={onClose} title={plan ? 'Editar plan' : 'Nuevo plan'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre"><input required className={fieldClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          <FormField label="Emoji"><input className={fieldClass} value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🍷" /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Precio mensual (ARS)"><input type="number" min="0" className={fieldClass} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></FormField>
          <FormField label="Badge (ej: Más popular)"><input className={fieldClass} value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} /></FormField>
        </div>
        <FormField label="Beneficios (uno por línea)">
          <textarea rows={4} className={`${fieldClass} resize-none`} value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="2 botellas por mes&#10;Guía de maridaje&#10;..." />
        </FormField>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.highlighted} onChange={e => setForm(f => ({ ...f, highlighted: e.target.checked }))} className="h-4 w-4 rounded border-[var(--color-parchment)] accent-[var(--color-wine)]" />
            <span className="text-[var(--color-dark)]">Marcar como destacado</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-[var(--color-parchment)] accent-[var(--color-wine)]" />
            <span className="text-[var(--color-dark)]">Plan activo (visible en el sitio)</span>
          </label>
        </div>
        <FormField label="Imagen">
          <ImageUpload folder="plans/" value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} dimensions="800 × 600 px · ratio 4:3" />
        </FormField>
        <FormActions onCancel={onClose} loading={loading} label={plan ? 'Guardar cambios' : 'Crear plan'} />
      </form>
    </Modal>
  )
}

type SubscriptionRow = Subscription & {
  plan_name: string
  branch_name: string
  subscriber: string
  redeemed_this_month: boolean
}

function SubscriptionsTab() {
  const [statusFilter, setStatusFilter] = useState('all')
  const { branchId, isSuperAdmin } = useAdmin()
  const period = currentPeriod()
  const monthLabel = periodLabel(period)

  const { data, isLoading } = useQuery<SubscriptionRow[]>({
    queryKey: ['admin-subscriptions', statusFilter, branchId, period],
    queryFn: async () => {
      let q = supabase
        .from('subscriptions')
        .select('*, plans(name), branches(name), club_redemptions(period)')
        .order('created_at', { ascending: false })
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((s: any) => ({
        ...s,
        plan_name: s.plans?.name ?? '—',
        branch_name: s.branches?.name ?? '—',
        subscriber: s.name || s.email || '—',
        redeemed_this_month: (s.club_redemptions ?? []).some((r: { period: string }) => r.period === period),
      }))
    },
  })

  // Retiro only makes sense for active memberships — a cancelled/paused sub
  // isn't "pending pickup", so it's excluded from both the badge and the tally.
  const activeCount = (data ?? []).filter((s) => s.status === 'active').length
  const redeemedCount = (data ?? []).filter((s) => s.status === 'active' && s.redeemed_this_month).length

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--color-parchment)] bg-white px-3 text-sm text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-wine)]">
          <option value="all">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="paused">Pausada</option>
          <option value="cancelled">Cancelada</option>
          <option value="pending">Pendiente</option>
        </select>
        {!isLoading && data && data.length > 0 && (
          <p className="text-sm text-[var(--color-muted)]">
            <span className="font-medium text-[var(--color-dark)]">{activeCount}</span> suscriptor{activeCount === 1 ? '' : 'es'} activo{activeCount === 1 ? '' : 's'} · retiro de {monthLabel}:{' '}
            <span className="font-medium text-emerald-700">{redeemedCount}</span> de {activeCount}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-parchment)] bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !data?.length ? (
          <p className="p-8 text-center text-sm text-[var(--color-muted)]">No hay suscripciones</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-parchment)] bg-[var(--color-cream)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Suscriptor</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Plan</th>
                {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Sucursal</th>}
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Precio</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Inicio</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted)]">
                  Retiro {monthLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-parchment)]">
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--color-cream)]/50">
                  <td className="px-4 py-3 text-[var(--color-dark)]">{s.subscriber}</td>
                  <td className="px-4 py-3 font-medium text-[var(--color-dark)]">{s.plan_name}</td>
                  {isSuperAdmin && <td className="px-4 py-3 text-[var(--color-dark-muted)]">{s.branch_name}</td>}
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{s.monthly_price ? formatPrice(s.monthly_price) : '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-dark-muted)]">{s.start_date ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3"><RedemptionBadge active={s.status === 'active'} redeemed={s.redeemed_this_month} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// Pickup state for the current month. Only active memberships get a
// pending/done badge — everything else is "—" (no pickup is expected).
function RedemptionBadge({ active, redeemed }: { active: boolean; redeemed: boolean }) {
  if (!active) return <span className="text-[var(--color-muted)]">—</span>
  return redeemed ? (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Retirado</span>
  ) : (
    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Pendiente</span>
  )
}
