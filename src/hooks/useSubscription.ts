import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export type SubscriptionParams = {
  planId: string
  mpPlanId: string
  planName: string
  price: number
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

      const { data, error: fnError } = await supabase.functions.invoke('create-mp-subscription', {
        body: { mpPlanId: params.mpPlanId },
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
      }))
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return { subscribe, loading, error }
}
