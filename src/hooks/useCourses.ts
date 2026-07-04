import { useEventsByKind, useEventByIdAndKind } from './useEvents'

// Cursos are `events` rows with kind='curso' — see useEvents.ts for the
// shared query logic, this only supplies the kind/queryKey.
export function useCourses(branchId?: string) {
  return useEventsByKind('curso', 'courses', branchId)
}

export function useCourse(id: string) {
  return useEventByIdAndKind('curso', 'courses', id)
}
