import { Check, Clock } from 'lucide-react'
import { currentPeriod, periodLabel } from '@/lib/utils'
import type { ClubRedemption } from '@/hooks/useMySubscriptions'

// The member-facing Club QR. The payload is `club:<token>` — the prefix keeps
// it from ever matching an event ticket if someone points the cata scanner at
// it (ticket tokens are looked up by exact string). Below the code we show
// whether this calendar month's wines have already been picked up.
export function ClubQr({
  token,
  redemptions,
  size = 200,
}: {
  token: string
  redemptions: ClubRedemption[]
  size?: number
}) {
  const period = currentPeriod()
  const redeemed = redemptions.some((r) => r.period === period)
  const label = periodLabel(period)

  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=club:${token}&bgcolor=ffffff&color=6b2737&margin=8`}
        alt="QR de tu suscripción al Club"
        width={size}
        height={size}
        className="rounded-xl border border-[var(--color-parchment)] bg-white"
      />
      <p className="max-w-xs text-center text-xs text-[var(--color-muted)]">
        Mostrá este QR en la vinoteca para retirar los vinos de <span className="capitalize">{label}</span>.
      </p>
      {redeemed ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Check size={13} /> Vinos de <span className="capitalize">{label}</span> retirados
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Clock size={13} /> Pendiente de retiro
        </span>
      )}
    </div>
  )
}
