import { fieldClass } from '@/components/admin/AdminFormField'

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const MINUTES = ['00', '30']

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
  const [hour = '', minute = ''] = value ? value.split(':') : []

  function update(nextHour: string, nextMinute: string) {
    onChange(nextHour && nextMinute ? `${nextHour}:${nextMinute}` : '')
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        required={required}
        className={fieldClass}
        value={hour}
        onChange={e => update(e.target.value, minute || '00')}
      >
        <option value="" disabled>Hora</option>
        {HOURS.map(h => <option key={h} value={h}>{h} hs</option>)}
      </select>
      <select
        required={required}
        className={fieldClass}
        value={minute}
        onChange={e => update(hour, e.target.value)}
      >
        <option value="" disabled>Min</option>
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}
