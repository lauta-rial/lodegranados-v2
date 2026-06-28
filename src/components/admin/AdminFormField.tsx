import type { ReactNode } from 'react'

export const fieldClass =
  'w-full rounded-lg border border-[var(--color-parchment)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-wine)] focus:outline-none focus:ring-1 focus:ring-[var(--color-wine)]/30 transition-colors'

export function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--color-dark)]">{label}</label>
      {children}
    </div>
  )
}

export function FormActions({
  onCancel,
  loading,
  label = 'Guardar',
}: {
  onCancel: () => void
  loading: boolean
  label?: string
}) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="h-9 rounded-lg px-4 text-sm font-medium text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] transition-colors"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={loading}
        className="h-9 rounded-lg bg-[var(--color-wine)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)] disabled:opacity-60"
      >
        {loading ? 'Guardando...' : label}
      </button>
    </div>
  )
}
