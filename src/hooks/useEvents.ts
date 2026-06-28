import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/database'

export function useEvents() {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('active', true)
        .order('date', { ascending: true })
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
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
