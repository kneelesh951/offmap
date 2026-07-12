# Admin Dashboard Plan — Internal-Only Analytics

> Companion to `docs/PAYMENTS_AND_ENVIRONMENTS.md` and `docs/SECURITY_PLAN.md`.
> Decision: admin/analytics surfaces are **internal-only by default**. Never deployed at `offmap.com/admin/*` or any other publicly-reachable URL.

---

## 1. Core principle

Admin dashboards expose revenue numbers, user PII, host payouts, dispute details, refund amounts, and other commercially-sensitive data. Public-internet exposure of these surfaces — even gated by role checks — is unacceptable because:

- The role check is the only thing standing between attackers and the data; a single bug leaks everything.
- Even a perfectly-implemented role check returns 401/403, which *advertises* that the admin surface exists.
- Vercel preview deployments + open-source codebases can leak admin route names via build artifacts.

The right pattern is **defense in depth**: hide the surface (network), then gate it (auth), then check role (app). Most attackers can't get past step one.

---

## 2. The three free internal-only patterns

### Level 0 — Use the tools you already have (recommended for Phase 0)

| Surface | Where it lives | How it's gated |
|---|---|---|
| Stripe Dashboard | dashboard.stripe.com | Stripe login + 2FA |
| Supabase Studio SQL Editor | app.supabase.com | Supabase login + 2FA |
| Resend Dashboard | resend.com/dashboard | Resend login |
| Vercel Analytics | vercel.com/dashboard | Vercel login |

All four are SaaS consoles you already pay for (or get free with your accounts). None are reachable from `offmap.com`. None require any code to maintain. Combined, they cover 90% of what you need for the first 100 paying users.

**Cost: €0. Lines of code: 0. Public attack surface: 0.**

### Level 1 — Tailscale-gated dashboard (when you outgrow SQL snippets)

- Install **Tailscale** on your laptop + phone (free up to 100 devices, personal use)
- Run admin Next.js pages on a small VM (Oracle Cloud Always Free 1GB VM is the cheapest)
- Bind the server to the Tailscale interface only — invisible to the public internet
- Open `http://offmap-admin/` from your laptop; the public can't even DNS-resolve it

**Cost: €0. Effort: ~half a day Tailscale + VM setup. Visibility to internet: zero.**

### Level 2 — Cloudflare Access subdomain (when you share with advisors/team)

- Deploy admin pages on `admin.offmap.com` (separate Vercel project or build target)
- Put the entire subdomain behind **Cloudflare Access** (free up to 50 users, Zero Trust plan)
- Users hitting `admin.offmap.com` are bounced to Google SSO *at Cloudflare* before reaching the app
- The Next.js app never sees an unauthenticated request

**Cost: €0** (Cloudflare Zero Trust free tier). **Effort: ~1 hour Cloudflare setup once.**

---

## 3. What is explicitly NOT allowed

- ❌ `offmap.com/admin/*` routes — even with role checks, the surface is on the public internet
- ❌ "Security by obscurity" / hidden URLs — better than nothing, not "internal"
- ❌ IP allowlist alone — home/mobile IPs change; locks you out
- ❌ HTTP Basic Auth on a public URL — credentials over the wire, weak by modern standards

If a future contributor opens a PR adding `src/app/admin/...`, it must be rejected unless one of the three levels above is in place.

---

## 4. Recommended phasing

| Stage | Users | Pattern | Action |
|---|---|---|---|
| Phase 0 | 0 → 100 paying | Level 0 | Bookmark Stripe, Supabase, Resend dashboards. Save 10 SQL snippets in Supabase Studio. |
| Phase 1 | 100 → 500 paying | Level 1 (Tailscale) | Build minimal Next.js admin app, run on Oracle Cloud Always Free VM behind Tailscale. |
| Phase 2 | 500+ paying or any non-technical reviewer needs access | Level 2 (Cloudflare Access) | Deploy admin to `admin.offmap.com` behind Cloudflare Access SSO. |
| Phase 3 | Series A scale | Dedicated BI tool inside corporate SSO | Metabase Cloud / Looker / etc. inside SSO. |

You can skip every paid analytics tool on this path indefinitely.

---

## 5. Foundation: `revenue_events` table (must exist before real bookings)

Regardless of which dashboard level you're at, every dashboard reads from a single append-only table. Schema below; add **before** the first real charge so backfill isn't required.

```ts
revenueEvents pgTable
  id              uuid primary key default random()
  type            revenue_event_type enum (see below)
  user_id         uuid nullable (references users)
  host_id         uuid nullable (references users — for booking-related events)
  city_id         uuid nullable (references cities — denormalized for geo queries)
  country_code    char(2) nullable
  booking_id      uuid nullable
  subscription_id uuid nullable
  stripe_event_id text unique — Stripe webhook event ID for idempotency
  amount_cents    bigint not null — signed: positive = platform inflow, negative = outflow
  currency        char(3) not null default 'EUR'
  occurred_at     timestamptz not null — Stripe's event timestamp, not insert time
  metadata        jsonb
  created_at      timestamptz default now()

revenue_event_type enum:
  - subscription_charge
  - subscription_refund
  - booking_charge          (when traveler card is captured)
  - booking_refund          (cancellation refund)
  - platform_fee            (5% + 15% taken)
  - host_payout             (transfer to host Connect account)
  - stripe_fee              (Stripe's 1.5% + €0.25)
```

