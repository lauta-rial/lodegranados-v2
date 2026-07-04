import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/database'

// Shared by this file (kind='cata') and useCourses.ts (kind='curso') —
// catas and cursos are both rows in `events`, differing only by that
// column, so the query itself doesn't need two near-identical copies.
export function useEventsByKind(kind: 'cata' | 'curso', queryKeyPrefix: string, branchId?: string) {
  return useQuery<Event[]>({
    queryKey: [queryKeyPrefix, branchId],
    queryFn: async () => {
      let q = supabase.from('events').select('*').eq('active', true).eq('kind', kind)
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q.order('date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useEventByIdAndKind(kind: 'cata' | 'curso', queryKeyPrefix: string, id: string) {
  return useQuery<Event>({
    queryKey: [queryKeyPrefix, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('kind', kind)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useEvents(branchId?: string) {
  return useEventsByKind('cata', 'events', branchId)
}

export function useEvent(id: string) {
  return useEventByIdAndKind('cata', 'events', id)
}
