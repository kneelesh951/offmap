# Payments, Environments & CI/CD Reference

> Companion to `docs/SECURITY_PLAN.md` and `docs/FLOW_AUDIT_2026-06-14.md`.
> Living doc — update as the architecture evolves.

---

## 1. Payment flow — what exists today

Two distinct payment surfaces. **Only the first is real today.**

### 1.1 Traveler Subscription — FULLY WIRED

End-to-end flow in both mock and production code paths.

```
PricingCards.tsx
   └─> POST /api/subscriptions/checkout
          ├─ mock branch: returns /api/mock/checkout?token=...   → instant activation
          └─ prod branch: returns Stripe Checkout URL            → real card capture
                                                                  → checkout.session.completed webhook
                                                                  → POST /api/webhooks/stripe
                                                                       → insert subscription row
                                                                       → sendSubscriptionConfirmationEmail
```

Key files:

| File | Role |
|---|---|
| `src/app/api/subscriptions/checkout/route.ts` | Mock + Stripe Checkout session creation |
| `src/app/api/subscriptions/portal/route.ts` | Customer Portal (cancel, invoices) |
| `src/app/api/subscriptions/route.ts` | GET current subscription status |
| `src/app/api/webhooks/stripe/route.ts` | Handles 4 events (see below) |
| `src/lib/stripe/index.ts` | Stripe SDK wrapper — checkout, portal, signature verify |
| `src/lib/mock/stripe.ts` | In-memory mock equivalent |
| `src/app/api/mock/checkout/route.ts` | Dev-only checkout return endpoint |
| `src/components/ui/SubscribeModal.tsx` | UI |

Webhook events handled (**5**, not 4 — verified in code 2026-06-30):
- `checkout.session.completed` → create subscription record + confirmation email + revenue log
- `invoice.payment_succeeded` → log revenue for recurring renewals (skips the first invoice, already logged by checkout)
- `customer.subscription.updated` → sync plan/status changes
- `customer.subscription.deleted` → mark cancelled + send cancellation email
- `invoice.payment_failed` → mark past_due + send payment-failed email

Revenue events go to `logRevenueEvent()` (`src/lib/revenue/log.ts`). Register all 5 events when creating the webhook endpoint in the Stripe Dashboard.

Stripe Checkout is configured with:
- `consent_collection.terms_of_service: 'required'` (EU/AGB requirement)
- `payment_method_options.card.request_three_d_secure: 'automatic'` (PSD2/SCA)
- `locale: 'auto'`

### 1.2 Booking payments — NOT WIRED

`POST /api/bookings` calculates fees (5% traveler service fee + 15% host commission) and writes a booking record, but **never creates a Stripe PaymentIntent and never charges anyone**.

`src/lib/booking/cancellation.ts` has the refund-tier engine ready, but there's no real charge to refund against.

**Stripe Connect (host payouts) is not implemented:** no `host_profiles.connect_account_id` column, no Express account onboarding, no `host_payouts` table.

Bookings today are a UX shell waiting for Connect to be wired in Phase 1.

---

## 2. How to test payments on local dev

### 2.1 Subscription flow in mock mode (default — works today)

1. Dev server: `npm run dev`
2. Login as `traveler@demo.com` / `demo1234`
3. Click Subscribe → choose any plan → instant activation
4. `GET /api/subscriptions` shows `isActive: true`

### 2.2 Subscription flow against real Stripe test mode

Useful for exercising the real Checkout UI + webhook handler locally.

```bash
# 1. Get test keys from dashboard.stripe.com (Developers → API keys, Test mode toggle ON)
# 2. Create 4 recurring products: Day €6, Week €12, Month €18, Annual €49
# 3. Copy the 4 price IDs

# Edit .env:
MOCK_MODE=false
NEXT_PUBLIC_MOCK_MODE=false
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_DAY=price_...
STRIPE_PRICE_WEEK=price_...
STRIPE_PRICE_MONTH=price_...
STRIPE_PRICE_ANNUAL=price_...

# Run Stripe CLI to forward webhooks (separate terminal):
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_... it prints → STRIPE_WEBHOOK_SECRET in .env → restart dev server

# Test card: 4242 4242 4242 4242, any future expiry, any CVC
# 3DS-required test card: 4000 0027 6000 3184
```

