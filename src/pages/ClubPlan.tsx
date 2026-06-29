import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/context/BranchContext'
import { useAuth } from '@/context/AuthContext'
import { useCheckout } from '@/hooks/useCheckout'
import { CheckoutModal } from '@/components/CheckoutModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types/database'

export function ClubPlan() {
  const { id } = useParams<{ id: string }>()
  const branch = useBranch()
  const { user } = useAuth()
  const { checkout, loading: checkoutLoading, error: checkoutError } = useCheckout()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: plan, isLoading, error } = useQuery<Plan>({
    queryKey: ['plan', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  if (isLoading) return <PlanLoading />
  if (error || !plan) return <PlanError />

  const features = Array.isArray(plan.features) ? (plan.features as string[]) : []
  const clubUrl = `/${branch?.slug ?? ''}/club`

  function handleSuscribir() {
    if (user) {
      checkout({ type: 'plan', id: plan!.id, title: plan!.name, price: plan!.price ?? 0 })
    } else {
      setModalOpen(true)
    }
  }

  function handleModalConfirm(name: string, email: string) {
    checkout({ type: 'plan', id: plan!.id, title: plan!.name, price: plan!.price ?? 0, payerName: name, payerEmail: email })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        to={clubUrl}
        className="mb-10 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors"
      >
        <ArrowLeft size={14} /> Volver al Club
      </Link>

      {plan.image_url && (
        <div className="mb-10 h-52 w-full overflow-hidden rounded-2xl">
          <img src={plan.image_url} alt={plan.name} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
        {/* Left — plan info */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-4">
            {plan.emoji && <span className="text-5xl">{plan.emoji}</span>}
            <div>
              {plan.badge && (
                <span className="mb-1 inline-block rounded-full bg-[var(--color-wine)] px-3 py-0.5 text-xs font-semibold text-white">
                  {plan.badge}
                </span>
              )}
              <h1 className="font-display text-4xl font-light text-[var(--color-dark)] sm:text-5xl">
                {plan.name}
              </h1>
            </div>
          </div>

          {plan.price != null && (
            <div className="mt-6">
              <span className="font-display text-5xl font-semibold text-[var(--color-wine)]">
                {formatPrice(plan.price)}
              </span>
              <span className="ml-2 text-[var(--color-muted)]">/ mes</span>
            </div>
          )}

          {features.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-2xl text-[var(--color-dark)]">Qué incluye</h2>
              <ul className="mt-6 space-y-4">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-wine)]/10">
                      <Check size={12} className="text-[var(--color-wine)]" />
                    </div>
                    <span className="text-[var(--color-dark-muted)]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-12 rounded-2xl bg-[var(--color-cream-dark)] p-6">
            <p className="font-display text-lg text-[var(--color-dark)]">¿Cómo funciona?</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-dark-muted)]">
              <li>1. Elegís tu plan y completás el pago</li>
              <li>2. Nuestro sommelier selecciona los vinos del mes</li>
              <li>3. Recibís el envío en tu puerta antes del día 10</li>
              <li>4. Podés pausar o cancelar cuando quieras</li>
            </ul>
          </div>
        </div>

        {/* Right — CTA sticky */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-[var(--color-parchment)] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {plan.emoji && <span className="text-2xl">{plan.emoji}</span>}
              <div>
                <p className="font-semibold text-[var(--color-dark)]">{plan.name}</p>
                {plan.price != null && (
                  <p className="text-sm text-[var(--color-muted)]">{formatPrice(plan.price)}/mes</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSuscribir}
              disabled={checkoutLoading}
              className={cn(
                'mt-6 h-12 w-full rounded-full text-sm font-medium transition-colors',
                'bg-[var(--color-wine)] text-white hover:bg-[var(--color-wine-dark)]',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {checkoutLoading ? 'Redirigiendo…' : `Suscribirme al ${plan.name}`}
            </button>

            {checkoutError && (
              <p className="mt-2 text-xs text-red-600">{checkoutError}</p>
            )}

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
              <ShieldCheck size={13} />
              Pago seguro · Cancelá cuando quieras
            </div>

            <Link
              to={clubUrl}
              className="mt-4 block text-center text-xs text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors"
            >
              Ver todos los planes
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-parchment)] bg-white/95 backdrop-blur-sm px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          {plan.price != null && (
            <div>
              <p className="font-display text-lg font-semibold text-[var(--color-wine)]">{formatPrice(plan.price)}</p>
              <p className="text-xs text-[var(--color-muted)]">por mes</p>
            </div>
          )}
          <button
            onClick={handleSuscribir}
            disabled={checkoutLoading}
            className="h-11 rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white disabled:opacity-60"
          >
            {checkoutLoading ? 'Redirigiendo…' : 'Suscribirme'}
          </button>
        </div>
      </div>

      <CheckoutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        title={plan.name}
        price={plan.price}
        loading={checkoutLoading}
        error={checkoutError}
      />
    </div>
  )
}

function PlanLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-6">
      <Skeleton className="h-5 w-28" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Skeleton className="h-10 w-36" />
      <div className="space-y-3 pt-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    </div>
  )
}

function PlanError() {
  const branch = useBranch()
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
      <p className="font-display text-2xl text-[var(--color-dark)]">No encontramos este plan</p>
      <Link to={`/${branch?.slug ?? ''}/club`} className="mt-4 inline-flex items-center gap-2 text-[var(--color-wine)]">
        <ArrowLeft size={14} /> Ver todos los planes
      </Link>
    </div>
  )
}
