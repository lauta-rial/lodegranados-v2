import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, CameraOff } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import type { Event } from '@/types/database'

type ScanResult =
  | { status: 'valid'; name: string; email: string; spots: number; ticketIndex: number; totalTickets: number }
  | { status: 'already_used'; validatedAt: string; name: string }
  | { status: 'invalid' }
  | null

export function AdminScanner() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult>(null)
  const processingRef = useRef(false)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventIdRef = useRef(eventId)
  const userIdRef = useRef(user?.id)

  useEffect(() => {
    eventIdRef.current = eventId
  }, [eventId])

  useEffect(() => {
    userIdRef.current = user?.id
  }, [user?.id])

  const { data: event } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', eventId!).single()
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

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
      qr.stop().catch(() => {})
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
        await supabase
          .from('tickets')
          .update({ validated_at: new Date().toISOString(), validated_by: userIdRef.current ?? null })
          .eq('token', token)

        const { data: siblings } = await supabase
          .from('tickets')
          .select('id, created_at')
          .eq('registration_id', ticket.registration_id)
          .order('created_at', { ascending: true })

        const idx = (siblings ?? []).findIndex((s: { id: string }) => s.id === ticket.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reg = (ticket as any).registrations

        setResult({
          status: 'valid',
          name: reg?.name ?? '—',
          email: reg?.email ?? '—',
          spots: reg?.spots ?? 1,
          ticketIndex: idx + 1,
          totalTickets: siblings?.length ?? 1,
        })
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-[#1a1a1a]">
        <button
          onClick={() => navigate('/admin/catas')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">Validar entradas</p>
          <p className="truncate text-sm font-semibold text-white">{event?.title ?? 'Cargando…'}</p>
        </div>
      </div>

      {/* Camera */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
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

        {/* Result overlay */}
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
    </div>
  )
}
