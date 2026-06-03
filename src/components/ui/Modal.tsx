'use client'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open) {
      d.showModal()
      document.body.style.overflow = 'hidden'
    } else {
      d.close()
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' }[size]

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 p-4 bg-transparent backdrop:bg-ink/60 backdrop:backdrop-blur-sm w-full max-w-none m-0"
      style={{ display: open ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className={cn('bg-white rounded-2xl shadow-xl border border-black/[0.08] w-full overflow-hidden', sizeClass, className)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08]">
            <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-sand hover:text-ink transition-colors">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  )
}
