import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const btn = cva(
  'inline-flex items-center justify-center font-serif font-bold tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary:   'bg-gradient-to-br from-terra to-[#F07830] text-white shadow-terra hover:shadow-terra-lg hover:-translate-y-0.5 active:translate-y-0 border border-white/10',
        secondary: 'bg-white border border-ink/[0.18] text-ink-mid hover:border-ink/40 hover:text-ink hover:-translate-y-0.5 shadow-[0_1px_4px_rgba(15,61,34,0.06)]',
        ghost:     'bg-transparent text-terra hover:bg-terra/8 active:bg-terra/12',
        sage:      'bg-sage text-white hover:bg-[#486040] hover:-translate-y-0.5 shadow-[0_2px_12px_rgba(90,115,80,0.28)]',
        danger:    'bg-red-600 text-white hover:bg-red-700 hover:-translate-y-0.5',
      },
      size: {
        sm:  'text-xs px-3.5 py-2 rounded-lg gap-1.5',
        md:  'text-[13px] px-5 py-2.5 rounded-xl gap-2',
        lg:  'text-[13px] px-7 py-3.5 rounded-full gap-2',
        xl:  'text-sm px-8 py-4 rounded-full gap-2.5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'lg' },
  }
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof btn> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button ref={ref} className={cn(btn({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
          </svg>
          <span>Loading…</span>
        </>
      ) : children}
    </button>
  )
)
Button.displayName = 'Button'
