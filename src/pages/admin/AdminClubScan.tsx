import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Wine, Check, Clock, X, RotateCcw, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { currentPeriod, periodLabel } from '@/lib/utils'

// Club redemption scanner (admin only — mounted under /admin, which AdminLayout
// already gates to admin/superadmin). A member's Club QR encodes `club:<token>`;
// we look up their subscription, show who they are and whether this month's
// wines are already picked up, and let the operator confirm the pickup. The
// DB's unique(subscription_id, period) is the real guard against a double
// pickup — the UI just makes the state legible before confirming.

type Scan =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'inactive'; name: string; planName: string; emoji: string | null }
  | { kind: 'redeemable'; subId: string; name: string; email: string; planName: string; emoji: string | null }
  | { kind: 'already'; name: string; planName: string; emoji: string | null }

export function AdminClubScan() {
  const { user } = useAuth()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scan, setScan] = useState<Scan | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  // Once a QR is read we hold on it until the operator taps "Escanear otro" —
  // no auto-loop, so a lingering QR in frame can't fire a redemption twice.
  const processingRef = useRef(false)
  const userIdRef = useRef(user?.id)

  useEffect(() => { userIdRef.current = user?.id }, [user?.id])

  useEffect(() => {
    const qr = new Html5Qrcode('club-qr-reader')
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
        setCameraError('No se pudo iniciar la cámara. Verificá que el dispositivo tenga una cámara disponible.')
      }
    })

    return () => {
      // .stop() can throw synchronously when the camera never started (no
      // device/permission, e.g. in tests) — same defensive guard as
      // AdminEventLive's panel.
      try {
        qr.stop().catch(() => {})
      } catch {
        // nothing to stop
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onScan(raw: string) {
    if (processingRef.current) return
    processingRef.current = true
    setConfirmError(null)
    setScan({ kind: 'loading' })

    // Payload is `club:<token>`; tolerate a bare token too.
    const token = raw.startsWith('club:') ? raw.slice(5) : raw

    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, status, name, email, plans(name, emoji), club_redemptions(period)')
      .eq('redeem_token', token)
      .maybeSingle()

    if (error || !data) {
      setScan({ kind: 'invalid' })
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any
    const planName = d.plans?.name ?? 'Plan'
    const emoji = d.plans?.emoji ?? null
    const name = d.name ?? d.email ?? 'Socio'

    if (d.status !== 'active') {
      setScan({ kind: 'inactive', name, planName, emoji })
      return
    }

    const period = currentPeriod()
    const already = (d.club_redemptions ?? []).some((r: { period: string }) => r.period === period)
    if (already) {
      setScan({ kind: 'already', name, planName, emoji })
    } else {
      setScan({ kind: 'redeemable', subId: d.id, name, email: d.email ?? '', planName, emoji })
    }
  }

  async function confirmRedeem() {
    if (scan?.kind !== 'redeemable') return
    setConfirming(true)
    setConfirmError(null)
    const { error } = await supabase.from('club_redemptions').insert({
      subscription_id: scan.subId,
      period: currentPeriod(),
      redeemed_by: userIdRef.current ?? null,
    })
    setConfirming(false)
    if (error) {
      // 23505 = unique(subscription_id, period): someone already redeemed this
      // month (a race, or a stale scan) — surface it as "already", not an error.
      if (error.code === '23505') {
        setScan({ kind: 'already', name: scan.name, planName: scan.planName, emoji: scan.emoji })
      } else {
        setConfirmError('No se pudo registrar el retiro. Reintentá.')
      }
      return
    }
    setScan({ kind: 'already', name: scan.name, planName: scan.planName, emoji: scan.emoji })
  }

  function scanNext() {
    processingRef.current = false
    setScan(null)
    setConfirmError(null)
  }

  const monthLabel = periodLabel(currentPeriod())

  return (
    <div className="min-h-full bg-[var(--color-cream)] p-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <Wine size={20} className="text-[var(--color-wine)]" />
          <div>
            <h1 className="font-display text-2xl text-[var(--color-dark)]">Escáner de canjes</h1>
            <p className="text-sm text-[var(--color-muted)]">Retiro de vinos del Club · {monthLabel}</p>
          </div>
        </div>

        {/* Camera */}
        <div className="overflow-hidden rounded-2xl border border-[var(--color-parchment)] bg-black">
          <div id="club-qr-reader" className="mx-auto w-full [&_video]:w-full [&_video]:rounded-2xl" />
        </div>

        {cameraError ? (
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{cameraError}</p>
        ) : !scanning ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--color-muted)]">
            <Loader2 size={14} className="animate-spin" /> Iniciando cámara…
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
            Apuntá al QR del socio para registrar el retiro.
          </p>
        )}

        {/* Result */}
        {scan && (
          <div className="mt-5 rounded-2xl border border-[var(--color-parchment)] bg-white p-6">
            {scan.kind === 'loading' ? (
              <p className="flex items-center justify-center gap-2 text-sm text-[var(--color-muted)]">
                <Loader2 size={16} className="animate-spin" /> Buscando suscripción…
              </p>
            ) : scan.kind === 'invalid' ? (
              <ResultBlock icon={<X className="text-red-600" />} title="QR no válido"
                subtitle="Este código no corresponde a ninguna suscripción del Club." tone="red" />
            ) : scan.kind === 'inactive' ? (
              <ResultBlock icon={<X className="text-red-600" />} title="Suscripción no activa"
                subtitle={`${scan.name} · ${scan.emoji ?? ''} ${scan.planName}. La membresía no está activa — no corresponde retiro.`} tone="red" />
            ) : scan.kind === 'already' ? (
              <ResultBlock icon={<Check className="text-emerald-600" />} title="Ya retiró este mes"
                subtitle={`${scan.name} · ${scan.emoji ?? ''} ${scan.planName}. Los vinos de ${monthLabel} ya fueron entregados.`} tone="emerald" />
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <Clock className="text-amber-600" />
                </div>
                <p className="font-semibold text-[var(--color-dark)]">{scan.name}</p>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {scan.emoji ? `${scan.emoji} ` : ''}{scan.planName}
                  {scan.email ? ` · ${scan.email}` : ''}
                </p>
                <p className="mt-3 text-sm text-[var(--color-dark-muted)]">
                  Retiro de vinos de <span className="capitalize font-medium">{monthLabel}</span> pendiente.
                </p>
                {confirmError && <p className="mt-3 text-xs text-red-600">{confirmError}</p>}
                <button
                  onClick={confirmRedeem}
                  disabled={confirming}
                  className="mt-4 h-11 w-full rounded-full bg-[var(--color-wine)] text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors disabled:opacity-60"
                >
                  {confirming ? 'Registrando…' : `Confirmar retiro de ${monthLabel}`}
                </button>
              </div>
            )}

            {scan.kind !== 'loading' && (
              <button
                onClick={scanNext}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-parchment)] py-2.5 text-sm font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream)] transition-colors"
              >
                <RotateCcw size={14} /> Escanear otro
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultBlock({
  icon,
  title,
  subtitle,
  tone,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  tone: 'red' | 'emerald'
}) {
  const bg = tone === 'red' ? 'bg-red-50' : 'bg-emerald-50'
  return (
    <div className="text-center">
      <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${bg}`}>{icon}</div>
      <p className="font-semibold text-[var(--color-dark)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
    </div>
  )
}
