'use client'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, X } from 'lucide-react'
import { AlmaChat } from './AlmaChat'

export function AlmaButton() {
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleOpen = () => {
    setOpen(true)
    setHasOpened(true)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          open ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        style={{
          background: 'linear-gradient(135deg, #0C7B7B, #063B3B)',
          boxShadow: '0 4px 20px rgba(12,123,123,0.35), 0 8px 32px rgba(0,0,0,0.15)',
        }}
        aria-label="Open Alma AI assistant"
      >
        <Sparkles size={24} className="text-white" />
        {/* Pulse ring on first visit */}
        {!hasOpened && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(12,123,123,0.25)', animationDuration: '2s' }}
          />
        )}
      </button>

      {/* Tooltip */}
      {!open && !hasOpened && (
        <div
          className="fixed bottom-[88px] right-6 z-50 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white whitespace-nowrap pointer-events-none animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, #0C7B7B, #063B3B)',
            boxShadow: '0 4px 12px rgba(12,123,123,0.25)',
          }}
        >
          Ask Alma
          <div
            className="absolute -bottom-1 right-5 w-2 h-2 rotate-45"
            style={{ background: '#063B3B' }}
          />
        </div>
      )}

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: 'rgba(6,59,59,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat drawer */}
      <div
        ref={drawerRef}
        className={`fixed z-50 transition-all duration-300 ease-out ${
          open
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          /* Mobile: full screen */
          bottom: 0, right: 0, left: 0, top: 0,
        }}
      >
        {/* Desktop override */}
        <div
          className="h-full md:absolute md:bottom-6 md:right-6 md:left-auto md:top-auto md:w-[400px] md:h-[600px] md:rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: '#FDFAF6',
            boxShadow: '0 16px 48px rgba(0,0,0,0.20), 0 4px 12px rgba(12,123,123,0.10)',
            border: '1px solid rgba(12,123,123,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #0C7B7B, #063B3B)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">Alma</h3>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  AI Travel Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/15"
              aria-label="Close chat"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-hidden">
            <AlmaChat />
          </div>
        </div>
      </div>
    </>
  )
}
