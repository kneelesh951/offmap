# Cookie Consent & Analytics

_Last updated: 2026-07 · How the GDPR/TTDSG cookie consent system works and how to add analytics/trackers._

## Legal background (why this exists)
Under GDPR + the German **TTDSG § 25**, a site must get **explicit opt-in consent**
before storing **non-essential** cookies/trackers on a user's device.

| Cookie type | Consent needed? | Examples |
|---|---|---|
| Strictly necessary (auth, session, security) | ❌ No — exempt | `offmap_mock_session`, Supabase auth, CSRF |
| Non-essential (analytics, marketing) | ✅ Yes — opt-in | Google Analytics, Facebook/Instagram pixels |

German rules are strict: consent must be **opt-in** (nothing pre-checked),
**granular** (per category), **reject as easy as accept**, **withdrawable**, and
**logged/versioned**.

## What's implemented

| File | Role |
|---|---|
| `src/lib/consent.ts` | Consent state stored in a versioned first-party cookie `offmap_cookie_consent`. Read/write helpers + events. |
| `src/components/consent/CookieConsent.tsx` | The banner: Accept all / Reject all / Customize (granular). Necessary always-on. |
| `src/components/consent/AnalyticsGate.tsx` | Renders analytics **only** after the user opts into the `analytics` category. |
| `src/app/layout.tsx` | Mounts `<CookieConsent />` + `<AnalyticsGate />`. |
| `src/components/layout/Footer.tsx` | "Cookie settings" link — dispatches `OPEN_PREFERENCES_EVENT` to re-open the panel (withdraw/change consent). |

### Compliance checklist (all met)
- ✅ Necessary on; Analytics + Marketing default **off**
- ✅ Reject all is as prominent as Accept all
- ✅ Granular per-category opt-in via Customize
- ✅ No non-essential script loads before consent (gated in React, not just hidden)
- ✅ Consent is withdrawable anytime (footer link)
- ✅ Versioned (`CONSENT_VERSION`) — bump it to re-prompt everyone when trackers change

### Consent cookie shape
```json
{ "necessary": true, "analytics": false, "marketing": false, "ts": 1690000000000, "v": 1 }
```
Lifetime: 180 days. Bump `CONSENT_VERSION` in `src/lib/consent.ts` whenever you add
or change a category/third party — old consent is invalidated and users re-prompted.

## How to add analytics / trackers

### Vercel Analytics (already wired — just enable it)
1. `@vercel/analytics` is installed and gated behind `AnalyticsGate` (consent-aware).
2. Enable in **Vercel Dashboard → project → Analytics → Enable Web Analytics**.
3. Cookieless & privacy-first. Only runs after a visitor accepts the Analytics category.
4. Dashboard shows page views, top pages, referrers, countries, devices.

### Google Analytics 4 (cookie-based — needs consent)
Inject the `gtag` script only when `readConsent()?.analytics` is true — mirror the
`AnalyticsGate` pattern (listen for `CONSENT_EVENT`, mount script when allowed).
Get a `G-XXXX` measurement ID from a GA4 property.

### Marketing pixels (Facebook / Instagram — for ad campaigns)
Gate under the **Marketing** category (already in the banner) using the same
consent-gate pattern. Never load a pixel before marketing consent.

## The golden rule
> Any new tracker → gate it behind its consent category (`analytics` or `marketing`)
> so it never loads before the user agrees. Bump `CONSENT_VERSION` when you add one.
