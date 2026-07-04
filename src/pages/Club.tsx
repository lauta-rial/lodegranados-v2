import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import { usePlans } from '@/hooks/usePlans'
import { useBranch } from '@/context/BranchContext'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { CheckoutModal } from '@/components/CheckoutModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatPrice, getWhatsAppUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types/database'

export function Club() {
  const branch = useBranch()
  const { data: plans, isLoading, error } = usePlans(branch?.id)
  const waUrl = getWhatsAppUrl(branch?.phone)

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Membresía
        </p>
        <h1 className="mt-3 font-display text-5xl font-light text-[var(--color-dark)]">
          Club DeVinos
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[var(--color-dark-muted)]">
          Recibí vinos seleccionados por nuestro sommelier directamente en tu puerta, cada mes.
          Elegí el plan que va con tu estilo.
        </p>
      </div>

      {/* Plans */}
      <div className="mt-16">
        {isLoading && <PlansLoading />}
        {error && <PlansError />}
        {!isLoading && !error && plans?.length === 0 && <PlansEmpty />}
        {!isLoading && !error && plans && plans.length > 0 && (
          <div className="mx-auto max-w-3xl grid grid-cols-1 gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} branchSlug={branch?.slug ?? ''} />
            ))}
          </div>
        )}
      </div>

      {/* FAQ strip */}
      <div className="mt-24 rounded-2xl bg-[var(--color-cream-dark)] p-10 text-center">
        <p className="font-display text-2xl text-[var(--color-dark)]">
          ¿Tenés dudas sobre el club?
        </p>
        <p className="mt-3 text-[var(--color-dark-muted)]">
          Escribinos por WhatsApp y te respondemos en minutos.
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
        >
          Hablar por WhatsApp
        </a>
      </div>
    </div>
  )
}

function PlanCard({ plan, branchSlug }: { plan: Plan; branchSlug: string }) {
  const features = Array.isArray(plan.features) ? (plan.features as string[]) : []
  const { user } = useAuth()
  const { subscribe, loading, error: subscribeError } = useSubscription()
  const [modalOpen, setModalOpen] = useState(false)
  const [noPlanError, setNoPlanError] = useState<string | null>(null)
  const error = subscribeError ?? noPlanError

  function handleSuscribir() {
    if (!plan.mp_plan_id) {
      setNoPlanError('Este plan no está disponible para suscripción en este momento.')
      return
    }
    if (user) {
      subscribe({ planId: plan.id, mpPlanId: plan.mp_plan_id, planName: plan.name, price: plan.price ?? 0 })
    } else {
      setModalOpen(true)
    }
  }

  function handleModalConfirm(name: string, email: string) {
    if (!plan.mp_plan_id) {
      setNoPlanError('Este plan no está disponible para suscripción en este momento.')
      return
    }
    subscribe({ planId: plan.id, mpPlanId: plan.mp_plan_id, planName: plan.name, price: plan.price ?? 0, payerName: name, payerEmail: email })
  }

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col rounded-2xl border p-8 transition-shadow',
          plan.highlighted
            ? 'border-[var(--color-wine)] bg-[var(--color-wine)] text-white shadow-xl shadow-[var(--color-wine)]/20'
            : 'border-[var(--color-parchment)] bg-white hover:shadow-md',
        )}
      >
        {plan.badge && (
          <div
            className={cn(
              'absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold',
              plan.highlighted
                ? 'bg-white text-[var(--color-wine)]'
                : 'bg-[var(--color-wine)] text-white',
            )}
          >
            {plan.badge}
          </div>
        )}

        {plan.image_url && (
          <div className="-mx-8 -mt-8 mb-6 h-36 overflow-hidden rounded-t-2xl">
            <img src={plan.image_url} alt={plan.name} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-3">
          {plan.emoji && <span className="text-3xl">{plan.emoji}</span>}
          <h3
            className={cn(
              'font-display text-2xl font-semibold',
              plan.highlighted ? 'text-white' : 'text-[var(--color-dark)]',
            )}
          >
            {plan.name}
          </h3>
        </div>

        {plan.price != null && (
          <div className="mt-6">
            <span
              className={cn(
                'font-display text-4xl font-semibold',
                plan.highlighted ? 'text-white' : 'text-[var(--color-wine)]',
              )}
            >
              {formatPrice(plan.price)}
            </span>
            <span
              className={cn(
                'ml-1 text-sm',
                plan.highlighted ? 'text-white/70' : 'text-[var(--color-muted)]',
              )}
            >
              / mes
            </span>
          </div>
        )}

        {features.length > 0 && (
          <ul className="mt-8 flex-1 space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check
                  size={16}
                  className={cn(
                    'mt-0.5 shrink-0',
                    plan.highlighted ? 'text-white/70' : 'text-[var(--color-wine)]',
                  )}
                />
                <span
                  className={cn(
                    'text-sm',
                    plan.highlighted ? 'text-white/90' : 'text-[var(--color-dark-muted)]',
                  )}
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={handleSuscribir}
            disabled={loading}
            className={cn(
              'h-11 w-full rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              plan.highlighted
                ? 'bg-white text-[var(--color-wine)] hover:bg-white/90'
                : 'bg-[var(--color-wine)] text-white hover:bg-[var(--color-wine-dark)]',
            )}
          >
            {loading ? 'Redirigiendo…' : `Suscribirme al ${plan.name}`}
          </button>
          <Link
            to={`/${branchSlug}/club/${plan.id}`}
            className={cn(
              'flex items-center justify-center gap-1 text-xs transition-colors',
              plan.highlighted ? 'text-white/70 hover:text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-dark)]',
            )}
          >
            Ver detalles <ArrowRight size={11} />
          </Link>
        </div>

        {error && (
          <p className={cn('mt-2 text-xs', plan.highlighted ? 'text-white/80' : 'text-red-600')}>
            {error}
          </p>
        )}
      </div>

      <CheckoutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        title={plan.name}
        price={plan.price}
        loading={loading}
        error={error}
      />
    </>
  )
}

function PlansLoading() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--color-parchment)] p-8 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <Skeleton className="h-11 w-full mt-4" />
        </div>
      ))}
    </div>
  )
}

function PlansError() {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-12 text-center">
      <p className="font-display text-xl text-red-800">No pudimos cargar los planes</p>
      <p className="mt-2 text-sm text-red-600">Por favor, intentá de nuevo más tarde.</p>
    </div>
  )
}

function PlansEmpty() {
  return (
    <div className="rounded-2xl border border-[var(--color-parchment)] bg-[var(--color-cream-dark)] p-16 text-center">
      <p className="font-display text-2xl text-[var(--color-dark)]">
        Los planes del club estarán disponibles pronto
      </p>
    </div>
  )
}
