# Multilingual (i18n) Plan — Language Switcher

_Last updated: 2026-07 · Plan for adding multi-language support with a header
language dropdown._

## TL;DR — how complicated is this?

**The library/plumbing is easy (~1 day). The real work is extracting hundreds of
hardcoded strings from the UI — that's 80% of the effort and it's mechanical, not
hard.**

Current state that drives the estimate:
- **No i18n library or config exists** — greenfield setup.
- **All text is hardcoded in JSX** across **39 pages / 69 components** (e.g. a
  single content page like `how-it-works` has ~90+ text nodes, often inside
  `const` arrays).
- Nothing is wired for locale routing yet.

So this is not architecturally hard — it's a **volume** problem. The good news:
it can be done incrementally, page by page, without a big-bang rewrite, and the
language dropdown itself is trivial.

**Honest effort estimate (solo founder):**
| Scope | Effort |
|---|---|
| Library setup + routing + dropdown + 1 page proven end-to-end | ~1 day |
| Extract + translate all marketing/static pages | ~3–5 days |
| Extract app/product pages (dashboard, search, chat, settings) | ~3–5 days |
| Legal pages (terms/privacy/impressum) — needs careful/pro translation | ~1–2 days + review |
| **Total for full 2-language (EN + DE) coverage** | **~2 weeks part-time** |

Note: CLAUDE.md currently lists "multi-language platform" as explicitly *not*
Phase 0. This plan is here for when that changes — most likely DE first, since
the launch market is Germany.

---

## Recommended stack

**Library: [`next-intl`](https://next-intl-docs.vercel.app/)** — the best fit for
Next.js 14 App Router. Native App Router support, server + client components,
type-safe message keys, good DX. (Alternatives: `next-i18next` is Pages-Router
oriented; `react-intl`/`lingui` are lower-level. `next-intl` is the clear pick.)

**Routing strategy: locale URL prefix** — `/en/...`, `/de/...`, with `/` →
default locale. Chosen because:
- **SEO**: each language gets its own indexable URLs — important for the planned
  city-guide / marketing content. A cookie-only approach hides translations from
  search engines.
- Clean shareable links per language.
- Trade-off: touches routing + middleware (handled once, in setup).

**Default + first languages:** `en` (default) → add `de` first (launch market),
then expand (fr, es, it) as cities grow.

---

## What DOES and does NOT get translated

| Content type | Translated by i18n? | How |
|---|---|---|
| UI copy, labels, buttons, marketing pages | ✅ Yes | Message catalogs (`messages/en.json`, `messages/de.json`) |
| Legal pages (terms, privacy, impressum) | ✅ Yes | Separate careful/professional translation — legal accuracy matters |
| Emails (17 Resend templates) | ✅ Yes (later) | Locale-aware template selection; store user's locale |
| **User-generated content** (host bios, messages, reviews) | ❌ No | Out of scope for i18n. Optional future: on-demand translate button via an API (DeepL / Claude) — a separate feature |
| City/category names in DB | ⚠️ Partial | Add translated columns later if needed; English acceptable at first |

---

## Implementation phases

### Phase 1 — Foundation (~1 day)
1. `npm install next-intl`
2. Add locale config: supported locales `['en','de']`, default `en`.
3. Restructure App Router under a `[locale]` segment:
   `src/app/[locale]/...` (or use the next-intl plugin routing).
4. Add middleware for locale detection/negotiation (integrate with the existing
   `src/middleware.ts` — CSRF + rate-limit logic stays).
5. Create `messages/en.json` and `messages/de.json` (start near-empty).
6. Build the **language dropdown** (see below), place it in `Navbar`.
7. Prove the whole path end-to-end by translating **one** page (e.g.
   `how-it-works`). Once one page works, the rest is repetition.

### Phase 2 — Extract static / marketing pages (~3–5 days)
Go page by page: replace hardcoded strings with `t('key')` calls, move the
English text into `messages/en.json`. Pages: home, how-it-works, about, faq,
pricing, community, press, experiences, gift-cards, become-a-host,
host-guidelines, contact.

### Phase 3 — Translate to German (~2–3 days)
- Machine-translate the English catalog first pass (DeepL or Claude — DeepL is
  strong for DE).
- **Native/fluent review** before shipping — machine translation gets tone and
  idiom wrong, which hurts trust on a trust-based platform.
- Legal pages (terms/privacy/impressum): do NOT rely on machine translation —
  get these done carefully / professionally.

### Phase 4 — App/product pages (~3–5 days)
Dashboard, search, conversations/chat, settings, trips, wishlists, booking flow,
auth pages. Same extraction pattern.

### Phase 5 — Emails + persistence (later)
- Store each user's preferred `locale` (add nullable column to `users`).
- Send Resend emails in the user's locale.
- Persist dropdown choice in a cookie (+ user profile when logged in).

---

## The language dropdown (the part you asked about — trivial)

A small client component with a globe icon, placed in `Navbar`. It reads the
current locale and switches by navigating to the same path under the new locale
prefix. Sketch:

```tsx
'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'

const LOCALES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

export function LanguageSwitcher({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname() // e.g. /de/how-it-works

  const switchTo = (code: string) => {
    // swap the leading locale segment and navigate
    const rest = pathname.replace(/^\/(en|de)/, '') || '/'
    router.push(`/${code}${rest}`)
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
  }

  return (
    <div className="relative">
      <button aria-label="Change language" className="flex items-center gap-1">
        <Globe size={18} />
        {LOCALES.find(l => l.code === current)?.flag}
      </button>
      {/* dropdown list of LOCALES → onClick={() => switchTo(l.code)} */}
    </div>
  )
}
```

Styling/keyboard-nav mirrors the existing account dropdown already in `Navbar`.
The hard part is never the dropdown — it's the string extraction behind it.

---

## Key risks / gotchas
- **Restructuring routes under `[locale]`** touches every page's path and the
  middleware — do it once, carefully, early (Phase 1). Test protected-route
  redirects and the CSRF/rate-limit middleware still fire.
- **`generateStaticParams`** must enumerate locales for static pages to keep ISR.
- **Legal translation liability** — terms/privacy/impressum must be accurate in
  German (this is the launch market and legally binding). Don't ship
  machine-translated legal text.
- **Don't translate user content** — keep host bios/messages in their original
  language; offer an optional on-demand translate button much later.
- **Do the mock/dual-mode check** — nothing here conflicts with `MOCK_MODE`, but
  keep the language cookie logic working in both modes.

## Recommendation
Sequence it as: **prove one page in EN+DE end-to-end (1 day) → decide it feels
right → then grind the extraction page by page.** Don't start the big extraction
until the routing + dropdown + one page are working. German first; other
languages only as you expand into those cities.
