import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/database'

export function useEvents(branchId?: string) {
  return useQuery<Event[]>({
    queryKey: ['events', branchId],
    queryFn: async () => {
      let q = supabase.from('events').select('*').eq('active', true).eq('kind', 'cata')
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q.order('date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useEvent(id: string) {
  return useQuery<Event>({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('kind', 'cata')
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
