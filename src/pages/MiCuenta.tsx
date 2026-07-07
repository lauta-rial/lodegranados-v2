import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, BookOpen, Wine, User, Check, Clock, QrCode, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useBranches } from '@/hooks/useBranches'
import { useMySubscriptions } from '@/hooks/useMySubscriptions'
import { ClubQr } from '@/components/ClubQr'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatPrice, currentPeriod, periodLabel } from '@/lib/utils'
import { Link } from 'react-router-dom'

const field =
  'w-full rounded-lg border border-[var(--color-parchment)] bg-white px-3 py-2.5 text-sm text-[var(--color-dark)] placeholder-[var(--color-muted)] focus:border-[var(--color-wine)] focus:outline-none focus:ring-1 focus:ring-[var(--color-wine)] transition-colors disabled:bg-[var(--color-cream)] disabled:text-[var(--color-muted)] disabled:cursor-not-allowed'

export function MiCuenta() {
  const { user } = useAuth()

  if (!user) return null

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  // `||`, not `??` — full_name/name can be an empty string (see
  // Navbar.tsx's identical fix), which isn't nullish, so `??` would keep
  // it instead of falling through.
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Usuario'

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="flex items-center gap-5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--color-parchment)]"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-wine)]/10">
            <User size={28} className="text-[var(--color-wine)]" />
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl font-light text-[var(--color-dark)]">{displayName}</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">{user.email}</p>
        </div>
      </div>

      <div className="mt-10 space-y-10">
        <ProfileForm user={user} />
        <SubscriptionSection userId={user.id} />
        <ReservationsSection userId={user.id} />
        <EnrollmentsSection userId={user.id} />
      </div>
    </div>
  )
}

