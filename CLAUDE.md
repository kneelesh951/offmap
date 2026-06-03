# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Offmap

Peer-to-peer local experience connection platform. Travelers subscribe to unlock conversations with local hosts. Stack: Next.js 14 App Router · TypeScript · Supabase · Drizzle ORM · Stripe · Upstash Redis · Resend · Tailwind CSS.

## Commands

```bash
npm run dev          # Start dev server (mock mode by default)
npm run build        # Production build — catches TypeScript errors
npm run typecheck    # Type-check without building
npm run lint         # ESLint

npm run db:generate  # Generate Drizzle migration from schema changes
npm run db:migrate   # Apply migrations to Supabase
npm run db:studio    # Visual DB browser (requires real DB connection)
npx tsx drizzle/seed.ts  # Seed cities into database
```

For local Stripe webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Mock / Production Dual-Mode Architecture

The most important architectural concept in this repo. Every route and service has two code paths:

- **`MOCK_MODE=true`** (default in `.env.local`): runs entirely in memory — no Supabase, no Stripe, no Redis, no Resend. All external services are simulated in `src/lib/mock/`. Auth uses a `offmap_mock_session` cookie. Mock data lives in `src/lib/mock/data.ts` and resets on server restart.
- **`MOCK_MODE=false`**: uses all real services (Supabase auth + Drizzle DB, Stripe, Upstash Redis for rate limiting, Resend for email).

The single source of truth for which mode is active: `src/lib/mock/index.ts` exports `IS_MOCK`.

Every API route checks `process.env.MOCK_MODE === 'true'` and branches — real service imports are done lazily inside the branch so they don't fail when keys are absent in mock mode. The switch is entirely config-based; no code changes are needed to move between modes.

Demo accounts in mock mode: `traveler@demo.com` / `host@demo.com` (password: `demo1234`). Any email works in mock mode.

## Auth Architecture

Supabase Auth manages authentication (`auth.users`). The app maintains a parallel `users` table in `src/lib/db/schema.ts` that holds extended profile data (role, GDPR consent, verification status) linked by the same UUID. On registration, both records must be created.

- Server-side auth: `createSupabaseServerClient()` from `src/lib/supabase/server.ts`
- Browser auth: `src/lib/supabase/client.ts`
- Session refresh on every request: `src/lib/supabase/middleware.ts` (production only; skipped in mock mode)
- Protected routes: `/dashboard`, `/host-dashboard`, `/conversations`, `/settings` — enforced in `src/middleware.ts`

`createSupabaseAdminClient()` (uses the service role key, bypasses RLS) must only be used in trusted server contexts.

## Database Schema (Drizzle ORM)

All tables defined in `src/lib/db/schema.ts`. Key relationships:

- `users` ← one-to-one → `host_profiles` (a user can be a traveler or a host)
- `host_profiles` → `cities` (one city per host)
- `subscriptions` (Stripe subscription linked to a user) — checked on every protected interaction
- `conversations` created when a subscribed traveler unlocks a host (unique per traveler↔host pair, never hard-deleted)
- `messages` belong to a conversation (never hard-deleted — legal audit trail)
- `reviews` are bidirectional (travelers review hosts, hosts review travelers), one per direction per conversation
- `audit_logs` — GDPR requirement, tracks every significant data change

Monetary amounts are stored in cents (`hourlyRateCents`, `amountCents`) to avoid floating-point issues. Prices are in EUR.

New DB columns must be nullable first (zero-downtime migrations). All schema changes go through Drizzle — never edit Supabase schema manually.

## API Conventions

All API routes return `{ success: true, data: ... }` or `{ success: false, error: { code, message } }` — types defined in `src/types/index.ts` as `ApiSuccess<T>` and `ApiError`.

Input validation uses Zod schemas from `src/lib/validators/index.ts` — every route calls `.safeParse()` before any business logic. Auth routes are rate-limited via Upstash in production (handled in middleware, 100 req/60s sliding window per IP).

Stripe webhooks must always verify the signature using `verifyWebhookSignature()` from `src/lib/stripe/index.ts`. Webhook events to handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

## Subscription Plans

| Plan | Price |
|------|-------|
| Day | €6 |
| Week | €12 |
| Month | €18 |
| Annual | €49 |

Subscription status is cached in Upstash Redis and checked on every protected route interaction.

## Supabase Region

Must be Frankfurt (`eu-central-1`) for GDPR compliance.

## Key Rules

