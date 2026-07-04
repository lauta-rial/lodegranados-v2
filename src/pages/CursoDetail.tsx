import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CalendarDays, Clock, Users, BookOpen, ArrowLeft, Check } from 'lucide-react'
import { useCourse } from '@/hooks/useCourses'
import { useBranch } from '@/context/BranchContext'
import { useAuth } from '@/context/AuthContext'
import { useCheckout } from '@/hooks/useCheckout'
import { CheckoutModal } from '@/components/CheckoutModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatPrice } from '@/lib/utils'

export function CursoDetail() {
  const { id } = useParams<{ id: string }>()
  const branch = useBranch()
  const { data: course, isLoading, error } = useCourse(id ?? '')
  const { user } = useAuth()
  const { checkout, loading: checkoutLoading, error: checkoutError } = useCheckout()
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) return <Loading />
  if (error || !course) return <ErrorState />

  const soldOut = course.available_spots === 0
  const syllabus = Array.isArray(course.syllabus) ? (course.syllabus as string[]) : []

  function handleInscribir() {
    if (!course) return
    if (user) {
      checkout({ type: 'course', id: course.id, title: course.title, price: course.price ?? 0 })
    } else {
      setModalOpen(true)
    }
  }

  function handleModalConfirm(name: string, email: string) {
    if (!course) return
    checkout({ type: 'course', id: course.id, title: course.title, price: course.price ?? 0, payerName: name, payerEmail: email })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        to={`/${branch?.slug ?? ''}/cursos`}
        className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-dark)] transition-colors"
      >
        <ArrowLeft size={14} /> Volver a cursos
      </Link>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Curso · {course.total_classes} clases
          </p>
          <h1 className="mt-3 font-display text-4xl font-light text-[var(--color-dark)] sm:text-5xl">
            {course.title}
          </h1>
          <p className="mt-2 text-[var(--color-dark-muted)]">
            Dictado por <strong>{course.instructor_name}</strong>
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-sm text-[var(--color-dark-muted)]">
              <CalendarDays size={15} className="text-[var(--color-wine)]" />
              <div>
                <p className="font-medium text-[var(--color-dark)]">Inicio</p>
                <p className="capitalize">{formatDate(course.date)}</p>
              </div>
            </div>
            {course.schedule && (
              <div className="flex items-center gap-3 text-sm text-[var(--color-dark-muted)]">
                <Clock size={15} className="text-[var(--color-wine)]" />
                <div>
                  <p className="font-medium text-[var(--color-dark)]">Horario</p>
                  <p>{course.schedule}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-[var(--color-dark-muted)]">
              <BookOpen size={15} className="text-[var(--color-wine)]" />
              <div>
                <p className="font-medium text-[var(--color-dark)]">Duración</p>
                <p>{course.total_classes} clases</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--color-dark-muted)]">
              <Users size={15} className="text-[var(--color-wine)]" />
              <div>
                <p className="font-medium text-[var(--color-dark)]">Lugares</p>
                <p>{course.available_spots} disponibles</p>
              </div>
            </div>
          </div>

          {course.description && (
            <div className="mt-10">
              <h2 className="font-display text-2xl text-[var(--color-dark)]">Descripción</h2>
              <p className="mt-3 leading-relaxed text-[var(--color-dark-muted)]">{course.description}</p>
            </div>
          )}

          {syllabus.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-2xl text-[var(--color-dark)]">Programa</h2>
              <ul className="mt-4 space-y-2">
                {syllabus.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-wine)]" />
                    <span className="text-[var(--color-dark-muted)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.instructor_bio && (
            <div className="mt-10">
              <h2 className="font-display text-2xl text-[var(--color-dark)]">El instructor</h2>
              <p className="mt-3 leading-relaxed text-[var(--color-dark-muted)]">{course.instructor_bio}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-[var(--color-parchment)] bg-white p-6 shadow-sm">
            {course.price != null && (
              <p className="font-display text-4xl font-semibold text-[var(--color-wine)]">
                {formatPrice(course.price)}
              </p>
            )}
            <p className="mt-1 text-sm text-[var(--color-muted)]">pago único</p>

            <button
              onClick={handleInscribir}
              disabled={soldOut || checkoutLoading}
              className="mt-6 h-12 w-full rounded-full bg-[var(--color-wine)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)] disabled:bg-[var(--color-parchment)] disabled:text-[var(--color-muted)] disabled:cursor-not-allowed"
            >
              {soldOut ? 'Sin lugares disponibles' : checkoutLoading ? 'Redirigiendo…' : 'Inscribirme'}
            </button>

            {checkoutError && (
              <p className="mt-2 text-xs text-red-600">{checkoutError}</p>
            )}

            <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
              Pago seguro vía MercadoPago
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {!soldOut && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-parchment)] bg-white/95 backdrop-blur-sm px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            {course.price != null && (
              <p className="font-display text-xl font-semibold text-[var(--color-wine)]">
                {formatPrice(course.price)}
              </p>
            )}
            <button
              onClick={handleInscribir}
              disabled={checkoutLoading}
              className="h-11 rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white disabled:opacity-60"
            >
              {checkoutLoading ? 'Redirigiendo…' : 'Inscribirme'}
            </button>
          </div>
        </div>
      )}

      <CheckoutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        title={course.title}
        price={course.price}
        loading={checkoutLoading}
        error={checkoutError}
      />
    </div>
  )
}

function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-4">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-5 w-1/3" />
      <div className="grid grid-cols-2 gap-4 pt-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  )
}

function ErrorState() {
  const branch = useBranch()
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
      <p className="font-display text-2xl text-[var(--color-dark)]">No encontramos este curso</p>
      <Link to={`/${branch?.slug ?? ''}/cursos`} className="mt-4 inline-flex items-center gap-2 text-[var(--color-wine)]">
        <ArrowLeft size={14} /> Ver todos los cursos
      </Link>
    </div>
  )
}
