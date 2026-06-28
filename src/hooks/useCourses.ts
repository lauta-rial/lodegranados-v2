import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Course } from '@/types/database'

export function useCourses(branchId?: string) {
  return useQuery<Course[]>({
    queryKey: ['courses', branchId],
    queryFn: async () => {
      let q = supabase.from('courses').select('*').eq('active', true)
      if (branchId) q = q.eq('branch_id', branchId)
      const { data, error } = await q.order('start_date', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useCourse(id: string) {
  return useQuery<Course>({
    queryKey: ['courses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
