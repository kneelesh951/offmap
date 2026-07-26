'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { readConsent, CONSENT_EVENT } from '@/lib/consent'

/**
 * Renders analytics ONLY after the user opts in to the "analytics" category.
 * Reacts live to consent changes (accept/reject in the banner) without a reload.
 *
 * This is the gating pattern for ANY non-essential tracker: gate it behind the
 * relevant consent category so no script/cookie loads before the user agrees.
 * (Note: Vercel Web Analytics is itself cookieless/privacy-first, but we still
 * gate it here as the safe default and to demonstrate the pattern for cookie-
 * based tools like Google Analytics or ad pixels.)
 */
export function AnalyticsGate() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false)

  useEffect(() => {
    const update = () => setAnalyticsAllowed(!!readConsent()?.analytics)
    update()
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  if (!analyticsAllowed) return null
  return <Analytics />
}