Indexes:
- `occurred_at` (time-series queries)
- `(type, occurred_at)` (per-type aggregates)
- `(city_id, occurred_at)` (geo aggregates)
- `(host_id, occurred_at)` (per-host earnings)
- unique on `stripe_event_id` (idempotency)

Properties:
- Append-only — never UPDATE, never DELETE
- Financial-records retention: 10 years (GDPR-compatible — financial data is the carve-out from erasure)
- Source of truth for **all** dashboards forever

---

## 6. Phase 0 SQL snippets to save in Supabase Studio

Once `revenue_events` exists and is being written, save these as named snippets:

```sql
-- 1. MRR (last 30 days, EUR)
SELECT SUM(amount_cents) / 100.0 AS mrr_eur
FROM revenue_events
WHERE type = 'subscription_charge'
  AND occurred_at >= now() - interval '30 days';

-- 2. Daily revenue, last 30 days
SELECT date_trunc('day', occurred_at) AS day,
       SUM(amount_cents) / 100.0 AS revenue_eur
FROM revenue_events
WHERE occurred_at >= now() - interval '30 days'
  AND amount_cents > 0
GROUP BY day
ORDER BY day DESC;

-- 3. New subscriptions this week, by plan
SELECT (metadata->>'plan') AS plan, COUNT(*) AS new_subs
FROM revenue_events
WHERE type = 'subscription_charge'
  AND occurred_at >= now() - interval '7 days'
GROUP BY plan;

-- 4. Revenue by city, all-time
SELECT c.name, c.country, SUM(re.amount_cents) / 100.0 AS revenue_eur
FROM revenue_events re
LEFT JOIN cities c ON c.id = re.city_id
WHERE re.amount_cents > 0
GROUP BY c.name, c.country
ORDER BY revenue_eur DESC
LIMIT 20;

-- 5. Revenue by country, last 90 days
SELECT country_code, SUM(amount_cents) / 100.0 AS revenue_eur
FROM revenue_events
WHERE occurred_at >= now() - interval '90 days'
  AND amount_cents > 0
GROUP BY country_code
ORDER BY revenue_eur DESC;

-- 6. Top 10 earning hosts, last 30 days
SELECT u.full_name, u.email,
       SUM(re.amount_cents) / 100.0 AS gross_eur
FROM revenue_events re
JOIN users u ON u.id = re.host_id
WHERE re.type = 'booking_charge'
  AND re.occurred_at >= now() - interval '30 days'
GROUP BY u.id, u.full_name, u.email
ORDER BY gross_eur DESC
LIMIT 10;

-- 7. Refund rate, last 30 days
SELECT
  SUM(CASE WHEN type LIKE '%refund' THEN -amount_cents ELSE 0 END) /
  NULLIF(SUM(CASE WHEN type IN ('subscription_charge','booking_charge') THEN amount_cents ELSE 0 END), 0)::float * 100
  AS refund_rate_pct
FROM revenue_events
WHERE occurred_at >= now() - interval '30 days';

-- 8. Platform fees collected (5% + 15%), all-time
SELECT SUM(amount_cents) / 100.0 AS platform_fees_eur
FROM revenue_events
WHERE type = 'platform_fee';

-- 9. Churn — subs cancelled / active 30 days ago
WITH cancelled AS (
  SELECT COUNT(DISTINCT subscription_id) AS n
  FROM revenue_events
  WHERE type = 'subscription_refund'
    AND occurred_at >= now() - interval '30 days'
),
active_30d_ago AS (
  SELECT COUNT(*) AS n FROM subscriptions
  WHERE status = 'active' AND created_at < now() - interval '30 days'
)
SELECT cancelled.n::float / NULLIF(active_30d_ago.n, 0) * 100 AS churn_pct
FROM cancelled, active_30d_ago;

-- 10. Stripe fees absorbed, last 30 days
SELECT SUM(-amount_cents) / 100.0 AS stripe_fees_eur
FROM revenue_events
WHERE type = 'stripe_fee'
  AND occurred_at >= now() - interval '30 days';
```

Bookmark these in Supabase Studio; that's your "Phase 0 dashboard."

---

## 7. Open questions to revisit at Phase 1

- Should we use **Tremor** or **Recharts** when building the Next.js admin app?
- Oracle Cloud Always Free 1GB VM vs running on a Mac mini at home for the Tailscale-gated admin server?
- Do we ship admin pages as a separate codebase (`apps/admin/`) or feature-flag inside the main app?
- When should we move from SQL snippets to scheduled email reports?

Park until ~100 paying users.

---

*Last updated: 2026-06-25.*
