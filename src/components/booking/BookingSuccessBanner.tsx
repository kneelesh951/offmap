'use client'
import { useState, useEffect } from 'react'

const DISMISS_MS = 7000

export function BookingSuccessBanner({ hostName }: { hostName?: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Clean the URL silently — no re-render, no server round-trip
    window.history.replaceState({}, '', '/dashboard')
    const t = setTimeout(() => setVisible(false), DISMISS_MS)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed z-50 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:min-w-[440px] sm:max-w-[540px] rounded-2xl overflow-hidden"
      style={{
        top: '82px',
        background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(52,211,153,0.25)',
        animation: 'slide-down-toast 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Draining progress bar */}
      <div className="h-[3px]" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <div
          style={{
            height: '100%',
            width: '100%',
            background: 'linear-gradient(90deg, #34D399, #6EE7B7)',
            animation: `drain ${DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>

      <div className="flex items-start gap-4 px-5 py-4">
        {/* Animated checkmark */}
        <div
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full"
          style={{ background: 'rgba(52,211,153,0.18)', border: '1.5px solid rgba(52,211,153,0.40)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.5 9L7.5 13L14.5 5.5" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-[15px] leading-snug">
            Booking request sent!
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {hostName
              ? <><span className="text-white font-semibold">{hostName}</span> will confirm within 48 hours.</>
              : 'The host will confirm within 48 hours.'}
          </p>
          <p className="text-[12px] font-semibold mt-2" style={{ color: 'rgba(52,211,153,0.90)' }}>
            ↓ Your booking details are below
          </p>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 mt-0.5 text-white/40 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
