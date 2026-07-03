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