- Use `createSupabaseAdminClient()` only in trusted server contexts — never bypass RLS elsewhere
- All API input validated with Zod schemas from `src/lib/validators`
- Stripe webhooks must verify signature via `verifyWebhookSignature()`
- New DB columns must be nullable on creation (zero-downtime migrations)
- All DB changes via Drizzle — never edit Supabase schema manually

## Enterprise architecture principles

### Layer rules
- Layer 1 (Client): React/Next.js only. No direct DB calls. Calls API routes only.
- Layer 2 (Edge): Cloudflare WAF + Vercel edge. Static assets cached here.
- Layer 3 (API): Rate limit → JWT validate → Zod validate → subscription check → business logic.
- Layer 4 (Services): All business logic lives here. HostService, SearchService,
  SubscriptionService, MessageService. Never in route handlers directly.
- Layer 5 (Repository): All DB access via Drizzle ORM only. No raw SQL anywhere.
- Layer 6 (Data): PostgreSQL source of truth. Redis for cache. R2 for media.
- Layer 7 (External): Stripe, Resend, Mapbox — wrapped in /lib modules only.
  Never called directly from components or route handlers.

### Security architecture
- Defense in depth: Cloudflare WAF → rate limiting → JWT → Zod → RLS
- RLS enforced at DB level — even if API layer has a bug, users cannot see each other's data
- HttpOnly + SameSite=Strict cookies — XSS and CSRF both prevented
- JWT access tokens: 1hr TTL. Refresh tokens: 7 day TTL with rotation
- All auth endpoints: 5 attempts per 15 minutes per IP (already in middleware.ts)
- Stripe webhooks: always verify signature before processing any event
- File uploads: jpeg/png/webp only, 5MB max, virus scan before save, rename on upload
- Never log PII (email, name, IP) in server logs
- All secrets in environment variables only — never in code

### Latency targets (build with these in mind)
- Search results: under 200ms P95 — use Redis cache (2min TTL) before hitting DB
- Subscription check: under 10ms — always check Redis first (5min TTL)
- Host profile page: under 400ms — use Next.js ISR (60s TTL)
- Message send: under 150ms — DB write + Supabase Realtime broadcast
- Never call external APIs (Stripe, Resend) synchronously in the request path
  unless absolutely necessary. Use Inngest background jobs instead.

### Caching rules
- Host profiles: ISR at edge, 60s TTL, invalidate on profile update
- Search results: Redis, 2min TTL, key = hash of query params
- Subscription status: Redis, 5min TTL per user_id, invalidate on Stripe webhook
- Host photos: Cloudflare CDN, 1yr Cache-Control, immutable filenames
- City list: static JSON at build time, refresh on redeploy only

### Database rules
- All queries through Drizzle ORM — parameterised queries prevent SQL injection
- Every new column: nullable first, backfill, then add NOT NULL constraint (zero downtime)
- Never rename columns — add new, backfill, drop old (zero downtime)
- Create indexes CONCURRENTLY to avoid table locks
- Connection pooling via Supabase PgBouncer — max 60 connections on free tier
- Read queries → can use read replica (Phase 2). Write queries → primary only.

### GDPR rules (Germany — non-negotiable)
- All data stored in Frankfurt (eu-central-1) — never write EU PII outside EU
- IP addresses: hash after 7 days
- Account deletion: anonymise all PII within 30 days, keep financial records 10 years
- Data export endpoint (/api/me/data-export) must return all user data as JSON
- Audit log every significant data change in audit_logs table
- Marketing emails: only send if user.marketingConsent = true
- Breach notification: 72hrs to BfDI (Berlin data protection authority)

### Resilience rules
- All external API calls wrapped in try/catch — never let a 3rd party bring down the app
- Redis outage: fail open — fall back to DB query, log the fallback
- Stripe outage: queue to Inngest and retry — existing subscriptions still work from DB
- Resend outage: Inngest retries for 24 hours — emails delayed, not lost
- Background jobs (email, notifications): always async via Inngest, never block response

### What never to build in Phase 0
- No payment processing between users — they pay each other directly off-platform
- No escrow or money holding — no ZAG licence needed
- No iOS/Android native app — PWA is enough until seed round
- No ID verification yet — manual host vetting for first 50 hosts
- No host premium tier yet — everyone gets the same free listing
- No multi-language platform yet — English only

---

## Revenue Model & Roadmap

### Current Revenue
- Traveler subscription: Day €6 / Week €12 / Month €18 / Annual €49

