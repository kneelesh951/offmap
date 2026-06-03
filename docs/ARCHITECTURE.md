# Offmap — Architecture

This document covers the full system design: layer architecture, request lifecycle, mock/production dual-mode, auth, database, caching, security, and GDPR compliance.

---

## Table of contents

1. [Layer architecture](#1-layer-architecture)
2. [Mock / production dual-mode](#2-mock--production-dual-mode)
3. [Request lifecycle](#3-request-lifecycle)
4. [Authentication](#4-authentication)
5. [Database design](#5-database-design)
6. [Caching strategy](#6-caching-strategy)
7. [Subscription flow](#7-subscription-flow)
8. [Messaging flow](#8-messaging-flow)
9. [Security model](#9-security-model)
10. [GDPR compliance](#10-gdpr-compliance)
11. [Resilience patterns](#11-resilience-patterns)
12. [Latency targets](#12-latency-targets)
13. [Scalability path](#13-scalability-path)

---

## 1. Layer architecture

Seven layers with strict unidirectional flow. No layer ever calls up to a layer above it.

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 1 — CLIENT                                                │
│  Next.js pages · React components · client hooks                 │
│  Rules: no direct DB calls, no secrets, calls API routes only    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────────────┐
│  LAYER 2 — EDGE                                                  │
│  Cloudflare WAF (DDoS, bot protection, IP allowlisting)          │
│  Cloudflare CDN (static assets, host photos, 1yr cache-control)  │
│  Vercel Edge Network (ISR, global PoPs, TLS termination)         │
│  Security headers: HSTS · X-Frame-Options · nosniff · CSP        │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  LAYER 3 — API  (Next.js Route Handlers)                         │
│                                                                  │
│  Every request through middleware.ts:                            │
│    1. Rate limit (Upstash sliding window, 100 req/60s per IP)    │
│    2. JWT validation (Supabase session refresh)                  │
│    3. Route protection (redirect if unauthenticated)             │
│                                                                  │
│  Every route handler:                                            │
│    1. Zod .safeParse() on all inputs                             │
│    2. Auth check (session from cookie)                           │
│    3. Subscription check (Redis cache → DB fallback)             │
│    4. Delegate to service layer                                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  LAYER 4 — SERVICES                                              │
│  AuthService · HostService · SubscriptionService                 │
│  MessageService · EmailService · AuditService · SearchService    │
│  All business logic lives here — never in route handlers         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  LAYER 5 — REPOSITORY  (Drizzle ORM)                             │
│  Type-safe parameterised queries. No raw SQL anywhere.           │
│  Single file: src/lib/db/schema.ts defines all 13 tables.        │
│  Drizzle generates migrations — Supabase schema never edited     │
│  manually.                                                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  LAYER 6 — DATA                                                  │
│  PostgreSQL (Supabase, Frankfurt eu-central-1)                   │
│    Row Level Security on every table                             │
│    PgBouncer connection pooling (max 60 on free tier)            │
│  Upstash Redis                                                   │
│    Rate limit tokens · subscription cache · search cache         │
│  Supabase Storage                                                │
│    Host photos (JPEG/PNG/WebP, 5 MB max)                         │
│    CDN-served via Cloudflare                                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  LAYER 7 — EXTERNAL SERVICES                                     │
│  Stripe    — subscription billing, customer portal               │
│  Resend    — transactional email (5 templates)                   │
│  Supabase Auth — JWT issuance, OAuth, session management         │
│  (Inngest — background jobs, Phase 1)                            │
│                                                                  │
│  All wrapped in src/lib/ modules. Never called directly from     │
│  components, pages, or route handlers.                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Mock / production dual-mode

The single source of truth is `src/lib/mock/index.ts`:

```ts
export const IS_MOCK = process.env.MOCK_MODE === 'true'
```

Every API route branches on this constant. Real service imports are done **lazily inside the production branch** so they don't fail when env vars are absent in mock mode.

```ts
if (IS_MOCK) {
  const { mockDb } = await import('@/lib/mock/db')
  // use in-memory Maps
} else {
  const { db } = await import('@/lib/db')
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  // use real services
}
```

### Mock implementation

| Real service | Mock equivalent | Location |
|---|---|---|
| PostgreSQL + Drizzle | JavaScript `Map` objects | `src/lib/mock/db.ts` |
| Supabase Auth | Cookie-based session tokens | `src/lib/mock/auth.ts` |
| Stripe | Instant subscription activation | `src/lib/mock/stripe.ts` |
| Resend email | `console.log` | `src/lib/mock/email.ts` |
| Upstash Redis | `console.log` | `src/lib/mock/redis.ts` |

### Mock data

8 realistic host profiles, 8 European cities, 3 reviews, and 1 sample conversation live in `src/lib/mock/data.ts`. Data resets when the dev server restarts.

```
Cities: Berlin · Lisbon · Amsterdam · Barcelona · Munich · Vienna · Prague · Rome
Hosts:  Amira (Berlin) · Marco (Lisbon) · Yuki (Amsterdam) · Sofia (Barcelona)
        Klaus (Berlin) · Anna & Stefan (Munich) · Luca (Rome) · Felix (Vienna)
```

---

## 3. Request lifecycle

A typical authenticated API request (e.g. `POST /api/conversations`):

```
Browser
  │
  ├─ 1. HTTPS request to Vercel Edge
  │
  ├─ 2. middleware.ts runs:
  │       a. Rate limit check (Upstash) — 429 if exceeded
  │       b. Supabase session refresh (renews JWT if near expiry)
  │       c. Route protection — redirect to /auth/login if unauthenticated
  │
  ├─ 3. Route handler (POST /api/conversations/route.ts):
  │       a. Zod .safeParse(body) — 422 if invalid
  │       b. Get user from Supabase session cookie
  │       c. Check active subscription (Redis → DB fallback)
  │       d. Business logic (create conversation, send email)
  │       e. Return { success: true, data: { conversationId } }
  │
  └─ 4. Response to browser
```

### Middleware execution order

```
middleware.ts
  ├── if /api/* and not mock → Upstash rate limiter
  ├── if not mock → Supabase updateSession (JWT refresh)
  └── if mock mode:
        ├── check offmap_mock_session cookie
        ├── if protected route and no session → redirect /auth/login
        └── if auth route and has session → redirect /dashboard
```

---

## 4. Authentication

### Production auth flow

```
Registration:
  POST /api/auth/register
    → Zod validate
    → supabase.auth.signUp(email, password, { data: { fullName, role } })
    → createSupabaseAdminClient().from('users').insert(...)  ← bypasses RLS
    → sendWelcomeEmail(email, name, role)                    ← Resend
    → return session cookie (HttpOnly + SameSite=Strict)

Login:
  POST /api/auth/login
    → supabase.auth.signInWithPassword(email, password)
    → session stored in HttpOnly cookie by @supabase/ssr
    → JWT TTL: 1 hour  |  Refresh token TTL: 7 days (rotation on use)

Session check (every protected request):
  createSupabaseServerClient().auth.getUser()
    → reads cookie → validates JWT → refreshes if needed
```

### Cookie security

- `HttpOnly` — JavaScript cannot read the session cookie (XSS prevention)
- `SameSite=Strict` — cookie not sent on cross-origin requests (CSRF prevention)
- `Secure` — HTTPS only in production

### Supabase client types

| Client | File | When to use |
|---|---|---|
| `createSupabaseServerClient()` | `src/lib/supabase/server.ts` | Server components, route handlers |
| `createSupabaseBrowserClient()` | `src/lib/supabase/client.ts` | Client components only |
| `createSupabaseAdminClient()` | `src/lib/supabase/server.ts` | Webhook handlers, admin ops — bypasses RLS |

`createSupabaseAdminClient()` uses the service role key. **Never call it from client components or expose it to the browser.**

### Mock auth flow

```
mockSignUp(email, password, name, role)
  → generate nanoid session token
  → store user in mockDb.users Map
  → store token in mockDb.sessions Map
  → set offmap_mock_session=<token> cookie (HttpOnly)

mockGetUser(token)
  → look up token in mockDb.sessions → return user or null

mockSignOut(token)
  → delete from mockDb.sessions
  → clear cookie
```

---

## 5. Database design

All tables defined in `src/lib/db/schema.ts`. Managed exclusively via Drizzle ORM — never edit the Supabase schema dashboard manually.

### Entity relationship

```
users
├── host_profiles (1:1)  →  cities (N:1)
│   └── host_photos (1:N)
├── subscriptions (1:N)
├── conversations (1:N as traveler)
├── conversations (1:N as host)
│   ├── messages (1:N)
│   └── reviews (1:N)
├── wishlists (1:N)  → host_profiles
├── trip_posts (1:N)  →  cities (N:1)
│   └── trip_responses (1:N)
├── reports (1:N as reporter)
└── audit_logs (1:N)
```

### Key indexes

```sql
-- Most important: checked on every protected route
CREATE INDEX subscriptions_user_status_idx ON subscriptions(user_id, status, current_period_end);

-- Host search: city + active + approved + featured + rating
CREATE INDEX host_profiles_search_idx ON host_profiles(city_id, is_active, moderation_status, is_featured, avg_rating);

-- Message loading: newest messages in a conversation
CREATE INDEX messages_conv_msg_idx ON messages(conversation_id, created_at);

-- Prevent duplicate conversations
CREATE UNIQUE INDEX conversations_unique_pair ON conversations(traveler_id, host_id);
```

### Row Level Security

Every table has RLS policies. Examples:

```sql
-- Users: only read/update own row
CREATE POLICY "users_self_read" ON users FOR SELECT USING (auth.uid() = id);

-- Host profiles: anyone can read approved+active profiles
CREATE POLICY "hosts_public_read" ON host_profiles FOR SELECT
  USING (is_active = true AND moderation_status = 'approved');

-- Messages: only conversation participants
CREATE POLICY "messages_participants" ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE traveler_id = auth.uid() OR host_id = auth.uid()
    )
  );

-- Subscriptions: only own
CREATE POLICY "subs_own" ON subscriptions FOR SELECT USING (user_id = auth.uid());
```

The `createSupabaseAdminClient()` (service role key) bypasses RLS — only used in trusted server contexts like Stripe webhook handlers.

### Migration rules

1. New columns must be nullable on creation. Add `NOT NULL` after backfill (zero downtime).
2. Never rename columns — add new column, backfill, drop old.
3. Create indexes with `CONCURRENTLY` to avoid table locks.
4. All changes via Drizzle (`npm run db:generate` → `npm run db:migrate`).

---

## 6. Caching strategy

| Data | Cache | TTL | Invalidation |
|---|---|---|---|
| Subscription status | Upstash Redis | 5 min | On Stripe webhook |
| Search results | Upstash Redis | 2 min | On profile update |
| Host profile pages | Next.js ISR at edge | 60 s | On profile update |
| Host photos | Cloudflare CDN | 1 year | Immutable filenames (rename on re-upload) |
| City list | Static JSON at build | Until redeploy | Rebuild triggers |

### Cache key patterns

```
rl:api:<ip>                    rate limit counter
sub:<userId>                   subscription status
search:<hash(queryParams)>     search results
```

### Redis fail-open

If Upstash is unavailable, the app continues — falls back to DB queries and logs the fallback. This means rate limiting also fails open (no blocking), which is an acceptable tradeoff.

```ts
try {
  const { success } = await limiter.limit(ip)
  if (!success) return 429
} catch {
  // Redis down — fail open, let request through
}
```

---

## 7. Subscription flow

```
Traveler clicks "Subscribe" (day/week/month/annual)
  │
  ▼
POST /api/subscriptions/checkout
  ├── Zod validate plan name
  ├── Auth check (must be logged in)
  ├── getOrCreateStripeCustomer(userId, email)  ← idempotent
  └── createCheckoutSession(customerId, priceId, successUrl, cancelUrl)
        └── returns Stripe-hosted checkout URL

Browser redirects to Stripe Checkout
  │  (card entry, 3DS if needed, ToS acceptance — required by German law)
  ▼
Payment succeeds
  │
  ▼
Stripe sends POST /api/webhooks/stripe  (event: checkout.session.completed)
  ├── verifyWebhookSignature(body, stripe-signature header)
  ├── Retrieve subscription from Stripe API
  ├── Upsert into subscriptions table (Drizzle onConflictDoUpdate — idempotent)
  ├── sendSubscriptionConfirmationEmail(user.email, ...)
  └── return 200

Browser polls GET /api/subscriptions
  ├── Check Redis cache (5 min TTL)
  └── If miss: query subscriptions table → cache result

Traveler can now unlock hosts
  POST /api/conversations
    └── checks: status=active AND currentPeriodEnd > now()
```

### Stripe webhook events

| Event | Action |
|---|---|
| `checkout.session.completed` | Upsert subscription, send confirmation email |
| `customer.subscription.updated` | Sync status, period dates, cancel flag |
| `customer.subscription.deleted` | Set status = cancelled |
| `invoice.payment_failed` | Set status = past_due |

**Always verify the webhook signature** before processing — `verifyWebhookSignature()` throws if invalid.

---

## 8. Messaging flow

```
Traveler unlocks host:
  POST /api/conversations { hostId }
    ├── active subscription check
    ├── host exists + is approved check
    ├── check for existing conversation (unique pair constraint)
    ├── INSERT into conversations
    ├── fire-and-forget: sendHostMessageNotification(hostEmail, ...)
    └── return { conversationId }

Sending a message:
  POST /api/conversations/[id]/messages { content }
    ├── auth check
    ├── verify user is a participant of this conversation
    ├── Zod validate content (1–5000 chars)
    ├── INSERT into messages
    └── (Phase 1: Supabase Realtime broadcast for live updates)

Fetching messages:
  GET /api/conversations/[id]/messages
    ├── auth + participant check
    └── SELECT messages WHERE conversation_id = ? ORDER BY created_at ASC
```

Messages are never hard-deleted (`isDeleted = true` for soft delete). This is a legal requirement — messaging history must be auditable.

---

## 9. Security model

### Defence in depth

```
Internet
  → Cloudflare WAF (DDoS, bot, bad IPs)
  → Rate limiting (100 req/60s per IP)
  → JWT validation (Supabase)
  → Zod input validation
  → RLS (even if API has a bug, DB rejects unauthorised reads)
```

### Input validation

Every API route calls `.safeParse()` before any logic. Invalid input always gets `422 VALIDATION_ERROR` — no business logic runs on bad input.

```ts
const parsed = schema.safeParse(body)
if (!parsed.success) return NextResponse.json(
  { success: false, error: { code: 'VALIDATION_ERROR', ... } },
  { status: 422 }
)
```

### File uploads (Phase 1)

- Accepted types: JPEG, PNG, WebP only
- Max size: 5 MB
- Files renamed on upload (immutable, UUID-based names)
- Virus scan before saving to Storage

### Secrets management

- All secrets in environment variables — never hardcoded
- `SUPABASE_SERVICE_ROLE_KEY` only used in server-side code (webhooks, admin ops)
- `STRIPE_SECRET_KEY` only used server-side
- Public env vars (`NEXT_PUBLIC_*`) contain only safe, non-secret values
- Never log PII (email, name, IP) in server logs

### Auth endpoint rate limiting

Auth routes are among the most abuse-prone. Rate limiting: 5 attempts per 15 minutes per IP (in Supabase Auth settings, plus Upstash at the middleware layer).

---

## 10. GDPR compliance

Offmap operates from Germany under strict GDPR requirements.

### Data residency

All data stored in **Frankfurt (eu-central-1)**. EU user PII never leaves EU infrastructure.

### User rights implementation

| Right | Implementation |
|---|---|
| Access | `GET /api/me/data-export` returns all user data as JSON |
| Deletion | `dataDeleteRequestedAt` timestamp set, anonymise within 30 days |
| Portability | Data export endpoint returns structured JSON |
| Consent | `gdprConsentAt` recorded at registration; `marketingConsent` tracked separately |

### Data retention

| Data type | Retention |
|---|---|
| IP addresses | Hashed after 7 days |
| Financial records | 10 years (German tax law) |
| Messages + conversations | Never hard-deleted (legal audit trail) |
| Account PII on deletion | Anonymised within 30 days |

### Audit trail

Every significant data change is written to `audit_logs`:

```ts
{
  userId: string      // who did it
  action: string      // e.g. 'subscription.created'
  tableName: string   // which table changed
  recordId: uuid      // which record
  oldData: jsonb      // before state
  newData: jsonb      // after state
  ipAddress: string   // hashed after 7 days
}
```

### Email consent

Marketing emails are only sent if `users.marketingConsent = true`. Transactional emails (subscription confirmation, password reset) are always sent regardless of consent.

### Breach notification

Under GDPR Art. 33, data breaches must be reported to **BfDI** (Bundesbeauftragter für den Datenschutz und die Informationsfreiheit) within **72 hours**.

---

## 11. Resilience patterns

### External service failures

| Service | Failure behaviour |
|---|---|
| Upstash Redis | Fail open — rate limiting skips, subscription falls back to DB |
| Stripe (checkout) | Queue to Inngest, retry for 24 hours (Phase 1) |
| Stripe (existing subs) | Existing subscriptions still work from DB cache |
| Resend email | Inngest retries for 24 hours — emails delayed, not lost (Phase 1) |
| Supabase Auth | Sessions valid for 1 hour from last verification |

### Error wrapping

All external API calls are wrapped in try/catch. A Resend failure never crashes a subscription checkout. A Redis failure never blocks a page load.

```ts
// Email is always fire-and-forget — never awaited in the request path
sendHostMessageNotification({ ... }).catch(console.error)
```

### Idempotency

Stripe webhooks can be delivered multiple times. Drizzle `.onConflictDoUpdate()` upserts ensure duplicate events are safe:

```ts
await db.insert(subscriptions).values({ ... })
  .onConflictDoUpdate({
    target: [subscriptions.stripeSubscriptionId],
    set: { status: 'active', updatedAt: new Date() },
  })
```

---

## 12. Latency targets

| Operation | Target | Mechanism |
|---|---|---|
| Search results | < 200ms P95 | Redis cache (2 min TTL) before DB |
| Subscription check | < 10ms | Redis cache (5 min TTL) |
| Host profile page | < 400ms | Next.js ISR (60s TTL) |
| Message send | < 150ms | DB write + Realtime broadcast |
| Auth (login) | < 500ms | Supabase Auth |

External APIs (Stripe, Resend) are **never called synchronously in the request path** unless required (e.g. Stripe Checkout session creation must be synchronous). All other external calls use background jobs.

---

## 13. Scalability path

### Phase 0 — current (0–10k users)

- Single container or Vercel serverless
- Supabase free tier (500 MB DB, 1 GB storage)
- Upstash free tier
- ~€0/month infra

### Phase 1 — growth (10k–100k users)

- 2–3 containers behind a load balancer (app is fully stateless)
- Supabase Pro ($25/month) — more connections, 8 GB DB
- Inngest for background jobs (email retries, review requests)
- Supabase Realtime for live messaging
- Column-level encryption for messages via Supabase Vault
- Redis-based webhook deduplication
- ~€50–100/month infra

### Phase 2 — scale (100k+ users)

- Horizontal scaling — add containers, Supabase handles DB
- Read replica for search + browse queries
- Mapbox integration for city maps
- PostGIS for geospatial host queries
- Supabase Enterprise (~€300+/month)

**Why the architecture scales:**

- App server is **stateless** — no in-memory state beyond the request. Any container can serve any request.
- Sessions live in Supabase Auth — not the app server.
- Redis rate limiting works across all containers automatically.
- RLS at the DB level prevents data leaks regardless of container count.
