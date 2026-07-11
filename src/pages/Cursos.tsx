import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Users, ArrowRight } from 'lucide-react'
import { useCourses } from '@/hooks/useCourses'
import { useBranch } from '@/context/BranchContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatPrice } from '@/lib/utils'
import { defaultImageFor } from '@/lib/defaultImages'
import type { Event } from '@/types/database'

export function Cursos() {
  const branch = useBranch()
  const { data: courses, isLoading, error } = useCourses(branch?.id)

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Formación
        </p>
        <h1 className="mt-3 font-display text-5xl font-light text-[var(--color-dark)]">
          Cursos de Vino
        </h1>
        <p className="mt-4 max-w-xl text-[var(--color-dark-muted)]">
          Desde introducción al análisis sensorial hasta formación profesional en sommelier. Dictados por expertos.
        </p>
      </div>

      {isLoading && <CursosLoading />}
      {error && <CursosError />}
      {!isLoading && !error && courses?.length === 0 && <CursosEmpty />}
      {!isLoading && !error && courses && courses.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {courses.map((course, i) => (
            <CourseCard key={course.id} course={course} branchSlug={branch?.slug ?? ''} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course, branchSlug, index }: { course: Event; branchSlug: string; index: number }) {
  const soldOut = course.available_spots === 0

  return (
    <Link
      to={`/${branchSlug}/cursos/${course.id}`}
      className="group flex overflow-hidden rounded-2xl border border-[var(--color-parchment)] bg-white transition-shadow hover:shadow-lg"
    >
      {/* Image */}
      <div
        className="w-40 shrink-0"
        style={{ background: 'linear-gradient(160deg, #c4956a 0%, #8b5e3c 100%)' }}
      >
        <img
          src={course.image_url || defaultImageFor('curso', course.id, index)}
          alt={course.title}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-[var(--color-dark)]">
              {course.title}
            </h3>
            {soldOut && <Badge variant="neutral">Sin lugares</Badge>}
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Por {course.instructor_name}
          </p>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)]">
              <CalendarDays size={13} className="text-[var(--color-wine)]" />
              <span className="capitalize">Inicio: {formatDate(course.date)}</span>
            </div>
            {course.schedule && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)]">
                <Clock size={13} className="text-[var(--color-wine)]" />
                <span>{course.schedule}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-[var(--color-dark-muted)]">
              <Users size={13} className="text-[var(--color-wine)]" />
              <span>{course.available_spots} lugares disponibles</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          {course.price != null ? (
            <p className="font-display text-xl font-semibold text-[var(--color-wine)]">
              {formatPrice(course.price)}
            </p>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-wine)] transition-transform group-hover:translate-x-0.5">
            Ver más <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  )
}

function CursosLoading() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex overflow-hidden rounded-2xl border border-[var(--color-parchment)]">
          <Skeleton className="w-40 rounded-none min-h-40" />
          <div className="flex-1 p-6 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CursosError() {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-12 text-center">
      <p className="font-display text-xl text-red-800">No pudimos cargar los cursos</p>
      <p className="mt-2 text-sm text-red-600">Por favor, intentá de nuevo más tarde.</p>
    </div>
  )
}

function CursosEmpty() {
  return (
    <div className="rounded-2xl border border-[var(--color-parchment)] bg-[var(--color-cream-dark)] p-16 text-center">
      <p className="font-display text-2xl text-[var(--color-dark)]">
        No hay cursos disponibles por ahora
      </p>
      <p className="mt-3 text-[var(--color-muted)]">
        Suscribite al newsletter para enterarte de los próximos cursos.
      </p>
    </div>
  )
}
