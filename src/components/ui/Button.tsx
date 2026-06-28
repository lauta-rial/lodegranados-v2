import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--color-wine)] text-white hover:bg-[var(--color-wine-dark)] focus-visible:ring-[var(--color-wine)]',
  secondary:
    'bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-light)] focus-visible:ring-[var(--color-terracotta)]',
  ghost:
    'bg-transparent text-[var(--color-dark-muted)] hover:bg-[var(--color-cream-dark)] hover:text-[var(--color-dark)]',
  outline:
    'border border-[var(--color-wine)] text-[var(--color-wine)] hover:bg-[var(--color-wine)] hover:text-white',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-8 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
