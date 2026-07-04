import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types/database'

// Cursos are `events` rows with kind='curso' (see docs/migration: catas and
// cursos were unified into one table) — this hook just adds that filter on
// top of the same table useEvents.ts reads.
export function useCourses(branchId?: string) {
  return useQuery<Event[]>({
    queryKey: ['courses', branchId],
    queryFn: async () => {
      let q = supabase.from('events').select('*').eq('active', true).eq('kind', 'curso')
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q.order('date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useCourse(id: string) {
  return useQuery<Event>({
    queryKey: ['courses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('kind', 'curso')
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
