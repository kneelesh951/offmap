'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { readConsent, writeConsent, OPEN_PREFERENCES_EVENT } from '@/lib/consent'

const GREEN = '#084E4E'
const TERRA = '#E8621A'

/**
 * GDPR / TTDSG-compliant cookie consent banner.
 * - Shows only until the user makes a choice (or when re-opened via footer link).
 * - "Accept all" and "Reject all" are equally prominent (required).
 * - "Customize" gives granular per-category opt-in (analytics / marketing).
 * - Necessary cookies are always on and cannot be toggled (they're exempt).
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    // Show the banner if no valid choice is stored yet.
    if (!readConsent()) setVisible(true)

    // Allow a footer "Cookie settings" link to re-open the panel.
    const reopen = () => {
      const current = readConsent()
      setAnalytics(!!current?.analytics)
      setMarketing(!!current?.marketing)
      setCustomizing(true)
      setVisible(true)
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, reopen)
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, reopen)
  }, [])

  if (!visible) return null

  const save = (choice: { analytics: boolean; marketing: boolean }) => {
    writeConsent(choice)
    setVisible(false)
    setCustomizing(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl bg-white p-5 sm:p-6"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid rgba(8,78,78,0.10)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>🍪</span>
          <div className="flex-1">
            <h2 className="font-serif text-lg font-bold" style={{ color: GREEN }}>
              We value your privacy
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: '#4A6B6B' }}>
              We use strictly necessary cookies to keep you signed in and the site secure.
              With your consent we&apos;d also like to use analytics and marketing cookies to
              improve Offmap. You can accept, reject, or choose per category. See our{' '}
              <Link href="/privacy" className="font-semibold underline" style={{ color: TERRA }}>
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {customizing && (
          <div className="mt-4 space-y-2.5">
            <ConsentRow
              title="Strictly necessary"
              desc="Required for login, security and core functionality. Always on."
              checked
              disabled
            />
            <ConsentRow
              title="Analytics"
              desc="Helps us understand how the site is used so we can improve it."
              checked={analytics}
              onChange={setAnalytics}
            />
            <ConsentRow
              title="Marketing"
              desc="Lets us measure campaigns and show relevant ads (e.g. social pixels)."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!customizing ? (
            <button
              onClick={() => setCustomizing(true)}
              className="rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-black/5"
              style={{ color: GREEN, border: '1px solid rgba(8,78,78,0.20)' }}
            >
              Customize
            </button>
          ) : (
            <button
              onClick={() => save({ analytics, marketing })}
              className="rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-black/5"
              style={{ color: GREEN, border: '1px solid rgba(8,78,78,0.20)' }}
            >
              Save choices
            </button>
          )}
          <button
            onClick={() => save({ analytics: false, marketing: false })}
            className="rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-black/5"
            style={{ color: GREEN, border: '1px solid rgba(8,78,78,0.20)' }}
          >
            Reject all
          </button>
          <button
            onClick={() => save({ analytics: true, marketing: true })}
            className="rounded-full px-6 py-2.5 text-[13.5px] font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${TERRA}, #D4540F)`, boxShadow: '0 6px 20px rgba(232,98,26,0.35)' }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}

function ConsentRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-xl p-3"
      style={{ background: '#F7FAF8', border: '1px solid rgba(8,78,78,0.08)', cursor: disabled ? 'default' : 'pointer' }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-shrink-0"
        style={{ accentColor: GREEN }}
      />
      <span>
        <span className="block text-[13.5px] font-bold" style={{ color: GREEN }}>
          {title}
          {disabled && <span className="ml-2 text-[11px] font-medium" style={{ color: '#9CA89F' }}>Always on</span>}
        </span>
        <span className="block text-[12.5px] leading-relaxed" style={{ color: '#6B8F7B' }}>{desc}</span>
      </span>
    </label>
  )
}