### Stripe Pricing
- No monthly fee — pay only when money moves
- 1.5% + €0.25 per transaction (European cards)
- +0.25% + €0.25 per payout via Stripe Connect
- Safe to set up now, costs nothing until real payments

### Phase 1 — On-Platform Bookings + Commission (highest priority)
Bring session payments on-platform using Stripe Connect (marketplace payments).
- Traveler pays session fee (e.g. €60) through Offmap
- Platform takes 15% host commission + 5% traveler service fee
- Host receives net payout via Stripe Connect Express
- Traveler sees: "You pay €63 (incl. 5% service fee)"
- Host sees: "You earn €51 after 15% platform fee"

**Mock implementation plan:**
- "Book a session" button on host profile (uses existing `hourly_rate_cents`)
- Fake checkout → booking record in mock DB → confirmation page
- Both users see booking in their dashboards with fee breakdown
- No real Stripe Connect needed for mock testing

**DB changes needed:**
- New `bookings` table: traveler_id, host_id, conversation_id, amount_cents, platform_fee_cents, host_payout_cents, status, session_date
- New `host_payouts` table for payout history

**Production:** Stripe Connect Express onboarding for hosts, Payment Intents with automatic transfer to host Connect account

### Phase 2 — Host Pro Listing (€25/month)
Hosts pay for featured placement and priority in search.
- `is_pro` boolean on `host_profiles` (nullable, add as migration)
- "Verified Pro" badge in search results and host profile
- Priority sorting: pro hosts appear first in search
- Analytics dashboard for pro hosts (profile views, connection rate)
- Reuses existing Stripe subscription flow with a new product

**Mock implementation plan:**
- Add `is_pro` flag to mock host data
- Show badge in HostCard and search results
- Sort mock results: pro first
- Toggle manually in mock DB for testing

### Phase 3 — Traveler Credit Packs
Alternative to subscription for one-time visitors.
- Credit packs: €10 = 10 credits, €25 = 30 credits
- Each host unlock costs 2 credits
- `credits_balance` column on `users` table (nullable int, default 0)
- Deduct on conversation creation (alternative path to subscription check)
- Stripe one-time payment (not subscription)

### Phase 4 — Experience Packages (longer term)
Hosts list fixed-price curated experiences (€30–€120).
- Offmap takes 15–20% commission
- Needs: `experiences` table, host experience creation UI, traveler booking flow
- Turns platform into OTA (online travel agent)
- `/experiences` page currently a placeholder — needs real DB + API

### Phase 3 — Verified Host Badge (one-time €15–€25)
Hosts pay once to get ID-verified and receive a gold checkmark badge on their profile and search card.
- `is_verified` boolean on `host_profiles` (nullable, add as migration)
- Host submits ID document via upload form → manual review → approve → flag set
- Gold "Verified" checkmark badge in search results and host profile
- Travelers trust verified hosts more → higher conversion → hosts willingly pay
- Later: automate with Stripe Identity or Onfido KYC
- Revenue potential: 500 hosts × 60% verify × €20 = €6,000 one-time + recurring as new hosts join
- Build when: 50+ hosts on platform

### Phase 4 — Featured / Pro Host Placement (€25–€49/month recurring)
Hosts pay monthly to appear at the top of search results in their city.
- Tiers:
  - Free (€0): standard listing
  - Featured (€25/month): top of search in city + Featured badge
  - Pro (€49/month): top placement + analytics dashboard + priority support
- `host_tier` enum on `host_profiles`: 'free' | 'featured' | 'pro' (nullable, default 'free')
- Search API sorts: pro → featured → free within each city
- Reuses Stripe subscription flow with new products
- Only becomes valuable when 20+ hosts per city are competing — build infrastructure now, activate later
- Build when: 20+ hosts in at least one city

### Phase 5 — Verified Traveler Badge (bundled or €5–€10)
Travelers verify their identity to reassure hosts they are real people.
- Lower urgency than host verification — travelers less motivated to pay
- Best approach: include free with Month/Annual subscription plans, charge separately on Day/Week
- `is_verified` boolean on `users` table
- Build when: hosts start requesting it / after host verification is live

### Other Revenue Ideas (future)
- **Trip request boosting**: travelers pay €2–€5 to promote their trip to hosts
- **Gift cards**: €25/€50/€100 travel gift cards
- **B2B/corporate subscriptions**: team plans €99–€299/month for companies sending employees abroad
- **Travel insurance add-on**: referral commission via partner (20–30% of premium)
- **Destination partnerships**: tourism boards pay for bundled access with hotels/airlines

