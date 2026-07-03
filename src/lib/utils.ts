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

export function formatDate(dateStr: string) {
  // dateStr is a plain calendar date (no time-of-day/timezone) — it means
  // "this day", full stop. new Date(dateStr) anchors it to UTC midnight of
  // the right day, so formatting in UTC preserves that day exactly. Using a
  // real timezone here (e.g. America/Argentina/Buenos_Aires) shifts UTC
  // midnight back to 21:00 the PREVIOUS day, showing the wrong date/weekday.
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dateStr))
}
