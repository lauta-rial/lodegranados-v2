import { fieldClass } from '@/components/admin/AdminFormField'

// 07:00 through 23:30, plus 00:00 (midnight) as the closing slot.
const TIMES = [
  ...Array.from({ length: 34 }, (_, i) => {
    const totalMinutes = 7 * 60 + i * 30
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }),
  '00:00',
]

// Rounds a "HH:MM" (or "HH:MM:SS") string to the nearest 30-minute slot,
// for legacy times set before the picker was restricted to 00/30.
export function roundToHalfHour(time?: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const totalMinutes = Math.round((h * 60 + m) / 30) * 30
  const hour = Math.floor(totalMinutes / 60) % 24
  const minute = totalMinutes % 60
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export function TimePicker({
  value,
  onChange,
  required,
}: {
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <select
      required={required}
      className={fieldClass}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="" disabled>Hora</option>
      {TIMES.map(t => <option key={t} value={t}>{t} hs</option>)}
    </select>
  )
}
