import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, CameraOff } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatDate, formatPrice } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Event } from '@/types/database'

type EventStatus = 'not_started' | 'live' | 'ended'

function getEventStatus(event: Pick<Event, 'started_at' | 'ended_at'>): EventStatus {
  if (!event.started_at) return 'not_started'
  if (!event.ended_at) return 'live'
  return 'ended'
}

type TicketRow = {
  id: string
  token: string
  validated_at: string | null
  attendee_email: string | null
  registration_id: string
  created_at: string | null
  registrations: { name: string | null; email: string; spots: number | null } | null
}

type TicketWithPosition = TicketRow & { position: number; total: number }

// Same computation AdminScanner's onScan() does for a scanned ticket's
// siblings, applied to the whole roster instead of a single ticket.
function groupTickets(tickets: TicketRow[]): TicketWithPosition[] {
  const groups = new Map<string, TicketRow[]>()
  for (const t of tickets) {
    const arr = groups.get(t.registration_id) ?? []
    arr.push(t)
    groups.set(t.registration_id, arr)
  }
  return tickets.map((t) => {
    const siblings = groups.get(t.registration_id)!
    const idx = siblings.findIndex((s) => s.id === t.id)
    return { ...t, position: idx + 1, total: siblings.length }
  })
}

export function AdminEventLive() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: event } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', eventId!).single()
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  const { data: tickets, isLoading: ticketsLoading, isError: ticketsError } = useQuery<TicketRow[]>({
    queryKey: ['event-tickets', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, token, validated_at, attendee_email, registration_id, created_at, registrations(name, email, spots)')
        .eq('event_id', eventId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any as TicketRow[]
    },
    enabled: !!eventId,
  })

  const status: EventStatus = event ? getEventStatus(event) : 'not_started'
  const positioned = tickets ? groupTickets(tickets) : []
  const checkedIn = positioned.filter((t) => t.validated_at).length

  async function updateEvent(patch: { started_at?: string | null; ended_at?: string | null }) {
    if (!eventId) return
    await supabase.from('events').update(patch).eq('id', eventId)
    qc.invalidateQueries({ queryKey: ['event', eventId] })
  }

  function handleStart() {
    updateEvent({ started_at: new Date().toISOString() })
  }

  function handleEnd() {
    if (!confirm('¿Finalizar este evento? Podés reabrirlo después si hace falta.')) return
    updateEvent({ ended_at: new Date().toISOString() })
  }

  function handleReopen() {
    updateEvent({ ended_at: null })
  }

  function invalidateTickets() {
    qc.invalidateQueries({ queryKey: ['event-tickets', eventId] })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d]">
      <div className="flex items-center gap-3 px-4 py-4 bg-[#1a1a1a]">
        <button
          onClick={() => navigate('/admin/catas')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{event?.title ?? 'Cargando…'}</p>
          <div className="mt-1 flex items-center gap-2">
            <LiveStatusBadge status={status} />
            <span className="text-xs text-white/50">{checkedIn} / {positioned.length} ingresaron</span>
          </div>
        </div>
        <LifecycleButton status={status} onStart={handleStart} onEnd={handleEnd} onReopen={handleReopen} />
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {status === 'not_started' ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto">
            <EventSummaryCard event={event} />
            <RosterPanel tickets={positioned} isLoading={ticketsLoading} isError={ticketsError} eventId={eventId!} />
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 gap-4 overflow-hidden md:grid-cols-[380px_1fr]">
            {status === 'live' && (
              <TicketCameraPanel eventId={eventId!} onValidated={invalidateTickets} />
            )}
            <RosterPanel
              tickets={positioned}
              isLoading={ticketsLoading}
              isError={ticketsError}
              eventId={eventId!}
              className={status === 'ended' ? 'md:col-span-2' : ''}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function LiveStatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { label: string; className: string }> = {
    not_started: { label: 'SIN COMENZAR', className: 'bg-white/10 text-white/60' },
    live: { label: '● EN VIVO', className: 'bg-emerald-500/20 text-emerald-400' },
    ended: { label: 'FINALIZADO', className: 'bg-white/10 text-white/40' },
  }
  const { label, className } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${className}`}>
      {label}
    </span>
  )
}

function LifecycleButton({ status, onStart, onEnd, onReopen }: {
  status: EventStatus
  onStart: () => void
  onEnd: () => void
  onReopen: () => void
}) {
  if (status === 'not_started') {
    return (
      <button onClick={onStart} className="h-9 shrink-0 rounded-full bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600 transition-colors">
        Iniciar evento
      </button>
    )
  }
  if (status === 'live') {
    return (
      <button onClick={onEnd} className="h-9 shrink-0 rounded-full bg-red-500 px-4 text-sm font-medium text-white hover:bg-red-600 transition-colors">
        Finalizar evento
      </button>
    )
  }
  return (
    <button onClick={onReopen} className="h-9 shrink-0 rounded-full bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20 transition-colors">
      Reabrir evento
    </button>
  )
}

function EventSummaryCard({ event }: { event?: Event }) {
  if (!event) {
    return (
      <div className="space-y-2 rounded-2xl bg-[#1a1a1a] p-5">
        <Skeleton className="h-4 w-1/2 bg-white/10" />
        <Skeleton className="h-4 w-1/3 bg-white/10" />
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-[#1a1a1a] p-5 text-sm text-white/70">
      <p className="capitalize">{formatDate(event.date)} · {event.time?.slice(0, 5)}</p>
      <p className="mt-1">{event.location}</p>
      <p className="mt-1">{event.available_spots}/{event.total_spots} cupos disponibles{event.price ? ` · ${formatPrice(event.price)}` : ''}</p>
    </div>
  )
}

function RosterPanel({ tickets, isLoading, isError, eventId, className = '' }: {
  tickets: TicketWithPosition[]
  isLoading: boolean
  isError: boolean
  eventId: string
  className?: string
}) {
  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl bg-[#1a1a1a] ${className}`}>
      {isLoading ? (
        <div className="space-y-2 p-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/10" />)}
        </div>
      ) : isError ? (
        <p className="p-8 text-center text-sm text-red-400">No se pudo cargar la lista de inscriptos.</p>
      ) : !tickets.length ? (
        <p className="p-8 text-center text-sm text-white/50">Todavía no hay inscriptos para este evento.</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {tickets.map((t) => (
            <RosterRow key={t.id} ticket={t} eventId={eventId} />
          ))}
        </div>
      )}
    </div>
  )
}

