import { cn } from '@/lib/utils'

type Variant = 'wine' | 'terracotta' | 'neutral' | 'success'

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

const variantClasses: Record<Variant, string> = {
  wine: 'bg-[var(--color-wine)]/10 text-[var(--color-wine)] border-[var(--color-wine)]/20',
  terracotta: 'bg-[var(--color-terracotta)]/10 text-[var(--color-dark)] border-[var(--color-terracotta)]/30',
  neutral: 'bg-[var(--color-parchment)] text-[var(--color-dark-muted)] border-transparent',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
