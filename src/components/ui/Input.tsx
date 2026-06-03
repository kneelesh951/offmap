import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-terra uppercase tracking-widest mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 rounded-xl border bg-cream text-ink text-sm transition-colors',
            'focus:outline-none focus:ring-1',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-black/[0.12] focus:border-terra focus:ring-terra/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        {hint && !error && <p className="text-ink-muted text-xs mt-1">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