Caveat: flipping `MOCK_MODE=false` requires real Supabase too (`DATABASE_URL`, `SUPABASE_*`). Direct Postgres TCP is blocked on the local network (see `project_infrastructure.md` memory) — fully real-mode dev only works on Vercel preview deploys.

### 2.3 Booking flow

Only testable in mock mode today. No real money moves. Full real-money testing is gated on building Stripe Connect (see §3.2).

---

## 3. Production changes needed

### 3.1 Subscriptions — minimum viable

| # | Change | Effort |
|---|---|---|
| 1 | Create 4 LIVE products in Stripe Dashboard | 15 min |
| 2 | Add live keys + webhook secret to Vercel Production env | 10 min |
| 3 | Register webhook endpoint `https://offmap.com/api/webhooks/stripe` for the 4 events | 5 min |
| 4 | **Webhook idempotency** via Upstash `SETNX stripe:event:{event.id} 1 EX 172800` — comment at `src/app/api/webhooks/stripe/route.ts:46` says "Phase 1 add Redis-based deduplication" — NOT done | 1 hour |
| 5 | **Cron `CRON_SECRET` fail-closed** — `src/app/api/cron/emails/route.ts:23` fails OPEN today (SECURITY_PLAN P0 #1) | 5 min |
| 6 | Stripe Customer Portal config — enable cancellation, payment update, invoice download in dashboard | 10 min |
| 7 | **14-day withdrawal waiver checkbox** at checkout (EU FernAbsG) — `consent_collection.terms_of_service: 'required'` is set, but the explicit waiver for digital services is missing | 1-2 hours |
| 8 | Test all 4 events with `stripe trigger` in test mode before going live | 30 min |

### 3.2 Booking payments — Stripe Connect (Phase 1, multi-week)

| Component | Effort |
|---|---|
| `host_profiles.stripe_connect_account_id` nullable column (Drizzle migration) | 30 min |
| Host onboarding to Stripe Connect Express in `/host-onboarding` | 2-3 days |
| Modify `POST /api/bookings` to create PaymentIntent with `application_fee_amount` + `transfer_data.destination` + `capture_method: 'manual'` | 1 day |
| Webhook handlers: `payment_intent.succeeded`, `payment_intent.canceled`, `charge.refunded`, `account.updated` | 1 day |
| Refund via `stripe.refunds.create` using existing cancellation engine | 1 day |
| `host_payouts` table for payout tracking | 30 min |
| Block bookings on hosts who haven't completed Connect onboarding | 1 hour |
| 26h-post-session auto-capture cron (per CLAUDE.md booking policy) | 1 day |

**Recommended order:** ship subscriptions first (Phase 0), prove revenue model, add Connect in Phase 1 (4-6 weeks post-launch).

---

## 4. Three-environment architecture

**Principle: one codebase, three deployments.** Vary only environment variables.

### 4.1 Layout

```
GitHub repo: kneelesh951/offmap
  main branch         → PRODUCTION   (offmap.com)
  staging branch      → UAT          (staging.offmap.com)
  feature/* branches  → PREVIEW URLs (auto per PR)
  local               → http://localhost:3000 (dev, mock mode)

Vercel project: offmap
  Production env  (tied to main)
  Preview env     (all non-main; staging.offmap.com is a named preview alias)
  Development env (rarely used)

Supabase: TWO separate projects (both in eu-central-1)
  offmap-staging  → UAT data
  offmap-prod     → real users

Stripe: ONE account, two modes
  Test mode  → used by staging
  Live mode  → used by production
```

### 4.2 Env var matrix

| Variable | Local | UAT (staging.offmap.com) | Production (offmap.com) |
|---|---|---|---|
| `MOCK_MODE` | `true` | `false` | `false` |
| `NEXT_PUBLIC_MOCK_MODE` | `true` | `false` | `false` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://staging.offmap.com` | `https://offmap.com` |
| `DATABASE_URL` | unset | staging Supabase | prod Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | unset | staging project | prod project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | unset | staging | prod |
| `SUPABASE_SERVICE_ROLE_KEY` | unset | staging | prod |
| `STRIPE_SECRET_KEY` | unset | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | unset | whsec for staging endpoint | whsec for prod endpoint |
| `STRIPE_PRICE_*` | unset | test-mode price IDs | live-mode price IDs |
| `RESEND_API_KEY` | unset | test domain key | verified prod domain |
| `RESEND_FROM_EMAIL` | unset | `noreply@staging.offmap.com` | `noreply@offmap.com` |
| `UPSTASH_REDIS_*` | unset | separate staging DB | separate prod DB |
| `CRON_SECRET` | unset | random per-env | different random |
| `SENTRY_DSN` | unset | staging Sentry project | prod Sentry project |
| `NEXT_PUBLIC_SENTRY_ENV` | `development` | `staging` | `production` |

Vercel UI: Settings → Environment Variables → each variable can be scoped to (Production / Preview / Development) independently.

### 4.3 Why two Supabase projects (non-negotiable)

- Mixing UAT and prod data → test data leaks into production
- RLS regression tests need an environment you can wipe
- Cost: free tier × 2, or $25/mo × 2 once upgraded to Pro
- Both in Frankfurt (eu-central-1) for GDPR

### 4.4 Branch / promotion flow

```
1. git checkout -b feature/<name>
2. push → Vercel auto-creates preview URL on the PR
3. PR review (uses staging Stripe + staging Supabase)
4. merge → staging → auto-deploys to staging.offmap.com
5. UAT smoke test on staging
6. PR staging → main → merge → auto-deploys to offmap.com
```

Four safety levels: local mock → PR preview → staging UAT → production.

---

## 5. CI/CD setup

### 5.1 Existing workflows (already in `.github/workflows/`)

| File | What it does | Status |
|---|---|---|
| `ci.yml` | typecheck + lint + build on PRs to main/staging | ✅ working |
| `migrate.yml` | runs `npm run db:migrate` on push to staging or main when schema/migration files change. Uses `STAGING_DATABASE_URL` / `PRODUCTION_DATABASE_URL` secrets | ✅ structure ready, secrets must be set |
| `preview.yml` | comments PR with demo creds + preview URL placeholder | ✅ working |

### 5.2 Gaps to close

1. **`npm audit --audit-level=high`** step in `ci.yml` (SECURITY_PLAN P0 item 14)
2. **Snyk OSS scan** in `ci.yml` (SECURITY_PLAN P0 item 14)
3. **Dependabot** — `.github/dependabot.yml` for npm + GitHub Actions weekly updates (P0 item 15)
4. **GitHub secrets** that must be set:
   - `STAGING_DATABASE_URL`
   - `PRODUCTION_DATABASE_URL`
   - `SNYK_TOKEN` (after adding Snyk step)
5. **Vercel-GitHub integration** — confirm linked so pushes auto-deploy
6. **Migration safety:** every new column nullable first, never rename, never drop in same release (CLAUDE.md rule)

### 5.3 Rollback

| Scenario | Recovery |
|---|---|
| Bad prod deploy | Vercel Dashboard → Deployments → Promote a previous good build (one click) |
| Bad DB migration | Backwards-compat rule means previous code still runs; Supabase PITR (Pro) restores within 15-60min |
| Wrong env var | Vercel Dashboard → edit + redeploy |

---

## 6. Action checklist — staged

### Already on laptop (no external deps)
- [ ] Add `npm audit` step to `ci.yml`
- [ ] Add Snyk step to `ci.yml` (token in GitHub secrets)
- [ ] Add `.github/dependabot.yml`
- [ ] Create `staging` branch locally
- [ ] Webhook idempotency code change (uses Upstash, but logic-only changes are safe in mock)
- [ ] Cron fail-closed fix

### Needs Vercel + Stripe + Supabase setup
- [ ] Create 2nd Supabase project (staging) in Frankfurt
- [ ] Create Vercel project, link to GitHub repo
- [ ] Configure 3 env scopes in Vercel with correct keys
- [ ] Add 4 Stripe test products → put test price IDs in Vercel Preview env
- [ ] Push `staging` branch → confirm `staging.offmap.com` deploys
- [ ] Run subscription flow end-to-end against staging
- [ ] Set `STAGING_DATABASE_URL` + `PRODUCTION_DATABASE_URL` in GitHub secrets

### Before real money flows
- All P0 items from `docs/SECURITY_PLAN.md`
- Live Stripe products + live keys in Vercel Production env
- Real domain + DNS + SSL (Vercel handles)
- Privacy / Impressum / AGB legal pages with real content
- One real €6 day-pass purchase → refund yourself (full prod smoke test)

---

## 7. Quick reference — integration & test guide (verified 2026-06-30)

Distilled from a code review of the actual payment routes. Use this as the at-a-glance version of §1–3.

### 7.1 What's real vs. shell

| Surface | Status | Proof in code |
|---|---|---|
| Traveler subscription (Day/Week/Month/Annual) | ✅ Real, mock + prod | `subscriptions/checkout/route.ts` branches on `MOCK_MODE`; webhook runs full lifecycle |
| Booking payments (5% traveler + 15% host commission) | ❌ Shell — computes fees, writes `pending` row, **never charges** | `bookings/route.ts:148` inserts row, no `PaymentIntent` |
| Stripe Connect / host payouts | ❌ Not built | `grep PaymentIntent\|application_fee\|connect_account` → 0 hits |

### 7.2 Local testing

- **Mock mode (default — use this 95% of the time):** `npm run dev` → login `traveler@demo.com` / `demo1234` → Subscribe → instant in-memory activation, no card. Bookings also testable here (no money moves). This is the *only* way to test bookings today.
- **Real Stripe test mode locally:** set `MOCK_MODE=false` + `sk_test_`/`pk_test_` + 4 test `price_…` IDs; run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_…` in `.env`; test card `4242 4242 4242 4242`. Trigger events headless with `stripe trigger checkout.session.completed`.
- **Local real-mode caveat:** `MOCK_MODE=false` needs real Supabase, but direct Postgres TCP is blocked on this network (see `project_infrastructure.md` memory). Checkout redirect + webhook signature verify work locally; the DB insert does not. Full real-Stripe E2E only works on a **Vercel preview/staging deploy**.

### 7.3 Production — go-live order

1. Ship **subscriptions** first (config-only, ~1 day): 4 live products → live keys in Vercel Production → register webhook for the **5** events → configure Customer Portal.
2. Close two laptop-only gaps before exposing prod: **webhook idempotency** (`webhooks/stripe/route.ts:46` TODO — `SETNX stripe:event:{id}` on Upstash) and **cron fail-closed** (`cron/emails/route.ts` `CRON_SECRET` currently fails open, SECURITY_PLAN P0 #1).
3. EU: add the **14-day digital-services withdrawal-waiver checkbox** at checkout (FernAbsG) — currently only `terms_of_service: 'required'` is set.
4. Final smoke test: `stripe trigger` all 5 events in test mode, then one real €6 day-pass purchase → self-refund.
5. **Bookings → Stripe Connect** is a Phase-1 net-new build (multi-week), not config. Do not block launch on it — see §3.2. Refund-tier engine (`src/lib/booking/cancellation.ts`) already exists, waiting on real charges to refund against.

---

*Last updated: 2026-06-30.*
