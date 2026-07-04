import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price)
}

// Real Pichincha number — used whenever we don't know (or can't reach) the
// visitor's branch. Club.tsx/Empresas.tsx/Faq.tsx/PagoFallido.tsx/
// PagoPendiente.tsx each used to inline this fallback independently, and
// three of them still had the original placeholder (5493410000000, which
// never corresponded to a real number) months after the other two were
// fixed — a duplicated literal silently drifting out of sync. One place now.
const FALLBACK_WHATSAPP_NUMBER = '5493417478993'

export function getWhatsAppUrl(phone: string | null | undefined) {
  const digits = phone ? phone.replace(/\D/g, '') : FALLBACK_WHATSAPP_NUMBER
  return `https://wa.me/${digits}`
}

// PagoExitoso/PagoFallido/PagoPendiente each stash the checkout's
// title/price/branchSlug/etc here before redirecting to MercadoPago, since
// none of that survives the round trip through MP's own pages otherwise.
export function getMpCheckout(): Record<string, unknown> | null {
  try {
    return JSON.parse(sessionStorage.getItem('mp_checkout') ?? 'null')
  } catch {
    return null
  }
}

// For plain calendar dates (no time-of-day/timezone — events.date,
// courses.start_date, etc.) — they mean "this day", full stop. new
// Date(dateStr) anchors a date-only string to UTC midnight of the right day,
// so formatting in UTC preserves that day exactly. Using a real timezone
// here (e.g. America/Argentina/Buenos_Aires) shifts UTC midnight back to
// 21:00 the PREVIOUS day, showing the wrong date/weekday.
export function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dateStr))
}

// For real timestamps (timestamptz columns like inquiries.created_at) — the
// opposite reasoning applies: these are a genuine instant, so they DO need
// converting to Argentina local time to show the right day/weekday to a
// viewer here. Do not use this for date-only columns (see formatDate above).
export function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(timestamp))
}
