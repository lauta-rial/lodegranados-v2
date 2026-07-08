import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export type SubscriptionParams = {
  planId: string
  planName: string
  price: number
  branchId: string
  payerName?: string
  payerEmail?: string
}

export function useSubscription() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  async function subscribe(params: SubscriptionParams) {
    setLoading(true)
    setError(null)
    try {
      const payerName = params.payerName ?? user?.user_metadata?.full_name ?? ''
      const payerEmail = params.payerEmail ?? user?.email ?? ''
      if (!payerEmail) throw new Error('Necesitamos un email para la suscripción')

      // The subscription is created per-user in MercadoPago (with an
      // external_reference carrying branch + plan), so the branch + payer + plan
      // travel through the recurring flow — see create-mp-subscription.
      const { data, error: fnError } = await supabase.functions.invoke('create-mp-subscription', {
        body: {
          planId: params.planId,
          branchId: params.branchId,
          payerEmail,
          siteUrl: window.location.origin,
        },
      })
      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.url) throw new Error('No se recibió URL de suscripción')

      sessionStorage.setItem('mp_checkout', JSON.stringify({
        type: 'plan',
        title: params.planName,
        price: params.price,
        payerName,
        payerEmail,
        branchId: params.branchId,
        branchSlug: window.location.pathname.split('/')[1],
      }))
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return { subscribe, loading, error }
}