function ProfileForm({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const meta = user.user_metadata ?? {}
  const [form, setForm] = useState({
    first_name: (meta.first_name as string) ?? (meta.full_name as string)?.split(' ')[0] ?? '',
    last_name: (meta.last_name as string) ?? (meta.full_name as string)?.split(' ').slice(1).join(' ') ?? '',
    phone: (meta.phone as string) ?? '',
    address: (meta.address as string) ?? '',
  })
  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
    }
  }

  async function save(updated = form) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')
    const full_name = `${updated.first_name} ${updated.last_name}`.trim()
    const { error } = await supabase.auth.updateUser({ data: { ...updated, full_name } })
    if (error) {
      setStatus('error')
    } else {
      setStatus('saved')
      timerRef.current = setTimeout(() => setStatus('idle'), 2000)
    }
  }

  function onBlur(key: keyof typeof form) {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      const updated = { ...form, [key]: e.target.value }
      setForm(updated)
      save(updated)
    }
  }

  const statusEl =
    status === 'saving' ? (
      <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
        <Loader2 size={12} className="animate-spin" /> Guardando…
      </span>
    ) : status === 'saved' ? (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <Check size={12} /> Guardado
      </span>
    ) : status === 'error' ? (
      <span className="text-xs text-red-500">Error al guardar</span>
    ) : null

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <User size={16} className="text-[var(--color-wine)]" />
          <h2 className="font-display text-xl text-[var(--color-dark)]">Mis datos</h2>
        </div>
        <div className="h-5">{statusEl}</div>
      </div>

      <div className="rounded-2xl border border-[var(--color-parchment)] bg-white p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Nombre
            </label>
            <input className={field} value={form.first_name} onChange={set('first_name')} onBlur={onBlur('first_name')} placeholder="Juan" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Apellido
            </label>
            <input className={field} value={form.last_name} onChange={set('last_name')} onBlur={onBlur('last_name')} placeholder="García" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Email
          </label>
          <input className={field} value={user.email ?? ''} disabled />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Teléfono
            </label>
            <input
              className={field}
              value={form.phone}
              onChange={set('phone')}
              onBlur={onBlur('phone')}
              placeholder="+54 9 261 000 0000"
              type="tel"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Dirección
            </label>
            <input
              className={field}
              value={form.address}
              onChange={set('address')}
              onBlur={onBlur('address')}
              placeholder="Av. San Martín 1234, Mendoza"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function SubscriptionSection({ userId }: { userId: string }) {
  const { data: subs, isLoading, isError } = useMySubscriptions(userId)
  const { data: branches } = useBranches()
  const slugForId = (id: string | null | undefined) =>
    branches?.find((b) => b.id === id)?.slug ?? ''
  const firstBranch = branches?.[0]

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Wine size={16} className="text-[var(--color-wine)]" />
        <h2 className="font-display text-xl text-[var(--color-dark)]">Club DeVinos</h2>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorState label="No pudimos cargar tu suscripción." />
      ) : subs && subs.length > 0 ? (
        <div className="space-y-3">
          {subs.map((sub) => (
            <SubscriptionCard key={sub.id} sub={sub} planHref={`/${slugForId(sub.branch_id)}/club/${sub.plan_id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          label="No tenés ninguna suscripción activa."
          link={firstBranch ? `/${firstBranch.slug}/club` : '/'}
          linkLabel="Ver planes del Club"
        />
      )}
    </section>
  )
}

function SubscriptionCard({
  sub,
  planHref,
}: {
  sub: import('@/hooks/useMySubscriptions').MySubscription
  planHref: string
}) {
  const [showQr, setShowQr] = useState(false)
  const plan = sub.plans
  const period = currentPeriod()
  const redeemedThisMonth = sub.club_redemptions.some((r) => r.period === period)
  const monthLabel = periodLabel(period)

  return (
    <div className="rounded-2xl border border-[var(--color-wine)]/20 bg-[var(--color-wine)]/5 overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <Link to={planHref} className="flex flex-1 min-w-0 items-center gap-3 hover:opacity-80 transition-opacity">
          {plan?.emoji && <span className="text-2xl">{plan.emoji}</span>}
          <div className="min-w-0">
            <p className="font-semibold text-[var(--color-dark)] truncate">{plan?.name ?? 'Plan activo'}</p>
            <p className="text-sm text-[var(--color-muted)]">
              {plan?.price ? `${formatPrice(plan.price)}/mes` : ''}
              {sub.start_date ? ` · desde ${formatDate(sub.start_date)}` : ''}
            </p>
          </div>
        </Link>
        <span className="ml-3 shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Activa
        </span>
      </div>

      {/* Monthly wines status + QR toggle */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-wine)]/10 px-5 py-3">
        {redeemedThisMonth ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Check size={13} /> Vinos de <span className="capitalize">{monthLabel}</span> retirados
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <Clock size={13} /> Vinos de <span className="capitalize">{monthLabel}</span> — pendientes
          </span>
        )}
        <button
          onClick={() => setShowQr((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-parchment)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-wine)] hover:bg-[var(--color-wine)]/5 transition-colors"
        >
          <QrCode size={13} /> {showQr ? 'Ocultar QR' : 'Ver QR'}
        </button>
      </div>

      {showQr && (
        <div className="border-t border-[var(--color-wine)]/10 bg-[var(--color-cream)] px-5 py-6">
          <ClubQr token={sub.redeem_token} redemptions={sub.club_redemptions} />
        </div>
      )}
    </div>
  )
}

// registrations absorbed enrollments — a cata reservation and a curso
// enrollment are both rows here, distinguished only by their event's kind.
// ReservationsSection/EnrollmentsSection used to each run their own
// near-identical query (same table, same user_id filter, mostly-overlapping
// columns) purely to end up filtering client-side by kind anyway. One
// shared query — same queryKey in both call sites, so react-query dedupes
// it into a single request — and each section still derives its own shape.
function useMyRegistrationsRaw(userId: string) {
  return useQuery({
    queryKey: ['my-registrations-raw', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, events(title, date, time, location, instructor_name, branch_id, kind), tickets(token, validated_at)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

function ReservationsSection({ userId }: { userId: string }) {
  const { data: branches } = useBranches()
  const slugForId = (id: string | null | undefined) =>
    branches?.find((b) => b.id === id)?.slug ?? ''
  const firstBranch = branches?.[0]
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: raw, isLoading, isError } = useMyRegistrationsRaw(userId)
  // registrations now also holds curso enrollments (kind='curso') — those
  // are shown separately below, in "Mis cursos".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (raw ?? [])
    .filter((r: any) => r.events?.kind !== 'curso')
    .map((r: any) => ({
      ...r,
      event_title: r.events?.title ?? '—',
      event_date: r.events?.date,
      event_time: r.events?.time,
      event_location: r.events?.location,
      event_branch_id: r.events?.branch_id,
      tickets: (r.tickets ?? []) as { token: string; validated_at: string | null }[],
    }))

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={16} className="text-[var(--color-wine)]" />
        <h2 className="font-display text-xl text-[var(--color-dark)]">Mis catas</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : isError ? (
        <ErrorState label="No pudimos cargar tus reservas." />
      ) : !data?.length ? (
        <EmptyState label="No tenés reservas todavía." link={firstBranch ? `/${firstBranch.slug}/catas` : '/'} linkLabel="Ver próximas catas" />
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[var(--color-parchment)] bg-white overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <Link to={`/${slugForId(r.event_branch_id)}/catas/${r.event_id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                  <p className="font-medium text-[var(--color-dark)] truncate">{r.event_title}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)] capitalize">
                    {r.event_date ? formatDate(r.event_date) : '—'}
                    {r.event_time ? ` · ${r.event_time.slice(0, 5)} hs` : ''}
                  </p>
                  {r.event_location && <p className="text-xs text-[var(--color-muted)]">{r.event_location}</p>}
                </Link>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <AttendanceBadge attended={r.attended} />
                  {r.tickets.length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-parchment)] px-2.5 py-1 text-xs font-medium text-[var(--color-wine)] hover:bg-[var(--color-wine)]/5 transition-colors"
                    >
                      QR {expandedId === r.id ? '▲' : '▼'}
                    </button>
                  )}
                </div>
              </div>

              {expandedId === r.id && r.tickets.length > 0 && (
                <div className="border-t border-[var(--color-parchment)] bg-[var(--color-cream)] px-4 py-5">
                  <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    {r.tickets.length > 1 ? `${r.tickets.length} entradas` : 'Tu entrada'} — mostrá este QR en el ingreso
                  </p>
                  <div className={`flex flex-wrap justify-center gap-6`}>
                    {r.tickets.map((ticket: { token: string; validated_at: string | null }, i: number) => (
                      <div key={ticket.token} className="flex flex-col items-center gap-2">
                        {r.tickets.length > 1 && (
                          <span className="text-xs font-semibold text-[var(--color-wine)]">Entrada {i + 1}</span>
                        )}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${ticket.token}&bgcolor=ffffff&color=6b2737&margin=8`}
                          alt={`QR entrada ${i + 1}`}
                          width={180}
                          height={180}
                          className="rounded-xl border border-[var(--color-parchment)]"
                        />
                        {ticket.validated_at ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            Validada
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--color-cream-dark)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted)]">
                            Pendiente
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function EnrollmentsSection({ userId }: { userId: string }) {
  const { data: branches } = useBranches()
  const slugForId = (id: string | null | undefined) =>
    branches?.find((b) => b.id === id)?.slug ?? ''
  const firstBranch = branches?.[0]

  const { data: raw, isLoading, isError } = useMyRegistrationsRaw(userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (raw ?? [])
    .filter((r: any) => r.events?.kind === 'curso')
    .map((r: any) => ({
      ...r,
      course_id: r.event_id,
      course_title: r.events?.title ?? '—',
      course_date: r.events?.date,
      instructor: r.events?.instructor_name,
      course_branch_id: r.events?.branch_id,
    }))

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={16} className="text-[var(--color-wine)]" />
        <h2 className="font-display text-xl text-[var(--color-dark)]">Mis cursos</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : isError ? (
        <ErrorState label="No pudimos cargar tus cursos." />
      ) : !data?.length ? (
        <EmptyState label="No estás inscripto en ningún curso." link={firstBranch ? `/${firstBranch.slug}/cursos` : '/'} linkLabel="Ver cursos disponibles" />
      ) : (
        <div className="space-y-3">
          {data.map((e) => (
            <Link key={e.id} to={`/${slugForId(e.course_branch_id)}/cursos/${e.course_id}`} className="flex items-center justify-between rounded-2xl border border-[var(--color-parchment)] bg-white p-4 hover:border-[var(--color-wine)]/30 hover:shadow-sm transition-all">
              <div>
                <p className="font-medium text-[var(--color-dark)]">{e.course_title}</p>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {e.instructor ? `con ${e.instructor}` : ''}
                  {e.course_date ? ` · inicio ${formatDate(e.course_date)}` : ''}
                </p>
              </div>
              <StatusBadge status={e.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

function AttendanceBadge({ attended }: { attended: boolean | null }) {
  if (attended === null)
    return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Pendiente</span>
  return attended ? (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Asistí</span>
  ) : (
    <span className="rounded-full bg-[var(--color-cream-dark)] px-3 py-1 text-xs font-medium text-[var(--color-muted)]">Confirmada</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    enrolled:  { label: 'Inscripto',  cls: 'bg-blue-50 text-blue-700' },
    completed: { label: 'Completado', cls: 'bg-emerald-50 text-emerald-700' },
    dropped:   { label: 'Abandonado', cls: 'bg-red-50 text-red-700' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-[var(--color-cream-dark)] text-[var(--color-muted)]' }
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function EmptyState({ label, link, linkLabel }: { label: string; link: string; linkLabel: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-parchment)] bg-[var(--color-cream-dark)] p-6 text-center">
      <p className="text-sm text-[var(--color-dark-muted)]">{label}</p>
      <Link
        to={link}
        className="mt-3 inline-flex h-9 items-center rounded-full bg-[var(--color-wine)] px-5 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
      >
        {linkLabel}
      </Link>
    </div>
  )
}

function ErrorState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
      <p className="text-sm text-red-700">{label}</p>
    </div>
  )
}