### Feature Build Status (as of May 2026)
| Feature | Phase | Status |
|---------|-------|--------|
| Traveler subscription (Stripe) | 0 | ✅ Fully built |
| My Trips | 0 | ✅ Fully built |
| Browse local hosts + search | 0 | ✅ Fully built |
| Conversations (real-time chat) | 0 | ✅ Fully built |
| Explore cities | 0 | ⚠️ No dedicated page — cities only in search filters |
| Experiences | 0 | ❌ Placeholder UI only — no API, no DB |
| Bookings + commission (15% host / 5% traveler) | 1 | ❌ Not built |
| Host Pro / Featured placement (€25–€49/month) | 2 | ❌ Not built |
| Credit packs for travelers | 2 | ❌ Not built |
| Verified Host badge (one-time €15–€25) | 3 | ❌ Not built |
| Featured host analytics dashboard | 4 | ❌ Not built |
| Verified Traveler badge | 5 | ❌ Not built |

### Booking Cancellation Policy (production rules — enforce in all API routes)

**Traveler cancellations (refund tiers):**
- Within 1hr of booking (cooling-off) → 100% refund
- 48h+ before session → 100% refund
- 24–48h before session → 50% refund, 50% kept by platform
- <24h before session → 0% refund (platform 70%, host 30%)
- No-show → 0% refund (platform 70%, host 30%)
- 1 free reschedule per booking (48h+ before, new date within 30 days)