function RosterRow({ ticket, eventId }: { ticket: TicketWithPosition; eventId: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
          Entrada {ticket.position}/{ticket.total}
        </p>
        {ticket.position === 1 ? (
          <p className="truncate text-sm text-white">
            {ticket.registrations?.name ?? '—'} <span className="text-white/50">· {ticket.registrations?.email ?? '—'}</span>
          </p>
        ) : (
          <AttendeeEmailCell ticket={ticket} eventId={eventId} />
        )}
      </div>
      <CheckInBadge validatedAt={ticket.validated_at} />
    </div>
  )
}

function AttendeeEmailCell({ ticket, eventId }: { ticket: TicketWithPosition; eventId: string }) {
  const qc = useQueryClient()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  if (ticket.attendee_email) {
    return <p className="truncate text-sm text-white">{ticket.attendee_email}</p>
  }

  async function save() {
    if (!value.trim()) return
    setSaving(true)
    await supabase.from('tickets').update({ attendee_email: value.trim() }).eq('id', ticket.id)
    setSaving(false)
    qc.invalidateQueries({ queryKey: ['event-tickets', eventId] })
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="mail@ejemplo.com"
        className="h-7 w-full min-w-0 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
      />
      <button
        onClick={save}
        disabled={saving || !value.trim()}
        className="h-7 shrink-0 rounded-md bg-white/10 px-2.5 text-xs font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-40"
      >
        Guardar
      </button>
    </div>
  )
}

function CheckInBadge({ validatedAt }: { validatedAt: string | null }) {
  if (!validatedAt) {
    return (
      <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/50">Pendiente</span>
    )
  }
  const time = new Date(validatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
      ✓ Ingresó {time}
    </span>
  )
}

type ScanResult =
  | { status: 'valid'; name: string; email: string; spots: number; ticketIndex: number; totalTickets: number }
  | { status: 'already_used'; validatedAt: string; name: string }
  | { status: 'invalid' }
  | null

