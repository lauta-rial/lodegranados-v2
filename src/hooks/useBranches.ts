import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Branch } from '@/types/database'

export function useBranches() {
  return useQuery<Pick<Branch, 'id' | 'slug'>[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, slug')
      return data ?? []
    },
    staleTime: Infinity,
  })
}
