import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export type CheckoutParams = {
  type: 'event' | 'course' | 'plan'
  id: string
  title: string
  price: number
  payerName?: string
  payerEmail?: string
}

export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  async function checkout(params: CheckoutParams) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-mp-preference', {
        body: {
          type: params.type,
          id: params.id,
          title: params.title,
          price: params.price,
          quantity: 1,
          payerName: params.payerName ?? user?.user_metadata?.full_name ?? '',
          payerEmail: params.payerEmail ?? user?.email ?? '',
          siteUrl: window.location.origin,
        },
      })
      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)
      if (!data?.url) throw new Error('No se recibió URL de pago')
      sessionStorage.setItem('mp_checkout', JSON.stringify({
        type: params.type,
        title: params.title,
        price: params.price,
        payerName: params.payerName ?? user?.user_metadata?.full_name ?? '',
        payerEmail: params.payerEmail ?? user?.email ?? '',
      }))
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  return { checkout, loading, error }
}