function TicketCameraPanel({ eventId, onValidated }: { eventId: string; onValidated: () => void }) {
  const { user } = useAuth()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult>(null)
  const processingRef = useRef(false)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventIdRef = useRef(eventId)
  const userIdRef = useRef(user?.id)
  const onValidatedRef = useRef(onValidated)

  useEffect(() => {
    eventIdRef.current = eventId
  }, [eventId])

  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])

  useEffect(() => {
    onValidatedRef.current = onValidated
  }, [onValidated])

  useEffect(() => {
    const qr = new Html5Qrcode('qr-reader')
    scannerRef.current = qr

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScan,
      () => {},
    ).then(() => setScanning(true)).catch((err: Error) => {
      console.error('Camera error:', err)
      if (err?.name === 'NotAllowedError' || err?.message?.toLowerCase().includes('permission')) {
        setCameraError('Permiso de cámara denegado. Habilitá la cámara en la configuración del navegador.')
      } else {
        setCameraError('No se pudo iniciar la cámara. Verificá que tu dispositivo tenga una cámara disponible.')
      }
    })

    return () => {
      // .stop() throws synchronously (not just a rejected promise) when the
      // camera never actually started — e.g. no device/permission, which is
      // the normal case in headless test environments. Uncaught, this
      // crashes the unmount and breaks the rest of the page (the live→ended
      // transition unmounts this panel while the parent needs to keep
      // rendering "FINALIZADO").
      try {
        qr.stop().catch(() => {})
      } catch {
        // nothing to stop
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onScan(token: string) {
    if (processingRef.current) return
    processingRef.current = true

    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*, registrations(name, email, spots)')
        .eq('token', token)
        .eq('event_id', eventIdRef.current!)
        .maybeSingle()

      if (error || !ticket) {
        setResult({ status: 'invalid' })
      } else if (ticket.validated_at) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reg = (ticket as any).registrations
        setResult({
          status: 'already_used',
          validatedAt: ticket.validated_at,
          name: reg?.name ?? '—',
        })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reg = (ticket as any).registrations

        // .is('validated_at', null) makes this an atomic claim: if two scans
        // race for the same token, only the one whose UPDATE lands first
        // actually matches a row — the loser's `updated` comes back empty
        // instead of both showing "INGRESO VÁLIDO".
        const { data: updated } = await supabase
          .from('tickets')
          .update({ validated_at: new Date().toISOString(), validated_by: userIdRef.current ?? null })
          .eq('token', token)
          .is('validated_at', null)
          .select('id')

        if (!updated || updated.length === 0) {
          const { data: latest } = await supabase
            .from('tickets')
            .select('validated_at')
            .eq('token', token)
            .maybeSingle()
          setResult({
            status: 'already_used',
            validatedAt: latest?.validated_at ?? new Date().toISOString(),
            name: reg?.name ?? '—',
          })
        } else {
          const { data: siblings } = await supabase
            .from('tickets')
            .select('id, created_at')
            .eq('registration_id', ticket.registration_id)
            .order('created_at', { ascending: true })

          const idx = (siblings ?? []).findIndex((s: { id: string }) => s.id === ticket.id)

          setResult({
            status: 'valid',
            name: reg?.name ?? '—',
            email: reg?.email ?? '—',
            spots: reg?.spots ?? 1,
            ticketIndex: idx + 1,
            totalTickets: siblings?.length ?? 1,
          })
          onValidatedRef.current()
        }
      }
    } catch {
      setResult({ status: 'invalid' })
    }

    if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
    resultTimerRef.current = setTimeout(() => {
      setResult(null)
      processingRef.current = false
    }, 4000)
  }

  return (
    <div className="flex flex-col items-center justify-center overflow-y-auto rounded-2xl bg-[#1a1a1a] p-4">
      {cameraError ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
            <CameraOff size={36} className="text-red-400" />
          </div>
          <p className="text-sm text-white/70 max-w-xs">{cameraError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 h-10 rounded-full bg-white/10 px-5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-xs">
          <div
            id="qr-reader"
            className="w-full overflow-hidden rounded-2xl"
            style={{ aspectRatio: '1' }}
          />
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
              <p className="text-sm text-white/70">Iniciando cámara…</p>
            </div>
          )}
          {scanning && !result && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-xl border-2 border-white/60" />
            </div>
          )}
        </div>
      )}

      {result && (
        <div className={`mt-6 w-full max-w-xs rounded-2xl p-5 text-center ${
          result.status === 'valid'
            ? 'bg-emerald-500'
            : result.status === 'already_used'
            ? 'bg-amber-500'
            : 'bg-red-500'
        }`}>
          {result.status === 'valid' && (
            <>
              <CheckCircle size={36} className="mx-auto text-white" />
              <p className="mt-2 text-lg font-bold text-white">INGRESO VÁLIDO</p>
              <p className="mt-1 text-sm text-white/90 font-medium">{result.name}</p>
              {result.totalTickets > 1 && (
                <p className="mt-0.5 text-xs text-white/75">
                  Entrada {result.ticketIndex} de {result.totalTickets}
                </p>
              )}
            </>
          )}
          {result.status === 'already_used' && (
            <>
              <AlertCircle size={36} className="mx-auto text-white" />
              <p className="mt-2 text-lg font-bold text-white">YA FUE VALIDADO</p>
              <p className="mt-1 text-sm text-white/90">{result.name}</p>
              <p className="mt-0.5 text-xs text-white/75">
                {new Date(result.validatedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </>
          )}
          {result.status === 'invalid' && (
            <>
              <XCircle size={36} className="mx-auto text-white" />
              <p className="mt-2 text-lg font-bold text-white">QR INVÁLIDO</p>
              <p className="mt-1 text-sm text-white/75">No corresponde a este evento</p>
            </>
          )}
        </div>
      )}

      {!result && scanning && !cameraError && (
        <p className="mt-6 text-sm text-white/40">Apuntá la cámara al QR de la entrada</p>
      )}
    </div>
  )
}
