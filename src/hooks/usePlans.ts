import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Plan } from '@/types/database'

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