**Host cancellations (stricter — they're the supply side):**
- 48h+ before → traveler full refund, host warning
- 24–48h before → traveler full refund + €10 platform credit, host 1 strike
- <24h before → traveler full refund + €20 platform credit, host 2 strikes + payout frozen 7d
- No-show → traveler full refund + €25 platform credit, host 2 strikes + payout frozen 14d

**Host strike consequences:** 1=warning, 2=ranking suppressed, 3=account review, 4=suspended. Resets after 6 months clean.
**Host non-response to booking in 48h** → auto-declined, full refund, host warning.

**No-show validation:**
- 2hr window after session time for traveler to report no-show
- Host has 24h to respond with evidence
- If host silent → traveler wins, full refund
- Auto-capture fires 26h after session time if no dispute

**Extenuating circumstances:** medical/death/disaster/travel ban → full refund, no strike, document required.

**Full spec:** `docs/BOOKING_CANCELLATION_POLICY.md`

### Booking DB fields (bookings table)
- `session_rate_cents`, `service_fee_percent` (5), `platform_commission_percent` (15)
- `traveler_total_cents`, `host_payout_cents`, `platform_fee_cents`
- `status`: pending → accepted/declined → completed/cancelled/disputed/refunded
- `refund_percent`, `refund_amount_cents`, `cancellation_type` (traveler/host/extenuating)
- `cancellation_reason`, `cancelled_by`, `cancelled_at`
- `session_date` — auto-capture fires 26h after this

### host_profiles cancellation tracking fields
- `cancellation_count`, `no_show_count`, `strike_count`, `payout_frozen_until`

### AI Travel Concierge (parked — build after Phase 2)
Smart host recommender chatbot on a `/plan` page.
- Level 1: FAQ bot (static knowledge, system prompt only)
- Level 2: Host recommender — Claude API + tool call to `/api/hosts/search` → returns real hosts inline in chat (BEST STARTING POINT)
- Level 3: Full trip planner with session history in Supabase
- Tech: Vercel AI SDK + Anthropic Claude API (claude-sonnet-4-6) + streaming `/api/ai/chat` route
- Revenue hook: 3 free messages → "Subscribe to continue" gate
- Full idea documented in conversation history

### Revenue Priority Order
1. Booking commissions — highest revenue per transaction, proves on-platform payments
2. Featured host placement — recurring, easy to build (just a DB flag + sort)
3. Verified host badge — one-time fee, builds trust on both sides
4. Credit packs — captures one-time visitors who won't subscribe
5. Verified traveler badge — bundle with premium subscription plans

---

## Search UX Improvements Roadmap

### City Autocomplete / Typeahead (Planned)

Replace the static `<select>` city dropdown in the search bar with a live typeahead combobox.
User types "Ber" → sees: `🇩🇪 Berlin · Germany · 214 hosts`, `🇨🇭 Bern · Switzerland`, etc.

#### Phase A — Client-side (NOW, ~2h, ≤50 cities)
**When to build:** immediately — works at current scale (8 cities).
**How it works:** cities already loaded in memory on page mount from `/api/cities`. Filter in-memory as user types. Zero extra API calls.

Files to change:
- `src/components/ui/CityAutocomplete.tsx` — **new component**
  - Text `<input>` + floating `<ul>` dropdown
  - Shows `{flagEmoji}  {cityName}` bold + `{country} · {N} hosts` smaller/grey on second line
  - Keyboard nav: arrow up/down, Enter to select, Escape to close
  - Click outside closes dropdown
  - Accessibility: `role="combobox"`, `aria-expanded`, `aria-activedescendant`
- `src/app/search/page.tsx` — swap `<select>` for `<CityAutocomplete>`
- `src/lib/mock/data.ts` — no change (already has `country` + `hostCount`)
- `src/app/api/cities/route.ts` — no change

No backend changes. No DB changes.

#### Phase B — Server-side search (FUTURE, when >100 cities)
**When to build:** after launching in 15+ cities where client-side list becomes unwieldy.
**How it works:** debounce input (300ms) → `GET /api/cities?q=ber&limit=8` → Postgres `WHERE name ILIKE 'ber%' ORDER BY host_count DESC`.

Additional files:
- `src/app/api/cities/route.ts` — add optional `?q=` param, Drizzle query with `ilike(cities.name, \`${q}%\`)`
- Add Postgres index: `CREATE INDEX CONCURRENTLY ON cities(name text_pattern_ops)` (prefix-match fast)
- `src/components/ui/CityAutocomplete.tsx` — switch to fetching from API instead of filtering in-memory prop; add debounce hook

#### Phase C — Fuzzy + global city search (FUTURE, when going global)
**When to build:** when expanding beyond Europe to 50+ cities, or if travelers search cities not yet on platform.
**Option 1 — Postgres full-text:** `tsvector` column on `cities.name`, GIN index, `ts_query` matching. Handles typos partially.
**Option 2 — Mapbox Geocoding API:** `GET https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?types=place` returns any city worldwide with coordinates. Show all results; if city not on Offmap yet, show "Coming soon" badge instead of a link. Converts search intent into city expansion signals.
**Option 3 — Algolia/Typesense:** dedicated search-as-a-service. Overkill until 500+ cities.

Recommended path: Mapbox for global expansion (already planned for map features).

#### Implementation notes
- Headless UI `Combobox` (`@headlessui/react`) gives keyboard nav + ARIA free — zero styling opinions. Add if building Phase B or C.
- On mobile: dropdown should be full-width and appear above keyboard — test on real device.
- Selected city stored as `{ id, name, country, flagEmoji }` object; only `id` sent to search API.
- Empty state: "No cities found — we're expanding soon!" with link to a notify-me form.
- The city photo pills below the search bar remain as a secondary visual shortcut even after autocomplete is added.

#### Status
| Phase | Status | Trigger |
|-------|--------|---------|
| A — client-side typeahead | ❌ Not built | Build now |
| B — server-side search | ❌ Not built | 15+ cities |
| C — fuzzy / global (Mapbox) | ❌ Not built | Global expansion |

---

## Search Scalability Notes

### Current implementation (mock + production)
- **Mock:** O(n) in-memory `Array.filter()` — fine for dev, not for production.
- **Production:** Drizzle ORM parameterised queries with Postgres `WHERE` clauses + `arrayContains` for `categories[]` and `languages[]` arrays.

### Indexes needed before launch (run as migrations)
```sql
-- GIN indexes for array columns (arrayContains uses these)
CREATE INDEX CONCURRENTLY ON host_profiles USING GIN(categories);
CREATE INDEX CONCURRENTLY ON host_profiles USING GIN(languages);
-- B-tree for equality + sort columns
CREATE INDEX CONCURRENTLY ON host_profiles(city_id, is_active, moderation_status);
CREATE INDEX CONCURRENTLY ON host_profiles(avg_rating DESC);
CREATE INDEX CONCURRENTLY ON host_profiles(hourly_rate_cents);
-- Prefix search on city names
CREATE INDEX CONCURRENTLY ON cities(name text_pattern_ops);
```

### Full-text search on host bio/name
Current `q` param uses `LIKE '%query%'` on bio + name — does not use indexes, full table scan.
At 10K+ hosts: replace with Postgres `tsvector` + GIN index or Typesense.

### Redis cache layer (already planned in CLAUDE.md)
- Key: `search:{sha256(queryParams)}`, TTL: 2 minutes
- Invalidate on host profile update or new host approval
- On Redis miss: hit DB, write to cache, return result
- On Redis outage: fail open → hit DB, log the fallback

### Concurrency
- Supabase PgBouncer handles connection pooling (max 60 on free tier)
- Vercel serverless scales automatically — no server config needed
- Each search request is stateless — safe to scale horizontally

---

## Hero Carousel — Featured Host Ranking

The carousel on the home page shows 6 hosts. This section defines how they are selected.

### Eligibility gates (must pass all — hard filters applied before scoring)

| Gate | Value |
|---|---|
| `moderationStatus` | `'approved'` |
| `isActive` | `true` |
| Primary photo uploaded | At least 1 photo in `host_photos` |
| `responseRate` | ≥ 85% |
| Profile completeness | bio, headline, languages, categories, neighborhood all set |
| Account age | ≥ 14 days since `createdAt` |

### Ranking score (0–100 float, computed hourly, cached in Redis)

```
score =
  (avgRating / 5.0)       × 35   -- quality signal
  + ratingConfidence      × 20   -- penalises hosts with only 2-3 reviews
  + (responseRate / 100)  × 15   -- hosts who ghost travelers rank lower
  + recentActivityScore   × 15   -- penalises inactive accounts
  + featuredBoost         × 10   -- paid Featured tier (Phase 2)
  + verifiedBoost         × 5    -- ID-verified badge (Phase 3)
```

**ratingConfidence** (Bayesian average — most important signal to get right):
```
confidence = reviewCount / (reviewCount + 10)
ratingConfidence = confidence × (avgRating / 5.0)
```
A host with 4.95★ from 3 reviews scores lower than 4.85★ from 80 reviews. Prevents new hosts gaming the carousel with a handful of friends leaving 5-star reviews.

**recentActivityScore** (decay by last login):
- Active in last 7 days → 1.0
- Active in last 30 days → 0.7
- Active in last 90 days → 0.3
- Beyond 90 days → 0.0 (ineligible entirely)

**featuredBoost**: +10 points for hosts on a paid Featured/Pro tier. Not enough to override poor fundamentals — a host with 40 organic + 10 boost = 50 still loses to a host with 65 organic. Quality wins.

**verifiedBoost**: +5 points for ID-verified hosts. Small signal, big trust impact on traveler side.

### Diversity rules (greedy pass applied after score sort)

Raw score ranking produces a bad carousel (6 Berlin food hosts). After sorting by score, apply:
1. **City cap** — max 2 hosts per city
2. **Host type** — try to include ≥ 1 female, ≥ 1 male, ≥ 1 couple/family across the 6
3. **Category spread** — avoid 6 food hosts; aim for ≥ 4 distinct categories
4. **Language spread** — cover EN + at least 3 other languages across the 6

Algorithm: iterate hosts sorted by score, accept if diversity caps not yet hit, skip otherwise. Fill remaining slots with next-highest scorers if caps can't be met.

### Refresh cadence

| Layer | TTL | Invalidated by |
|---|---|---|
| Score computation | 1 hour | Hourly cron job |
| Redis carousel cache | 10 min | Score refresh or host profile update |
| Next.js ISR (home page) | 5 min | Cache invalidation webhook |

New review → visible in carousel within ~75 min worst case. Acceptable.

### Build phases

| Phase | Implementation |
|---|---|
| Phase 0 (now) | `ORDER BY isFeatured DESC, avgRating DESC` — already live. Fine for < 50 hosts. |
| Phase 1 (50–200 hosts) | Add Bayesian `ratingConfidence` + `responseRate` filter. Single SQL computed column or hourly batch. |
| Phase 2 (200+ hosts) | Full score + diversity rules + Redis-cached ranked list + paid boost. |

---

## Host Paid Tier — Full Value Proposition

The question: is a host subscription just about ranking, or does it deliver standalone value even when there's no competition yet?

**Answer: ranking is the worst reason to charge hosts early. The tier must deliver value even when a host is one of 5 in their city.**

### What a paid host tier should actually include

**Visibility (ranking + placement)**
- Priority in search results within their city
- Eligible for hero carousel on home page
- Featured badge on profile card and search result
- Included in "Top hosts in [City]" email digest sent to travelers

**Analytics dashboard** (highest perceived value — every host wants this)
- Profile views per week/month, trend vs last period
- Click-through rate (views → conversation unlock)
- Where travelers come from (search, carousel, direct link)
- Which categories/languages drive most traffic
- Booking conversion rate vs city average

**Profile enhancements**
- Up to 10 photos (free: 3 photos)
- Video intro (30 sec) at top of profile
- Priority verification — ID check done within 24h instead of 7 days
- Custom availability calendar with recurring slots
- Pinned host note visible before traveler messages

**Trust signals**
- "Pro Host" badge (distinct from verified badge — signals commitment)
- Shown in traveler onboarding flow as recommended hosts
- Eligible for "Host of the Month" editorial feature

**Tools**
- Earnings dashboard: lifetime earnings, per-session breakdown, payout history
- Booking request management: accept/decline with one tap, set cancellation policy
- Vacation mode: pause profile without losing ranking position
- Multi-city listing: free hosts locked to 1 city, pro can list in up to 3

**Support**
- Priority support response (< 4h vs standard 48h)
- Dedicated host success manager once platform reaches scale
- Early access to new features (beta group)

**Community**
- Access to private host Slack/Discord
- Invited to host meetups and Offmap events in their city
- Input into product roadmap (host advisory calls)

### Pricing logic

| Tier | Price | Core unlock |
|---|---|---|
| Free | €0 | List profile, receive messages from subscribed travelers |
| Featured | €25/month | Analytics + top search placement + more photos |
| Pro | €49/month | Everything in Featured + multi-city + video intro + priority support |

One-time add-ons (sold separately, not subscription):
- ID verification badge: €15–25 (one-time, lifetime)
- Profile boost (7-day top placement): €9 (one-off, like an Airbnb boost)

### When to launch each

- **Analytics dashboard**: build first — highest perceived value, low marginal cost, works even with 1 host
- **More photos + video**: build with analytics — pure profile quality, no competition needed
- **Ranking boost**: only becomes meaningful value when ≥ 20 hosts compete in a city
- **Multi-city**: only relevant once platform is in 10+ cities
- **Community/events**: Phase 3+ when you have critical mass of hosts per city

### Key principle

Do not make ranking the only or primary pitch. A host in Stuttgart who is one of 4 hosts in the city will not pay €25/month to be #1 out of 4. They will pay €25/month for the analytics dashboard that shows them 340 people viewed their profile last month and their response rate is hurting their conversion. That data makes them better at their job. That is the value.

### Host paid tier — feature build order

Build in this sequence. Each step delivers standalone value regardless of how many hosts are on the platform. Do not skip ahead.

| Step | Feature | Trigger to build | Why this order |
|---|---|---|---|
| 1 | **Analytics dashboard** (profile views, click-through, conversion rate, response rate vs city avg) | Before charging anything | Highest perceived value, works with 1 host, creates weekly retention loop |
| 2 | **More photos** (free: 3, paid: 10) + **video intro** (30s) | Same time as analytics | Pure profile quality — no competition needed to justify it |
| 3 | **Stripe subscription billing** for Featured tier (€25/mo) | After steps 1–2 are live and hosts are using them | Charge only once you can demonstrate value via the dashboard |
| 4 | **Featured badge** on profile card + search result + carousel eligibility boost | Same release as billing | Visual trust signal; the ranking boost is a secondary benefit |
| 5 | **Vacation mode** (pause profile without losing ranking position) | With or after billing | Prevents churn when hosts travel; small build, high retention impact |
| 6 | **Priority search placement** (ranking boost in search + carousel score +10) | Once ≥ 20 hosts compete in at least one city | Only becomes a meaningful pitch when there is real competition |
| 7 | **Pro tier** (€49/mo) — multi-city listing (up to 3 cities) + priority support + earnings dashboard | Once platform is in 10+ cities | Multi-city is worthless before geographic expansion |
| 8 | **Profile boost** one-off (€9, 7-day top placement) | After Pro tier | Upsell for hosts who want a spike without a recurring commitment |
| 9 | **Host community** (private Slack/Discord, host meetups, advisory calls) | Once ≥ 50 active paying hosts | Community value is zero below critical mass |

**Never lead with ranking as the pitch.** Analytics → profile quality → billing → ranking. In that order.

---

## Production Readiness — Known Issues & Fixes (June 2026)

Full UAT report and deployment guide: `docs/UAT_AND_DEPLOYMENT.md`

### Critical blockers status

| # | Issue | Status | File |
|---|-------|--------|------|
| 1 | `/api/hosts/[id]` — no mock branch | ✅ Fixed | `src/app/api/hosts/[id]/route.ts` |
| 2 | `POST /api/reviews` — no mock branch | ✅ Fixed | `src/app/api/reviews/route.ts` |
| 3 | CSRF protection missing | ✅ Fixed | `src/middleware.ts` |
| 4 | Message pagination missing | ✅ Fixed | `src/app/api/conversations/[id]/messages/route.ts` |

### High priority (fix before go-live)

| Issue | Status | File |
|-------|--------|------|
| Forgot password — no mock branch | ✅ Already had mock branch | `src/app/api/auth/forgot-password/route.ts` |
| Wishlists — no mock branch | ✅ Fixed | `src/app/api/wishlists/route.ts` |
| Stripe portal — no mock branch | ✅ Fixed | `src/app/api/subscriptions/portal/route.ts` |
| Email verification not enforced | ⏳ Supabase Auth settings (dashboard) | — |
| Trip expiry not enforced | ⏳ No cron job exists yet | — |

### Message pagination API
- `GET /api/conversations/[id]/messages?limit=20&before=<ISO timestamp>`
- Returns oldest-first page of N messages + `meta.hasMore` + `meta.nextCursor`
- `nextCursor` is the ISO timestamp of the first message in the current page — pass as `before` to load earlier messages
- Max limit: 100 per request

### CSRF implementation notes
- Implemented as Origin header check in `src/middleware.ts`
- Covers all `POST/PUT/PATCH/DELETE` requests
- `/api/webhooks/` is exempt (Stripe uses signature verification)
- `localhost` and `127.0.0.1` always allowed (dev safety)
- Production requires `NEXT_PUBLIC_APP_URL=https://yourdomain.com` in env

---

## Observability & Disaster Recovery Plan

### CI/CD — GitHub Actions (chosen over Jenkins)
GitHub Actions is the right tool. Jenkins requires hosting + maintenance overhead with zero benefit at this scale. Three workflows in `.github/workflows/`: `ci.yml` (typecheck/lint/build), `migrate.yml` (auto DB migrations), `preview.yml` (PR preview URL comment).

### Monitoring by phase

**Phase 0 (now → 500 users) — free tools only**
| Tool | Covers | Cost |
|---|---|---|
| Vercel Analytics | Page load, Core Web Vitals, error rates | Free on Pro |
| Supabase Dashboard | Slow queries, connection count | Free |
| Upstash Console | Redis hit rate, latency | Free |
| **Sentry** | Frontend + API errors, stack traces, spike alerts | Free ≤5K errors/mo |

Sentry is the only one to add to the codebase. Add it before first production deploy.

**Phase 1 (500–5K users) — add Betterstack**
- Uptime monitoring from 10 global locations every 60s
- Status page at `status.offmap.com`
- Monitor: `GET /`, `GET /search`, `POST /api/auth/login`, `GET /api/stats`
- Cost: ~€20/month. Do NOT use Datadog/New Relic yet — overkill and expensive.

**Phase 2 (5K+ users) — Grafana Cloud**
- Pull metrics from Vercel, Supabase, Upstash, Stripe into one dashboard
- Alert on: P95 latency >400ms, error rate >1%, Redis miss rate >30%

### Availability
Stack SLAs: Vercel 99.99%, Supabase 99.9%, Upstash 99.99%, Stripe 99.99%.
Weakest link is Supabase — already mitigated by Redis cache layer (fail open to DB on Redis outage).

### Disaster recovery scenarios

| Scenario | Recovery | Time |
|---|---|---|
| Bad Vercel deploy | One-click rollback in Vercel dashboard (keeps last 10 deploys) | 2 min |
| Bad DB migration | Supabase PITR (enable on Pro plan) + backwards-compatible migration rules | 15–60 min |
| Supabase regional outage | Redis cache absorbs reads for 2–5 min; acceptable in Phase 0–1 | Supabase-dependent |
| Stripe outage | Existing subs work from DB; new purchases queue to Inngest and retry | Transparent |
| Redis outage | Fail open → DB fallback (already coded), log the fallback | Transparent |

### Action checklist before go-live
- [ ] Add Sentry to Next.js (`@sentry/nextjs`)
- [ ] Enable Vercel Analytics (one checkbox in Vercel dashboard)
- [ ] Set up Betterstack after first deploy
- [ ] Enable Supabase PITR when upgrading to Pro plan

### Homepage hero cards — data sources
| Card | Source | Real backend? |
|------|--------|---------------|
| Review (rotating) | `GET /api/reviews/featured` | ✅ Mock + production |
| Live Now (⚡ 4 min) | Hardcoded JSX | ❌ Static |
| Verified Hosts count | `GET /api/stats` | ✅ Mock + production |
| Pricing (€6/day) | Hardcoded JSX | ✅ Honest — prices are real |
