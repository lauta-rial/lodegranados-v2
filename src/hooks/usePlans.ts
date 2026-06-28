import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Plan } from '@/types/database'

export function usePlans(branchId?: string) {
  return useQuery<Plan[]>({
    queryKey: ['plans', branchId],
    queryFn: async () => {
      let q = supabase.from('plans').select('*').eq('active', true)
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q.order('price', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
