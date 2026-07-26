/**
 * Cookie consent state (GDPR / TTDSG § 25).
 *
 * Stored in a first-party cookie so it persists and could be read server-side.
 * `necessary` is always true (auth/session/security cookies are exempt from
 * consent). `analytics` and `marketing` are opt-in and default to false.
 *
 * Bump CONSENT_VERSION when the categories or third parties change — that
 * invalidates old consent and re-prompts the user (required when what you do
 * with their data changes).
 */

export const CONSENT_COOKIE = 'offmap_cookie_consent'
export const CONSENT_VERSION = 1

export interface ConsentState {
  necessary: true
  analytics: boolean
  marketing: boolean
  ts: number
  v: number
}

/** Read the stored consent, or null if the user hasn't chosen yet. */
export function readConsent(): ConsentState | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`))
  if (!match) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as ConsentState
    // Re-prompt if the consent schema/version changed.
    if (parsed.v !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

/** Persist the user's choice and notify listeners (analytics gate, etc.). */
export function writeConsent(choice: { analytics: boolean; marketing: boolean }): ConsentState {
  const value: ConsentState = {
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    ts: Date.now(),
    v: CONSENT_VERSION,
  }
  // 180-day lifetime — a common EU practice (consent should be re-asked periodically).
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offmap:consentchange', { detail: value }))
  }
  return value
}

/** Event name other components listen on to react to consent changes. */
export const CONSENT_EVENT = 'offmap:consentchange'
/** Event name to programmatically re-open the preferences panel (e.g. footer link). */
export const OPEN_PREFERENCES_EVENT = 'offmap:open-cookie-preferences'
