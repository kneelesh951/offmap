# Production Architecture: Offmap at Global Scale

> Comprehensive architecture plan for scaling Offmap from MVP to millions of users across multiple countries with zero downtime and sub-200ms response times.
>
> Last updated: June 2026 | Author: Architecture Review

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Gaps](#2-architecture-gaps)
3. [Target Architecture](#3-target-architecture)
4. [Phase 1: Production Hardening (Month 1-2)](#4-phase-1-production-hardening)
5. [Phase 2: Performance & Resilience (Month 3-4)](#5-phase-2-performance--resilience)
6. [Phase 3: Global Scale (Month 5-8)](#6-phase-3-global-scale)
7. [Phase 4: Enterprise Scale (Month 9-12)](#7-phase-4-enterprise-scale)
8. [Cost Projections](#8-cost-projections)
9. [Performance Targets](#9-performance-targets)
10. [Priority Matrix](#10-priority-matrix)
11. [Disaster Recovery](#11-disaster-recovery)
12. [Security at Scale](#12-security-at-scale)

---

## 1. Current State Analysis

### Stack

```
┌─────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                   │
│                                                           │
│  Client (Next.js 14 App Router)                          │
│  ├── React 18 + TypeScript + Tailwind CSS                │
│  ├── 'use client' for interactive pages                  │
│  └── Server Components for static/SSR pages              │
│           │                                               │
│  Vercel (Hosting + Edge + Serverless Functions)          │
│           │                                               │
│  ├── Supabase Auth (JWT cookies, session refresh)        │
│  ├── PostgreSQL via Supabase (Drizzle ORM, 17 tables)   │
│  ├── Upstash Redis (rate limiting only)                  │
│  ├── Supabase Realtime (messages only)                   │
│  ├── Supabase Storage (avatars, photos, videos, ID docs) │
│  ├── Stripe (subscriptions + webhooks)                   │
│  ├── Resend (transactional email)                        │
│  └── Claude Haiku 4.5 (AI chat assistant)                │
└─────────────────────────────────────────────────────────┘
```

### What's Already Production-Ready

| Component | Status | Details |
|-----------|--------|---------|
| Type safety | Solid | TypeScript + Drizzle ORM + Zod validation end-to-end |
| Authentication | Solid | Supabase Auth, httpOnly cookies, JWT refresh in middleware |
| CSRF protection | Solid | Origin header check on all mutations, webhook exemptions |
| Payments | Solid | Stripe checkout + portal + webhook signature verification |
| GDPR compliance | Solid | Audit logs, soft deletes, data export, consent tracking, EU storage |
| Database schema | Solid | 17 tables, compound indexes, nullable-first migrations |
| Security headers | Solid | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Rate limiting | Solid | Upstash Redis sliding window, 100 req/60s, fails open |
| Real-time messaging | Solid | Supabase Realtime postgres_changes, polling fallback |
| API conventions | Solid | Consistent `{success, data/error}` shape, Zod on every route |
| Mock/prod dual mode | Solid | Full in-memory mock for local dev, zero config switching |

### API Surface (39 endpoints)

```
Authentication (5)     POST /api/auth/register, login, logout, forgot-password, change-password
Hosting (5)           POST /api/host/onboarding  GET/api/hosts/[id], search  POST id-verification, intro-video
Subscriptions (3)     POST /api/subscriptions/checkout  GET portal, status
Conversations (2)     POST /api/conversations  GET|POST /api/conversations/[id]/messages
Bookings (2)          POST /api/bookings  POST /api/bookings/[id]/action
Reviews (2)           POST /api/reviews  GET /api/reviews/featured
User Account (4)      GET|PATCH /api/me  POST /api/me/avatar  GET data-export  POST delete
Trip Requests (3)     GET|POST /api/trips  GET /api/trips/[id]  POST respond
Utilities (5)         GET /api/cities, stats, notifications  POST contact, wishlists
AI (1)                POST /api/ai/chat (streaming, tool use)
Webhooks (1)          POST /api/webhooks/stripe
```

### Database (17 tables, PostgreSQL)

```
Core Identity:     users, cities
Hosting:           host_profiles, host_photos
Transactions:      subscriptions, bookings
Messaging:         conversations, messages
Social:            reviews, wishlists
Trip Requests:     trip_requests, trip_host_responses
Moderation:        reports, audit_logs, notifications
```

Key indexes:
- `host_profiles(city_id, is_active, moderation_status, is_featured, avg_rating)` — search compound
- `subscriptions(user_id, status, current_period_end)` — checked on every protected route
- `messages(conversation_id, created_at)` — pagination
- `trip_requests(city_id, status, arrival_date)` — host browse

---

## 2. Architecture Gaps

### Critical (must fix before serious traffic)

| # | Gap | Current State | Risk | Blast Radius |
|---|-----|--------------|------|-------------|
| 1 | **No application caching** | Every API request hits Postgres directly | Search P95 >500ms at 1K concurrent users | All users, every page load |
| 2 | **No background job queue** | Emails sent inline in request path, no retry logic | Silent email failures, 200-500ms added to response time | Registration, booking, notifications |
| 3 | **No webhook idempotency** | Stripe events processed without deduplication | Duplicate subscriptions, double charges possible | All paying users |
| 4 | **No error tracking** | `console.error` to stdout only, no alerting | Blind to production errors until users report them | All users, all endpoints |
| 5 | **No health monitoring** | No `/health` endpoint, no uptime checks | Minutes-to-hours incident detection time | Entire platform |

### High Priority (fix before 5K users)

| # | Gap | Current State | Risk |
|---|-----|--------------|------|
| 6 | **No full-text search** | `LIKE '%query%'` on bio/headline — full table scan | Search unusable at 10K+ hosts |
| 7 | **No CDN for user uploads** | Supabase Storage served directly | Slow images for non-EU users |
| 8 | **No read replicas** | Single Postgres instance handles all reads + writes | DB bottleneck at 5K+ concurrent |
| 9 | **No structured logging** | `console.log/error` with no request context | Impossible to debug production issues |
| 10 | **No test suite** | Zero unit tests, zero E2E tests | Every deploy is a gamble |

### Medium Priority (fix before 25K users)

| # | Gap | Current State | Risk |
|---|-----|--------------|------|
| 11 | **No image processing** | Photos uploaded raw, no resize/optimize | Large images, slow page loads |
| 12 | **Manual moderation only** | Admin manually reviews every host | Doesn't scale past 500 hosts |

---

## 3. Target Architecture

### Phase 2 (5K-25K users)

```
┌─────────────────────────────────────────────────────────────────┐
│                     TARGET ARCHITECTURE (Phase 2)                │
│                                                                  │
│  Users                                                           │
│    │                                                             │
│  Cloudflare (WAF + DDoS + CDN + Image Optimization)            │
│    │                                                             │
│  Vercel Edge                                                     │
│  ├── Static assets (1yr cache, immutable)                       │
│  ├── ISR pages (home 5min, profiles 1min, cities 1hr)          │
│  └── Edge Functions (session check, sub check, rate limit)      │
│    │                                                             │
│  Vercel Serverless Functions (API Routes)                       │
│    │                                                             │
│    ├── Upstash Redis ──────────────────────────────────┐        │
│    │   ├── Application cache (search, profiles, stats)  │        │
│    │   ├── Rate limiting (tiered per endpoint)          │        │
│    │   ├── Subscription status cache (5min TTL)         │        │
│    │   ├── Webhook event deduplication (48hr TTL)       │        │
│    │   └── Session metadata                             │        │
│    │                                                     │        │
│    ├── PostgreSQL (Supabase) ───────────────────────────┤        │
│    │   ├── Primary (Frankfurt) — all writes             │        │
│    │   ├── Read Replica — search, profiles, listings    │        │
│    │   ├── Full-text search (tsvector + GIN index)      │        │
│    │   └── PITR continuous backup                       │        │
│    │                                                     │        │
│    ├── Inngest (Background Jobs) ───────────────────────┤        │
│    │   ├── Email delivery (retry 3x, exponential)       │        │
│    │   ├── Webhook processing (heavy DB writes)         │        │
│    │   ├── Image processing (resize, WebP, EXIF strip)  │        │
│    │   ├── Score recalculation (hourly cron)            │        │
│    │   ├── Trip expiry check (daily cron)               │        │
│    │   └── Cache invalidation cascades                  │        │
│    │                                                     │        │
│    ├── Supabase Realtime ───────────────────────────────┤        │
│    │   ├── Messages (existing)                          │        │
│    │   ├── Notifications (new)                          │        │
│    │   ├── Booking status changes (new)                 │        │
│    │   └── Trip responses (new)                         │        │
│    │                                                     │        │
│    ├── Stripe ──────────────────────────────────────────┤        │
│    │   ├── Subscriptions (checkout + portal)            │        │
│    │   ├── Connect Express (host payouts)               │        │
│    │   └── Tax (automatic VAT calculation)              │        │
│    │                                                     │        │
│    ├── Resend (Email) ──────────────────────────────────┤        │
│    │   └── Via Inngest (never inline)                   │        │
│    │                                                     │        │
│    ├── Sentry ──────────────────────────────────────────┤        │
│    │   ├── Error tracking + stack traces                │        │
│    │   ├── Performance monitoring (P95, P99)            │        │
│    │   └── Release tracking + source maps               │        │
│    │                                                     │        │
│    └── Supabase Storage + Cloudflare R2 ────────────────┘        │
│        ├── Avatars, host photos (public CDN)                     │
│        ├── ID documents (private, encrypted)                     │
│        └── Intro videos (public CDN, transcoded)                 │
│                                                                  │
│  Monitoring: Sentry + Betterstack + Vercel Analytics            │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4 (100K-1M+ users)

```
┌─────────────────────────────────────────────────────────────────┐
│                  ENTERPRISE ARCHITECTURE (Phase 4)                │
│                                                                  │
│  Global Users                                                    │
│    │                                                             │
│  Cloudflare (WAF + DDoS + CDN + Bot Management + Workers)       │
│    │                                                             │
│  ┌─── EU Region ──────┬─── US Region ──────┬─── APAC Region ──┐│
│  │ Vercel Edge EU     │ Vercel Edge US     │ Vercel Edge APAC ││
│  │ Redis Replica      │ Redis Replica      │ Redis Replica    ││
│  │ DB Read Replica    │ DB Read Replica    │ DB Read Replica  ││
│  └─────────┬──────────┴─────────┬──────────┴────────┬─────────┘│
│            │                    │                    │           │
│            └────────────────────┼────────────────────┘           │
│                                 │                                │
│  ┌─── Frankfurt (Primary) ──────────────────────────────────────┐│
│  │ PostgreSQL Primary (writes only)                             ││
│  │ Redis Primary (cache + sessions + events)                    ││
│  │ Inngest (background jobs)                                    ││
│  │ Typesense Cluster (search)                                   ││
│  │ Event Bus (Redis Streams)                                    ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Services (extract only if monolith becomes bottleneck):        │
│  ├── Search Service (Typesense + sync jobs)                     │
│  ├── Messaging Service (dedicated WebSocket infra)              │
│  ├── Payment Service (Stripe Connect + booking state machine)   │
│  └── Notification Service (push + email + SMS fan-out)          │
│                                                                  │
│  Monitoring: Grafana Cloud + PagerDuty + Sentry + Betterstack  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 1: Production Hardening (Month 1-2)

> Goal: Don't break under real traffic. Support 1K-5K users.

### 4.1 Sentry Integration

**Why:** Currently blind to production errors. `console.error` goes to Vercel logs which are ephemeral and have no alerting.

**Implementation:**
```
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Files to create/modify:**
- `sentry.client.config.ts` — browser error capture, sample rate 0.1
- `sentry.server.config.ts` — API route errors, sample rate 1.0
- `sentry.edge.config.ts` — middleware errors
- `next.config.js` — add Sentry webpack plugin for source maps
- `src/app/global-error.tsx` — React error boundary with Sentry.captureException

**Configuration:**
- Environment: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- Traces sample rate: 0.1 (prod), 1.0 (staging)
- Ignore: 404s, rate limit 429s, auth 401s
- Alert rules: >50 errors in 5 min → Slack, >200 → email founder
- Release tracking: tag deploys with git SHA

**Estimated effort:** 2-3 hours

### 4.2 Redis Caching Layer

**Why:** Every API request hits Postgres. At 1K concurrent users, Supabase free tier (60 connections via PgBouncer) will be saturated. Redis absorbs 80%+ of read traffic.

**File:** `src/lib/cache.ts`

```typescript
// Interface (conceptual — not actual code to copy)
cacheGet<T>(key: string): Promise<T | null>
cacheSet(key: string, data: unknown, ttlSeconds: number): Promise<void>
cacheInvalidate(pattern: string): Promise<void>
cacheDel(key: string): Promise<void>
```

**Cache strategy by resource:**

| Resource | Key Pattern | TTL | Invalidation Trigger | Hit Rate (est.) |
|----------|------------|-----|---------------------|----------------|
| Search results | `search:{sha256(queryParams)}` | 120s | Host profile update, new host approved | 70% |
| Host profile (public) | `host:{hostId}` | 300s | Profile edit, new review, new photo | 85% |
| City list | `cities:all` | 3600s | Admin adds/removes city | 99% |
| Platform stats | `stats:global` | 600s | Hourly cron refresh | 99% |
| Subscription status | `sub:{userId}` | 300s | Stripe webhook (sub created/updated/deleted) | 90% |
| Featured carousel | `featured:home:6` | 600s | Hourly score refresh | 95% |
| User session metadata | `user:{userId}:meta` | 300s | Profile update, role change | 80% |

**Failure mode:** Redis outage → every call falls through to Postgres (fail open). Log every fallback for monitoring.

**Target impact:** Search P95 from ~400ms → <150ms. Subscription check from ~50ms → <5ms.

**Files to modify:**
- `src/app/api/hosts/search/route.ts` — wrap with cache
- `src/app/api/hosts/[id]/route.ts` — wrap with cache
- `src/app/api/cities/route.ts` — wrap with cache
- `src/app/api/stats/route.ts` — wrap with cache
- `src/app/api/subscriptions/route.ts` — wrap with cache
- `src/app/api/webhooks/stripe/route.ts` — invalidate sub cache
- `src/app/api/me/route.ts` (PATCH) — invalidate user cache

**Estimated effort:** 1-2 days

### 4.3 Background Job Queue (Inngest)

**Why:** Emails are sent inline in the request path. If Resend is slow (500ms), every registration/booking takes 500ms longer. If Resend is down, emails are silently lost. Heavy Stripe webhook processing blocks the webhook response, risking Stripe retry storms.

**Setup:**
```
npm install inngest
```

**Files to create:**
- `src/inngest/client.ts` — Inngest client singleton
- `src/app/api/inngest/route.ts` — webhook handler for Inngest
- `src/inngest/functions/send-email.ts` — retry 3x, exponential backoff
- `src/inngest/functions/process-stripe-webhook.ts` — heavy DB writes
- `src/inngest/functions/recalculate-host-scores.ts` — hourly cron
- `src/inngest/functions/expire-trip-requests.ts` — daily cron
- `src/inngest/functions/invalidate-cache.ts` — cascade invalidation
- `src/inngest/functions/create-notification.ts` — in-app + optional email

**What moves out of request path:**

| Currently inline | Becomes async | Retry policy |
|-----------------|--------------|-------------|
| Welcome email (register) | `send-email` function | 3x, 1s/10s/60s |
| Host notification email (conversation unlock) | `send-email` function | 3x |
| Booking confirmation email | `send-email` function | 3x |
| Password reset email | Stays inline (user is waiting) | — |
| Stripe webhook DB writes | `process-stripe-webhook` | 5x, 1s/30s/5m/30m/2h |
| Review request (24h delay) | `send-email` + scheduled | 3x |
| Host score recalc | `recalculate-host-scores` cron | 3x |
| Trip expiry | `expire-trip-requests` cron | 3x |

**Estimated effort:** 2-3 days

### 4.4 Webhook Idempotency

**Why:** Stripe can deliver the same webhook event multiple times (network retries, at-least-once delivery). Without deduplication, a `checkout.session.completed` event processed twice creates duplicate subscription records or charges.

**Implementation:**
- Before processing: `GET stripe:event:{eventId}` from Redis
  - If exists → return 200 immediately (already processed)
  - If not → process the event
- After successful processing: `SET stripe:event:{eventId} 1 EX 172800` (48h TTL)

**File to modify:** `src/app/api/webhooks/stripe/route.ts`

**Estimated effort:** 1-2 hours

### 4.5 Database Hardening

**Missing indexes (add via Drizzle migration):**
```sql
-- GIN indexes for array columns (categories[], languages[])
-- These are used by arrayContains() in search queries
CREATE INDEX CONCURRENTLY idx_host_categories ON host_profiles USING GIN(categories);
CREATE INDEX CONCURRENTLY idx_host_languages ON host_profiles USING GIN(languages);

-- Prefix search on city names (for typeahead)
CREATE INDEX CONCURRENTLY idx_city_name_prefix ON cities(name text_pattern_ops);

-- Hourly rate for range queries
CREATE INDEX CONCURRENTLY idx_host_rate ON host_profiles(hourly_rate_cents) WHERE is_active = true;
```

**Connection pooling:**
- Enable Supabase PgBouncer in transaction mode
- Set `DATABASE_URL` to pooler URL (port 6543) for API routes
- Set `DATABASE_URL_DIRECT` to direct URL (port 5432) for migrations only
- Max connections: 60 (free tier), upgrade to Pro for 200

**Monitoring:**
- Enable `pg_stat_statements` for slow query detection
- Set alert: any query >500ms → log to Sentry

**Backup:**
- Enable Supabase PITR on Pro plan ($25/mo)
- RPO: <1 second (continuous WAL shipping)
- Test restore quarterly

**Estimated effort:** 1 day

### 4.6 Health Endpoint

**File:** `src/app/api/health/route.ts`

**Checks:**
1. Database connectivity — `SELECT 1` (timeout 2s)
2. Redis connectivity — `PING` (timeout 1s)
3. Current timestamp (proves the function is executing)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-06-12T10:00:00Z",
  "checks": {
    "database": { "status": "up", "latency_ms": 12 },
    "redis": { "status": "up", "latency_ms": 3 }
  }
}
```

**Monitoring:**
- Betterstack pings `GET /api/health` every 60s from 10 global locations
- Alert: 2 consecutive failures → SMS + email
- Status page: `status.offmap.com`

**Estimated effort:** 2 hours

### 4.7 Structured Logging

**Why:** `console.log("error:", err)` is useless at scale. Need JSON logs with request ID, user ID, endpoint, latency, and error context for debugging.

**File:** `src/lib/logger.ts` (Pino)

```
npm install pino
```

**Log fields:**
- `requestId` — unique per request (UUID)
- `userId` — authenticated user (if any)
- `method` — GET/POST/etc.
- `path` — /api/hosts/search
- `statusCode` — 200/401/500
- `duration_ms` — request latency
- `error` — error name + message (never stack traces in prod logs to avoid PII leaks)

**Rules:**
- Never log PII (email, name, IP, phone) — GDPR requirement
- Log IP only as hash — `sha256(ip + daily_salt)`
- Log levels: `info` (requests), `warn` (retries, fallbacks), `error` (failures)
- In production: JSON format → Vercel log drain → Betterstack or Datadog
- In development: pretty-printed for readability

**Estimated effort:** 1 day

### 4.8 Testing Foundation

**Unit/Integration tests (Vitest):**
```
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Priority test targets (ordered by blast radius):**
1. Stripe webhook handler — payment flows must never break
2. Subscription check logic — gates all premium features
3. Booking fee calculation — financial accuracy is non-negotiable
4. Auth middleware — protects all private routes
5. Search API — most-used endpoint
6. Zod validators — input validation shapes

**E2E tests (Playwright):**
```
npm install -D @playwright/test
```

**Critical user journeys:**
1. Register → subscribe → unlock host → send message → book session
2. Host onboarding → profile live → receive booking → accept
3. Traveler posts trip → host responds → traveler views responses
4. Account deletion (GDPR) → data anonymized → session cleared

**CI integration:**
- Add to `.github/workflows/ci.yml`: `npm run test` (Vitest) + `npx playwright test` (E2E)
- Block merge on test failure
- Target: 80% coverage on API routes, 100% on payment/booking flows

**Estimated effort:** 3-5 days (initial setup + critical path tests)

---

## 5. Phase 2: Performance & Resilience (Month 3-4)

> Goal: Fast everywhere, breaks nowhere. Support 5K-25K users.

### 5.1 CDN & Edge Optimization

**Cloudflare (free plan initially, Pro at $20/mo when needed):**
- DNS + CDN for all static assets
- Image optimization: auto WebP/AVIF, responsive sizes
- Edge caching rules:
  - `/api/cities` — cache 1hr at edge (public, rarely changes)
  - `/api/stats` — cache 10min at edge
  - `/api/reviews/featured` — cache 10min at edge
  - All other API routes: no edge cache (dynamic, authenticated)

**Next.js ISR (Incremental Static Regeneration):**

| Page | Strategy | Revalidate | Invalidation |
|------|----------|-----------|-------------|
| `/` (home) | ISR | 300s (5 min) | On-demand via `revalidatePath('/')` |
| `/hosts/[id]` | ISR | 60s (1 min) | On-demand on profile edit |
| `/search` | Client-side | N/A (too dynamic) | Cache at Redis layer |
| `/about`, `/faq`, etc. | Static | Build-time | Redeploy |
| `/pricing` | Static | Build-time | Redeploy |

**Supabase Storage + CDN:**
- User uploads served via Supabase CDN (already S3-compatible)
- Add `Cache-Control: public, max-age=31536000, immutable` for host photos
- Avatar uploads: include content hash in filename → immutable caching

### 5.2 Database Read Replicas

**When:** Supabase Pro plan ($25/mo) supports read replicas.

**Routing strategy:**

| Query Type | Target | Examples |
|-----------|--------|---------|
| Read (search, browse) | Replica | Host search, profile views, city list, reviews |
| Read (user-specific) | Replica | Notification list, conversation list, trip list |
| Write | Primary | Create booking, send message, update profile |
| Read-after-write | Primary (5s) then Replica | Profile just edited, message just sent |

**Implementation:**
```typescript
// src/lib/db/index.ts
export const dbWrite = drizzle(primaryPool)  // Frankfurt primary
export const dbRead  = drizzle(replicaPool)  // Read replica
```

**Replication lag:** Supabase streaming replication — typically <100ms. Acceptable for all read use cases.

### 5.3 Full-Text Search

**Phase A — PostgreSQL tsvector (immediate, zero cost):**

```sql
-- Add search vector column
ALTER TABLE host_profiles ADD COLUMN search_vector tsvector;

-- Populate existing rows
UPDATE host_profiles SET search_vector =
  setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(neighborhood, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C');

-- GIN index for fast lookup
CREATE INDEX idx_host_search_vector ON host_profiles USING GIN(search_vector);

-- Auto-update trigger
CREATE TRIGGER trig_host_search_vector
  BEFORE INSERT OR UPDATE OF headline, neighborhood, bio ON host_profiles
  FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', headline, neighborhood, bio);
```

**Search query:**
```sql
SELECT * FROM host_profiles
WHERE search_vector @@ plainto_tsquery('english', 'street food berlin')
  AND is_active = true AND moderation_status = 'approved'
ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'street food berlin')) DESC
```

**Phase B — Typesense (when >10K hosts):**
- Dedicated search engine: sub-10ms fuzzy search, typo tolerance, faceted filtering
- Sync via Inngest job on host profile create/update/delete
- Fallback to PostgreSQL if Typesense is down
- Cost: ~$50/mo for Typesense Cloud

### 5.4 Image Processing Pipeline

**Trigger:** Host uploads photo → Inngest job fires

**Pipeline steps:**
1. **Virus scan** — ClamAV or Cloudflare (reject malicious files)
2. **Strip EXIF** — Remove GPS coordinates, camera info (privacy)
3. **Generate sizes:**
   - Thumbnail: 200x200px (search cards, carousels)
   - Card: 600x400px (host profile card)
   - Full: 1200x800px (gallery view)
4. **Convert to WebP** — 60% smaller than JPEG at same quality
5. **Upload all sizes** to Supabase Storage with immutable filenames
6. **Update DB** with URLs for each size

**Serve:**
- `<img srcset>` with responsive sizes
- Cloudflare auto-negotiates WebP/AVIF based on browser `Accept` header
- `Cache-Control: public, max-age=31536000, immutable`

### 5.5 Real-Time Expansion

**Currently:** Only messages use Supabase Realtime.

**Expand to:**

| Feature | Channel | Event | User sees |
|---------|---------|-------|----------|
| Notifications | `user:{userId}:notifications` | INSERT | Bell icon badge updates live |
| Booking status | `booking:{bookingId}` | UPDATE | "Accepted!" appears without refresh |
| Conversation list | `user:{userId}:conversations` | UPDATE | Last message preview updates live |
| Trip responses | `trip:{tripId}:responses` | INSERT | New host response appears live |

**Implementation:** Supabase Realtime with RLS filters — each user only receives events for their own data.

### 5.6 Tiered Rate Limiting

**Current:** Flat 100 req/60s per IP for all endpoints.

**Upgrade:**

| Endpoint Group | Limit | Window | Why |
|---------------|-------|--------|-----|
| Auth (login, register, forgot-password) | 5 req | 15 min | Brute-force protection |
| Search | 30 req | 1 min | Heavy DB queries |
| Messages (send) | 60 req | 1 min | Spam prevention |
| AI chat | 10 req | 1 min | Cost control (Claude API) |
| Profile update | 10 req | 1 min | Abuse prevention |
| Webhooks (Stripe) | Unlimited | — | Signature-verified, trusted |
| Static (cities, stats) | 200 req | 1 min | Lightweight, cached |

**Implementation:** Extend Upstash rate limiter with per-route configs in middleware.

---

## 6. Phase 3: Global Scale (Month 5-8)

> Goal: Works in 50 countries. Support 25K-100K users.

### 6.1 Multi-Region Database

```
                    ┌──────────────────┐
                    │  Frankfurt (EU)   │
                    │  PRIMARY (writes) │
                    │  + Read Replica   │
                    └────────┬─────────┘
                             │ Streaming replication (~50ms lag)
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──┐  ┌───────▼────┐  ┌──────▼───────┐
    │  US East    │  │ Singapore  │  │  Sao Paulo   │
    │  Read Only  │  │ Read Only  │  │  Read Only   │
    └────────────┘  └────────────┘  └──────────────┘
```

**Routing:**
- Cloudflare Workers geo-route reads to nearest replica
- All writes go to Frankfurt primary (GDPR: EU PII stays in EU)
- Replication lag ~50ms — acceptable for read-after-write with brief primary fallback

### 6.2 Edge Computing

**Move to Cloudflare Workers / Vercel Edge Functions:**
- JWT validation (decode + verify, no DB needed)
- Subscription status check (Redis lookup only)
- Rate limiting (already at edge)
- Static API responses (cities, stats — serve from edge cache)

**Keep at origin:**
- Database writes (bookings, messages, profiles)
- Stripe API calls (payment intent creation, webhook processing)
- AI chat (streaming requires long-lived connections)
- Complex search queries (need full Postgres)

### 6.3 Multi-Currency

**Currencies to support (by expansion market):**

| Market | Currency | Stripe support |
|--------|----------|---------------|
| EU (Germany, Austria, Netherlands, etc.) | EUR | Native |
| UK | GBP | Native |
| Switzerland | CHF | Native |
| US | USD | Native |
| Poland | PLN | Native |
| Czech Republic | CZK | Native |

**Implementation:**
- Store all prices in EUR (source of truth)
- Exchange rates cached in Redis, refreshed daily via Inngest cron (ECB rates API)
- Display prices in user's local currency using `Intl.NumberFormat`
- Stripe checkout: pass `currency` parameter based on user's country
- Host rates: stored in EUR, displayed in traveler's currency with "approx." label

### 6.4 Internationalization (i18n)

**Phase A:** English + German (de) — biggest market
**Phase B:** Spanish (es), French (fr), Italian (it), Portuguese (pt)

**Framework:** `next-intl` (lightweight, App Router native)

**URL structure:** `/{locale}/search` → `/en/search`, `/de/search`

**What gets translated:**
- UI strings (buttons, labels, headings, error messages)
- Email templates
- Static page content (about, FAQ, terms, privacy)
- Search filter labels

**What does NOT get translated:**
- User-generated content (bios, reviews, messages)
- Host names, city names
- Financial amounts (use Intl.NumberFormat instead)

**SEO:** `hreflang` tags on all public pages, localized `<meta>` descriptions

### 6.5 Regional Compliance

| Region | Regulation | Requirements |
|--------|-----------|-------------|
| EU | GDPR | Already built — consent, export, deletion, audit logs |
| UK | UK GDPR | Nearly identical to EU GDPR, separate DPA |
| US (California) | CCPA | "Do Not Sell My Data" toggle, privacy notice |
| Brazil | LGPD | Similar to GDPR, Portuguese privacy notice |

**Implementation:**
- Cookie consent banner with granular controls (analytics, marketing, functional)
- Region detection via Cloudflare `CF-IPCountry` header
- Show appropriate consent UI per region
- Store consent per category in `users.consent_preferences` (JSONB)

### 6.6 Payment Infrastructure

**Stripe Connect Express (host payouts):**
- Hosts onboard via Stripe Express (guided KYC)
- Booking payment → PaymentIntent with `transfer_data` to host's Connect account
- Platform takes 15% commission + 5% traveler service fee
- Automatic payout schedule (daily/weekly, host chooses)

**Local payment methods:**
- EU: SEPA Direct Debit, iDEAL (NL), Bancontact (BE), Sofort (DE/AT)
- UK: Bacs Direct Debit
- Enable via Stripe payment method configuration (zero code change per method)

**Tax handling:**
- Stripe Tax for automatic VAT/GST calculation
- Invoice generation for German Rechnungspflicht (invoicing obligation)
- Reverse charge for B2B cross-border EU transactions

---

## 7. Phase 4: Enterprise Scale (Month 9-12)

> Goal: Millions of users, thousands of transactions/second. Only if growth demands it.

### 7.1 Microservices (Only If Needed)

**Rule:** Do NOT decompose the monolith unless deployment frequency or team size demands it. A well-cached monolith on Vercel handles 100K+ users easily.

**Candidate services to extract (in order of independence):**

| Service | Why extract | Trigger |
|---------|-----------|---------|
| Search | Dedicated Typesense cluster, independent scaling, different deployment cadence | >50K hosts, search latency >200ms despite caching |
| Messaging | Dedicated WebSocket infrastructure, own database partitioning | >10K concurrent connections |
| Payments | Complex state machine, needs 100% uptime even during main app deploys | >1K transactions/day |
| Notifications | Fan-out pattern (push + email + SMS), independent scaling | >100K notifications/day |

**Communication:** Async events via Redis Streams (simple) or Kafka (if >10K events/sec)

### 7.2 Event-Driven Architecture

**Replace synchronous chains with events:**

```
Current (synchronous):
  POST /api/bookings → create booking → send email → notify host → update stats → respond

Future (event-driven):
  POST /api/bookings → create booking → emit "booking.created" → respond immediately
    ↓ (async consumers)
    ├── send-email consumer → booking confirmation email
    ├── notify-host consumer → in-app notification + push
    ├── update-stats consumer → recalculate host stats
    └── cache-invalidate consumer → bust relevant caches
```

**Benefits:**
- API response time: ~500ms → ~100ms (only does DB write + emit)
- Failures are isolated (email failure doesn't block booking)
- Easy to add new side effects without touching the booking endpoint
- Full event log for debugging and replay

### 7.3 Auto-Scaling

**Option A: Stay on Vercel (recommended until >500K users)**
- Vercel auto-scales serverless functions automatically
- Edge Functions for latency-sensitive routes (auto-scaled globally)
- No infrastructure management needed
- Consider Vercel Enterprise for SLA guarantees ($$$)

**Option B: Kubernetes (if team grows to 5+ engineers)**
- EKS (AWS) or GKE (Google Cloud)
- HPA triggers: CPU >70%, request queue >100, P95 >300ms
- Min 3 pods per service, max 50
- Rolling deployments with readiness/liveness probes
- Service mesh (Istio or Linkerd) for observability

### 7.4 Advanced Monitoring

**Grafana Cloud — unified dashboard:**

| Source | Metrics |
|--------|---------|
| Vercel | Request count, function duration, error rate, cold starts |
| Supabase | Active connections, query latency, rows read/written, storage usage |
| Upstash | Cache hit rate, eviction rate, memory usage, commands/sec |
| Stripe | Payment success rate, webhook delivery rate, dispute rate |
| Sentry | Error count, P95 latency, release health |
| Inngest | Job success/failure rate, queue depth, processing time |

**Alert thresholds:**

| Metric | Warning | Page (PagerDuty) |
|--------|---------|------------------|
| API P95 latency | >400ms | >1000ms |
| Error rate | >0.5% | >2% |
| DB connections | >70% capacity | >90% capacity |
| Redis memory | >70% | >90% |
| Payment failure rate | >3% | >10% |
| Webhook consecutive failures | 2 | 5 |
| Health check failure | 1 | 2 consecutive |

### 7.5 Security at Scale

| Measure | Tool | When |
|---------|------|------|
| WAF (Web Application Firewall) | Cloudflare managed rules | Phase 2 |
| DDoS protection | Cloudflare (automatic) | Phase 2 |
| Bot detection | Cloudflare Bot Management or hCaptcha | Phase 3 |
| Dependency scanning | Snyk in CI + GitHub Dependabot | Phase 1 |
| Penetration testing | Annual third-party audit (OWASP Top 10) | Phase 3 |
| SOC 2 Type II | If pursuing B2B/enterprise customers | Phase 4 |
| Encryption at rest | Supabase Vault for PII columns | Phase 3 |
| Secrets rotation | Automated key rotation (Stripe, Supabase, Redis) | Phase 3 |
| Leaked password check | HaveIBeenPwned API on registration | Phase 1 |

---

## 8. Cost Projections

### By Phase

| Phase | Timeline | Monthly Cost | Users Supported | Key Additions |
|-------|----------|-------------|-----------------|---------------|
| **Current** | Now | ~€95 | <1K | Vercel Pro $20, Supabase Free $0, Upstash Free ~$10, Resend Free $0 |
| **Phase 1** | Month 1-2 | ~€200 | 1K-5K | +Sentry Free $0, +Inngest Free $0, +Betterstack $20, Supabase Pro $25 |
| **Phase 2** | Month 3-4 | ~€500 | 5K-25K | +Read replica $25, +Cloudflare Pro $20, +Typesense $50, Upstash Pro $50 |
| **Phase 3** | Month 5-8 | ~€2,500 | 25K-100K | +Multi-region replicas, +Stripe Tax, +Translation service |
| **Phase 4** | Month 9-12 | ~€10,000 | 100K-1M+ | +Grafana Cloud, +PagerDuty, +Enterprise Vercel/K8s |

### Phase 2 Detailed Breakdown

| Service | Plan | Monthly |
|---------|------|---------|
| Vercel | Pro | $20 |
| Supabase | Pro (Frankfurt) | $25 |
| Supabase | Read Replica | $25 |
| Upstash Redis | Pro | $50 |
| Inngest | Pro | $50 |
| Sentry | Team | $26 |
| Betterstack | Starter | $20 |
| Cloudflare | Pro | $20 |
| Typesense Cloud | Starter | $50 |
| Resend | Starter | $20 |
| **Subtotal** | | **$306** |
| Stripe | 1.5% + €0.25/txn | Variable |
| **Total (est.)** | | **~€400-600** |

### Revenue vs. Cost Crossover

At current pricing (average €15/traveler subscription):
- **Break-even on Phase 2 costs (~€500/mo):** ~35 active subscribers
- **Break-even on Phase 3 costs (~€2,500/mo):** ~170 active subscribers
- **Break-even on Phase 4 costs (~€10,000/mo):** ~670 active subscribers

With booking commissions (15% host + 5% traveler on €60 avg session = ~€12/booking):
- 100 bookings/month adds ~€1,200 revenue
- Infrastructure costs are a small fraction of revenue at scale

---

## 9. Performance Targets

| Metric | Current (est.) | Phase 1 | Phase 2 | Phase 3+ |
|--------|---------------|---------|---------|----------|
| **Search P95** | ~400ms | <200ms | <100ms | <50ms |
| **Host profile P95** | ~300ms | <150ms | <80ms | <40ms |
| **Subscription check** | ~50ms | <10ms | <5ms | <3ms |
| **Message send** | ~200ms | <150ms | <100ms | <80ms |
| **Home page TTFB** | ~800ms | <400ms | <200ms | <100ms |
| **Image load (first)** | ~1.5s | ~800ms | <300ms | <200ms |
| **Uptime** | Unknown | 99.9% | 99.95% | 99.99% |
| **Error rate** | Unknown | <1% | <0.1% | <0.01% |
| **Deploy frequency** | Manual | 5+/day | 10+/day | 20+/day |
| **Rollback time** | Manual | <5 min | <2 min | <1 min |
| **Incident detection** | Hours | <5 min | <2 min | <30s |

### How Each Phase Achieves Its Targets

**Phase 1 (P95 <200ms):**
- Redis caches 80%+ of search/profile reads → eliminates DB round trip
- Background jobs remove 200-500ms email overhead from responses
- Database indexes eliminate full table scans on array columns

**Phase 2 (P95 <100ms):**
- CDN serves static assets from edge (0ms origin hit)
- ISR pages served from Vercel edge cache (<50ms)
- Read replicas distribute DB load (shorter query queue)
- Full-text search uses GIN index instead of LIKE scan

**Phase 3+ (P95 <50ms):**
- Multi-region read replicas → nearest DB is <20ms away
- Edge Functions handle session/subscription checks without origin round trip
- Typesense search in <10ms (dedicated search cluster)

---

## 10. Priority Matrix

```
                         HIGH IMPACT
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
      │  ★ Sentry            │  ★ Redis Cache       │
      │  ★ Health endpoint   │  ★ Inngest Jobs      │
      │  ★ Webhook idemp.    │  ★ Read Replicas     │
      │  ★ DB indexes        │  ★ Full-text search  │
      │  ★ Structured logs   │  ★ CDN + Images      │
      │                      │                      │
 LOW  │──────────────────────┼──────────────────────│ HIGH
EFFORT│                      │                      │ EFFORT
      │  ISR pages           │  Multi-region DB     │
      │  Rate limit v2       │  i18n (6 languages)  │
      │  Vitest setup        │  Microservices       │
      │  Cookie consent      │  Event sourcing      │
      │                      │  Kubernetes          │
      │                      │                      │
      └──────────────────────┼──────────────────────┘
                             │
                         LOW IMPACT
```

### Recommended execution order

| Order | Item | Phase | Effort | Impact |
|-------|------|-------|--------|--------|
| 1 | Sentry integration | 1 | 3 hours | Immediate visibility into errors |
| 2 | Health endpoint + Betterstack | 1 | 2 hours | Know when site is down |
| 3 | Redis caching layer | 1 | 2 days | 70%+ DB load reduction |
| 4 | Webhook idempotency | 1 | 2 hours | Prevent double charges |
| 5 | Database indexes (GIN) | 1 | 1 hour | Search 10x faster |
| 6 | Inngest background jobs | 1 | 3 days | Email reliability + faster responses |
| 7 | Structured logging | 1 | 1 day | Debug production issues |
| 8 | Vitest + critical tests | 1 | 3 days | Safe deployments |
| 9 | CDN + ISR pages | 2 | 2 days | Global performance |
| 10 | Read replicas | 2 | 1 day | DB scalability |
| 11 | Full-text search | 2 | 2 days | Search at scale |
| 12 | Image pipeline | 2 | 2 days | Faster page loads |
| 13 | Real-time expansion | 2 | 3 days | Live UI updates |
| 14 | Multi-currency | 3 | 3 days | International revenue |
| 15 | i18n (EN + DE) | 3 | 5 days | German market |

---

## 11. Disaster Recovery

### Recovery Objectives

| Metric | Target | How |
|--------|--------|-----|
| **RPO** (data loss tolerance) | <1 minute | Supabase PITR (continuous WAL shipping) |
| **RTO** (time to recover) | <15 minutes | Automated failover + one-click rollback |

### Failure Scenarios

| Scenario | Impact | Recovery | Time |
|----------|--------|----------|------|
| Bad Vercel deploy | Site broken | One-click rollback (Vercel keeps 10 deploys) | <2 min |
| Bad DB migration | Data corruption | Supabase PITR restore to pre-migration point | 15-60 min |
| Supabase regional outage | Reads fail | Redis cache absorbs reads for 2-5 min | Supabase-dependent |
| Stripe outage | New payments fail | Existing subs work from DB; new purchases queue via Inngest | Transparent |
| Redis outage | Cache miss | Fail open → all requests hit DB, log every fallback | Transparent |
| Resend outage | Emails fail | Inngest retries for 24 hours — emails delayed, not lost | Transparent |
| DNS/CDN outage | Total outage | Cloudflare has 100% SLA; failover DNS to backup provider | <5 min |

### Runbook Requirements

Each scenario needs a documented runbook containing:
1. Detection method (how do we know it happened?)
2. Severity classification (P0-P3)
3. Immediate mitigation steps
4. Root cause investigation steps
5. Communication plan (status page update, user notification)
6. Post-mortem template

### Chaos Testing (Phase 4)

Monthly "game day" exercises:
- Kill a random service, verify others continue functioning
- Simulate Redis outage, verify DB fallback works
- Deploy broken code, verify rollback works in <2 min
- Simulate Stripe webhook storm, verify idempotency holds
- Run load test at 10x normal traffic, identify breaking point

---

## 12. Security at Scale

### Defense in Depth

```
Layer 1: Cloudflare WAF + DDoS protection + Bot management
    │
Layer 2: Rate limiting (Upstash Redis, tiered per endpoint)
    │
Layer 3: CSRF protection (Origin header check in middleware)
    │
Layer 4: Authentication (Supabase Auth, JWT validation)
    │
Layer 5: Authorization (RLS at database level)
    │
Layer 6: Input validation (Zod schemas on every endpoint)
    │
Layer 7: Output sanitization (never return raw error.message)
    │
Layer 8: Audit logging (every data change in audit_logs table)
```

### Security Checklist by Phase

**Phase 1:**
- [ ] Add Sentry (error tracking catches security-relevant failures)
- [ ] Add `npm audit --audit-level=high` to CI
- [ ] Enable GitHub Dependabot for auto-dependency updates
- [ ] Add leaked password check (HaveIBeenPwned API) on registration
- [ ] Run Mozilla Observatory scan, fix any issues
- [ ] Enable Supabase email verification
- [ ] Review and test all RLS policies with real Supabase auth

**Phase 2:**
- [ ] Add Cloudflare WAF (managed rules for OWASP Top 10)
- [ ] Add Snyk to CI pipeline for deep dependency scanning
- [ ] Implement Content-Security-Policy header (strict)
- [ ] Add Subresource Integrity (SRI) for third-party scripts
- [ ] Enable Supabase database encryption at rest

**Phase 3:**
- [ ] Annual penetration test by third-party firm
- [ ] Implement secrets rotation (Stripe keys, Supabase keys, Redis)
- [ ] Add Supabase Vault for column-level encryption (email, phone, ID docs)
- [ ] Implement IP-based geo-blocking for admin endpoints
- [ ] Add anomaly detection on auth endpoints (unusual login patterns)

**Phase 4:**
- [ ] SOC 2 Type II certification (if pursuing enterprise/B2B)
- [ ] Bug bounty program (HackerOne or similar)
- [ ] Formal incident response plan with legal team
- [ ] Data Processing Agreement (DPA) templates for enterprise clients
- [ ] Regular security awareness training for team

---

## Appendix A: Key Files Reference

| Purpose | Current File | Notes |
|---------|-------------|-------|
| Database schema | `src/lib/db/schema.ts` | 17 tables, all indexes defined |
| Drizzle config | `drizzle.config.ts` | Points to DATABASE_URL |
| Middleware | `src/middleware.ts` | Auth, CSRF, rate limiting |
| Stripe integration | `src/lib/stripe/index.ts` | Checkout, portal, webhook verify |
| Supabase clients | `src/lib/supabase/server.ts` | Server, admin, browser clients |
| Email templates | `src/lib/email/index.ts` | 6 email types |
| Search API | `src/app/api/hosts/search/route.ts` | Main bottleneck for caching |
| Webhook handler | `src/app/api/webhooks/stripe/route.ts` | Needs idempotency |
| Mock database | `src/lib/mock/db.ts` | Full in-memory simulation |
| Validators | `src/lib/validators/index.ts` | All Zod schemas |
| Next.js config | `next.config.js` | Security headers, output: standalone |
| CI pipeline | `.github/workflows/ci.yml` | Typecheck + lint + build |

## Appendix B: Technology Selection Rationale

| Need | Chosen | Why Not Alternatives |
|------|--------|---------------------|
| Job queue | Inngest | Serverless-native (Vercel), no infra. Not Bull (needs Redis instance mgmt), not SQS (AWS lock-in) |
| Search | PostgreSQL tsvector → Typesense | Free first, scale later. Not Algolia (expensive), not Elasticsearch (overkill, ops heavy) |
| CDN | Cloudflare | Best free tier, global network, WAF included. Not AWS CloudFront (complex, expensive) |
| Monitoring | Sentry + Betterstack | Free tiers cover Phase 1. Not Datadog (expensive), not New Relic (expensive) |
| Caching | Upstash Redis | Already using for rate limiting, serverless-native. Not Memcached (less features), not local cache (doesn't share across functions) |
| Logging | Pino | Fastest Node.js logger, JSON by default. Not Winston (slower), not console.log (unstructured) |
| Testing | Vitest + Playwright | Fast, TypeScript native, good DX. Not Jest (slower), not Cypress (heavier) |
| i18n | next-intl | App Router native, lightweight. Not next-i18next (Pages Router legacy), not DIY |
| Email queue | Via Inngest | Consolidate on one job system. Not dedicated email queue (another service to manage) |

---

*This document should be reviewed quarterly and updated as the platform scales. Each phase should be triggered by user growth metrics, not calendar dates — don't over-engineer ahead of demand.*
