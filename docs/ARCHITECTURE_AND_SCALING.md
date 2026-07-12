# Architecture & Scaling Strategy

_Last updated: 2026-07 · Reference doc for pitches, technical due diligence, and future planning._

This document captures (1) the system-design principles the codebase actually
follows today, and (2) the deliberate strategy for how the architecture should
evolve — specifically the microservices vs. managed-services question.

---

## Part 1 — System Design Principles (what's actually built)

These are the principles genuinely present in the code, not aspirational. Use
this section verbatim when asked "what architecture / principles are you using?"

### One-line summary
> A Next.js monolith on serverless, built around a config-driven dual-mode
> architecture, strict validation at every API boundary, GDPR-first data
> modeling, and defense-in-depth security — pragmatically layered to avoid
> premature complexity for the current stage.

### 1. Config-driven dual-mode (dependency inversion) — the standout pattern
Every external service (database, payments, email, cache) sits behind a single
`MOCK_MODE` config switch. Flip it and the entire platform runs in-memory with
zero external dependencies, or on real infrastructure — business logic is
identical either way. Real service clients are **lazily imported inside the real
branch** so they never crash when keys are absent.
- ~34 of 36 API routes implement this branch.
- Enables full offline development, demos, and testing without any provider.
- This is real dependency inversion; most early-stage products lack it.

### 2. Validation boundary — "parse, don't trust"
Every API request is validated with **Zod** before any business logic runs, and
every response uses one consistent envelope: `{ success, data }` or
`{ success, error: { code, message } }`. The untrusted outside world is parsed
into known-good shapes at the system edge.

### 3. GDPR-first, EU-native data modeling
Compliance lives in the schema, not bolted on afterward:
- Audit logs on every significant data change.
- Anonymize-not-delete rules; messages never hard-deleted (legal audit trail).
- EU (Frankfurt / `eu-central-1`) data residency requirement.
- Money stored as integer **cents** to avoid floating-point rounding errors.

### 4. Defense in depth (security)
Layered controls, no single point of failure:
- CSRF origin checks + rate limiting in middleware.
- Row-Level Security at the database — an API-layer bug still can't leak data
  across users.
- HttpOnly cookies, hardened HTTP security headers.

### 5. Zero-downtime migration discipline
Schema changes are additive and backwards-compatible: new columns nullable
first, backfill, then constrain. Never rename in place. Deploys need no downtime.

### 6. Pragmatic layering (the deliberate one)
An enterprise service-layer architecture is documented as the *destination*, but
intentionally not over-built. Business logic currently lives close to the route
handlers because that is faster to reason about for a solo founder. The
abstraction is introduced when a team or a second consumer justifies it — not
before. This is a judgment call, not tech debt.

### The through-line
> **Correctness and optionality now; scale-complexity later.**
> The architecture protects data integrity and preserves the ability to move
> fast and swap providers, without paying for infrastructure the current scale
> doesn't need.

---

## Part 2 — Evolution Strategy: Microservices vs. Managed Services

The critical distinction: **microservices** (splitting *your* code into
separately deployed services) and **managed cloud services** (offloading whole
capabilities to providers) are opposite moves. Conflating them is a common and
costly mistake.

### Microservices — deliberately deferred (likely indefinitely)
Splitting the app into separately deployed services would be **harmful** at the
current stage:
- Microservices are an **organizational** solution — they let multiple teams
  deploy independently. With a solo founder / tiny team, it's all cost, no
  benefit.
- They turn in-process function calls into network calls (failures, timeouts,
  ordering) and single DB transactions into distributed-transaction problems.
- Vercel serverless already scales each API route independently and
  automatically — the scaling benefit is already present without splitting.

**Rule of thumb:** microservices aren't earned until a shared codebase causes
real deploy conflicts — roughly 15–20+ engineers. Not a near-term concern.

### Managed cloud services — the correct path (already in use)
Offload capabilities to providers so there is less code to write and run. The
codebase is already built this way (Supabase, Stripe, Upstash, Resend, Vercel),
and the dual-mode architecture lets each slot in behind a `MOCK_MODE` branch
without rewriting logic.

| Need | Managed service | When |
|---|---|---|
| Background jobs (email, notifications, retries) | Inngest / Vercel Queues | Phase 1 — remove sends from request path |
| Error monitoring | Sentry | Before real users |
| Search at scale | Typesense / Algolia | 10K+ hosts (outgrow Postgres ILIKE) |
| File / image storage | Supabase Storage / Cloudflare R2 | Already wired (avatars) |
| Host payouts | Stripe Connect | Phase 1 bookings |
| ID verification | Stripe Identity / Onfido | When automating host vetting |

### The realistic middle path: modular monolith
Keep the monolith; evolve its internal structure:
1. **Now:** logic near routes. Fine.
2. **When messy** (route files >300 lines, or duplicated logic): extract a
   `src/lib/services/` layer *within the same app* — same deploy, same DB,
   cleaner boundaries. This is the documented "Layer 4 Services." ~90% of the
   separation benefit, 0% of the distributed-systems pain.
3. **Only if forced:** extract a *single* piece into its own service, and only
   when it has a genuinely different scaling/runtime need (e.g. a realtime
   websocket server at high chat volume, or the AI concierge needing
   long-running/GPU inference). Extract one thing, reluctantly, because a metric
   forced it.

### The rule to remember
> **Offload capabilities to managed services eagerly.**
> **Split your own code into services reluctantly.**
>
> Managed services make a solo founder faster. Microservices make a solo founder
> slower. Adopt cloud services to ship features; resist microservices until team
> size actually demands them.
