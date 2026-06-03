# Offmap

**Peer-to-peer local experience platform.** Travelers subscribe to unlock direct conversations with verified local hosts across Europe.

**Stack:** Next.js 14 App Router · TypeScript · Supabase (Auth + PostgreSQL) · Drizzle ORM · Stripe · Upstash Redis · Resend · Tailwind CSS · Docker

---

## Table of contents

1. [Quick start — local dev (2 min)](#1-quick-start--local-dev-2-min)
2. [Project structure](#2-project-structure)
3. [Architecture overview](#3-architecture-overview)
4. [Mock vs production mode](#4-mock-vs-production-mode)
5. [Environment variables](#5-environment-variables)
6. [Database setup](#6-database-setup)
7. [Connect real services](#7-connect-real-services)
8. [Run with Docker](#8-run-with-docker)
9. [UAT environment](#9-uat-environment)
10. [Deploy to production](#10-deploy-to-production)
11. [Pre-launch checklist](#11-pre-launch-checklist)
12. [Commands reference](#12-commands-reference)

---

## 1. Quick start — local dev (2 min)

No external accounts or API keys needed. The app runs fully in-memory by default.

```bash
git clone https://github.com/your-org/offmap
cd offmap
npm install
cp .env.example .env.local   # already set to MOCK_MODE=true
npm run dev
```

Open **http://localhost:3000**

**Demo accounts (mock mode):**

| Role     | Email             | Password  |
|----------|-------------------|-----------|
| Traveler | traveler@demo.com | demo1234  |
| Host     | host@demo.com     | demo1234  |

Any email works for registration in mock mode. Password must be 8+ chars with one uppercase and one number (e.g. `Test1234`).

---

## 2. Project structure

```
offmap/
├── src/
│   ├── app/
│   │   ├── api/                     # REST API endpoints
│   │   │   ├── auth/                # login · register · logout · forgot-password
│   │   │   ├── cities/              # list active cities
│   │   │   ├── hosts/               # search · single profile · create/update
│   │   │   ├── subscriptions/       # status · checkout · billing portal
│   │   │   ├── conversations/       # unlock host · list conversations
│   │   │   ├── conversations/[id]/messages/   # send · fetch (paginated)
│   │   │   ├── trips/               # create trip post · browse · respond
│   │   │   ├── reviews/             # submit review
│   │   │   ├── reviews/featured/    # homepage rotating reviews
│   │   │   ├── wishlists/           # save · unsave hosts
│   │   │   ├── me/                  # current user profile
│   │   │   ├── stats/               # platform stats (host count, cities)
│   │   │   ├── webhooks/stripe/     # Stripe event handler
│   │   │   └── mock/checkout/       # mock-mode instant subscription
│   │   │
│   │   ├── auth/                    # login · register · forgot-password pages
│   │   ├── dashboard/               # traveler dashboard
│   │   ├── host-dashboard/          # host dashboard + profile creation
│   │   ├── search/                  # browse and filter hosts
│   │   ├── hosts/[id]/              # public host profile
│   │   ├── conversations/           # messaging UI
│   │   ├── trips/                   # trip posts board + post form
│   │   ├── pricing/                 # subscription plans
│   │   ├── about/ faq/ press/       # marketing pages
│   │   └── privacy/ terms/ impressum/   # legal pages
│   │
│   ├── components/
│   │   ├── layout/                  # Navbar · Footer
│   │   ├── home/                    # HomeClient (homepage)
│   │   ├── hosts/                   # HostCard · HostGrid
│   │   ├── ui/                      # Button · Input · Modal · CityAutocomplete
│   │   └── trip/                    # trip-related components
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle ORM table definitions + enums
│   │   │   └── index.ts             # database client (singleton)
│   │   ├── supabase/
│   │   │   ├── server.ts            # createSupabaseServerClient · createSupabaseAdminClient
│   │   │   ├── client.ts            # createSupabaseBrowserClient
│   │   │   └── middleware.ts        # session refresh on every request
│   │   ├── stripe/index.ts          # Stripe client · checkout · portal · webhook verify
│   │   ├── email/index.ts           # Resend client · email templates
│   │   ├── mock/
│   │   │   ├── index.ts             # IS_MOCK constant (single source of truth)
│   │   │   ├── data.ts              # hosts · cities · demo conversations
│   │   │   ├── db.ts                # in-memory Maps (users · sessions · subs · etc.)
│   │   │   ├── auth.ts              # mockSignUp · mockSignIn · mockGetUser
│   │   │   ├── stripe.ts            # mockCreateCheckoutSession · mockCompleteCheckout
│   │   │   ├── email.ts             # logs emails to console instead of sending
│   │   │   └── redis.ts             # logs rate-limit calls to console
│   │   ├── validators/index.ts      # Zod schemas for every API input
│   │   └── utils/index.ts           # cn() · formatCents() · getInitials()
│   │
│   ├── middleware.ts                # rate limit → CSRF → auth redirect → session refresh
│   └── types/index.ts               # ApiSuccess · ApiError · SessionUser · etc.
│
├── drizzle/
│   ├── migrations/                  # SQL migration files (generated by Drizzle)
│   └── seed.ts                      # seeds European cities
│
├── docs/                            # detailed documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── UAT_AND_DEPLOYMENT.md
│   └── BOOKING_CANCELLATION_POLICY.md
├── Dockerfile                       # 3-stage Alpine build (see §8)
├── docker-compose.yml               # prod + mock profiles
└── next.config.js                   # security headers · output:standalone · image domains
```

---

## 3. Architecture overview

7 strict layers — traffic always flows downward.

```
┌─────────────────────────────────────────────┐
│  LAYER 1 — CLIENT                           │
│  React/Next.js pages · hooks · components   │
│  No direct DB calls. Calls API routes only. │
└──────────────────────┬──────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────┐
│  LAYER 2 — EDGE                             │
│  Cloudflare WAF · CDN · Vercel Edge         │
│  TLS termination · static asset cache       │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│  LAYER 3 — API  (Next.js route handlers)    │
│  Rate limit → CSRF → JWT → Zod → sub check  │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│  LAYER 4 — SERVICES                         │
│  All business logic lives here              │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│  LAYER 5 — REPOSITORY  (Drizzle ORM)        │
│  All DB access via ORM · no raw SQL         │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│  LAYER 6 — DATA                             │
│  PostgreSQL (Supabase) + RLS policies       │
│  Upstash Redis (cache + rate limiting)      │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│  LAYER 7 — EXTERNAL                         │
│  Stripe · Resend · Supabase Auth            │
│  Wrapped in /lib modules only.              │
└─────────────────────────────────────────────┘
```

---

## 4. Mock vs production mode

The single most important architectural concept. Every API route has two code paths.

| | Mock (`MOCK_MODE=true`) | Production (`MOCK_MODE=false`) |
|---|---|---|
| Database | In-memory JavaScript Maps | PostgreSQL via Supabase + Drizzle |
| Auth | `offmap_mock_session` cookie | Supabase Auth (JWT, HttpOnly cookie) |
| Payments | Instant, no card required | Stripe Checkout |
| Email | `console.log` | Resend |
| Rate limiting | Skipped | Upstash Redis (100 req/60s per IP) |
| Data persistence | Resets on server restart | Persistent |

Switch by editing `.env.local`:

```bash
MOCK_MODE=false
NEXT_PUBLIC_MOCK_MODE=false
```

No code changes needed — purely config-driven.

---

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in values for your environment.

```bash
# ── MODE ─────────────────────────────────────────────────────────────
MOCK_MODE=true                           # true = in-memory | false = real services
NEXT_PUBLIC_MOCK_MODE=true               # must match MOCK_MODE
NODE_ENV=development                     # development | production

# ── APP ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
# UAT:   https://uat.offmap.com
# Prod:  https://offmap.com

# ── SUPABASE ─────────────────────────────────────────────────────────
# Settings → API in your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # "anon public" key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # server-only — NEVER expose client-side

# Drizzle migrations only (not used at runtime)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# ── STRIPE ───────────────────────────────────────────────────────────
# Use sk_test_ / pk_test_ for dev + UAT, sk_live_ / pk_live_ for prod
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_DAY=price_...
STRIPE_PRICE_WEEK=price_...
STRIPE_PRICE_MONTH=price_...
STRIPE_PRICE_ANNUAL=price_...

# ── UPSTASH REDIS ────────────────────────────────────────────────────
# upstash.com → Create Database (EU-West Frankfurt) → REST API
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# ── RESEND (email) ───────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@offmap.com
RESEND_FROM_NAME=Offmap
```

---

## 6. Database setup

> Skip this section if using mock mode — no DB needed.

```bash
# 1. Apply all pending migrations
npm run db:migrate

# 2. Seed European cities
npx tsx drizzle/seed.ts

# 3. Visual DB browser (optional)
npm run db:studio     # opens at http://localhost:4983
```

**Creating a new migration** (after editing `src/lib/db/schema.ts`):

```bash
npm run db:generate   # generates SQL in drizzle/migrations/
npm run db:migrate    # applies it
```

> Always make new columns nullable first — zero-downtime migrations. Never rename columns (add new, backfill, drop old). Never edit Supabase schema manually.

---

## 7. Connect real services

### Supabase (database + auth)

1. Go to [supabase.com](https://supabase.com) → New project
2. **Region: Frankfurt (eu-central-1)** — required for GDPR compliance
3. Copy from **Settings → API**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Copy from **Settings → Database → Connection string**: `DATABASE_URL`
5. Enable Email auth: **Authentication → Providers → Email**
6. Set redirect URLs: **Authentication → URL Configuration**
   - Local: `http://localhost:3000/auth/callback`
   - UAT: `https://uat.offmap.com/auth/callback`
   - Prod: `https://offmap.com/auth/callback`
7. Run `npm run db:migrate` then `npx tsx drizzle/seed.ts`

### Stripe (payments)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → API keys
2. Create 4 products:

   | Product | Price | Interval | Env var |
   |---------|-------|----------|---------|
   | Day Pass | €6 | day | `STRIPE_PRICE_DAY` |
   | Weekly | €12 | week | `STRIPE_PRICE_WEEK` |
   | Monthly | €18 | month | `STRIPE_PRICE_MONTH` |
   | Annual | €49 | year | `STRIPE_PRICE_ANNUAL` |

3. Webhooks → Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Local webhook testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Upstash Redis

1. [upstash.com](https://upstash.com) → Create database → **EU West (Frankfurt)**
2. Copy REST URL + token

### Resend (email)

1. [resend.com](https://resend.com) → Add and verify your domain
2. Copy API key, set `RESEND_FROM_EMAIL` to a verified sender

---

## 8. Run with Docker

### Mock mode (no credentials needed)

```bash
docker-compose --profile mock up --build
```

Opens at **http://localhost:3000** with full mock data. No `.env` required.

### Production / UAT mode

```bash
cp .env.example .env        # fill in all real values
docker-compose up --build -d
docker-compose logs -f app  # tail logs
docker-compose down         # stop
```

### How the Dockerfile works

```
Stage 1 — deps
  node:18-alpine
  npm ci                          ← installs ALL deps (including devDeps for build)

Stage 2 — builder
  node:18-alpine
  copies node_modules from Stage 1
  copies source code
  receives public ARGs (baked into JS bundle)
  npm run build → .next/standalone

Stage 3 — runner  (final image ~150 MB)
  node:18-alpine
  copies only: public/ + .next/standalone + .next/static
  runs as non-root user (nextjs:nodejs, uid 1001)
  EXPOSE 3000
  CMD ["node", "server.js"]
```

> `output: 'standalone'` in `next.config.js` is required — it produces the minimal `server.js` the runner stage uses.

### Build args vs runtime env vars

| Type | How set | When resolved | Example |
|------|---------|---------------|---------|
| Build ARG (`NEXT_PUBLIC_*`) | `docker-compose build args` | Build time — baked into JS | `NEXT_PUBLIC_SUPABASE_URL` |
| Runtime ENV (secrets) | `docker-compose environment` | Container start | `SUPABASE_SERVICE_ROLE_KEY` |

> Never put secrets as build ARGs — they get baked into the image layer history.

---

## 9. UAT environment

UAT (User Acceptance Testing) is a staging environment that runs production code against real services but with test credentials.

### Setup

1. **Provision a separate Supabase project** for UAT — never share a DB with production
2. **Use Stripe test keys** (`sk_test_`, `pk_test_`) — real card flows, no real charges
3. **Use a separate Upstash database** for UAT Redis
4. **Deploy to a separate Vercel project** (or Docker host) at `https://uat.offmap.com`

### UAT `.env` file

```bash
MOCK_MODE=false
NEXT_PUBLIC_MOCK_MODE=false
NODE_ENV=production

NEXT_PUBLIC_APP_URL=https://uat.offmap.com

# Supabase UAT project (separate from prod)
NEXT_PUBLIC_SUPABASE_URL=https://uat-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# Stripe TEST keys (not live)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_DAY=price_test_...
STRIPE_PRICE_WEEK=price_test_...
STRIPE_PRICE_MONTH=price_test_...
STRIPE_PRICE_ANNUAL=price_test_...

# Upstash UAT database
UPSTASH_REDIS_REST_URL=https://uat-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Resend (can use same API key, different from-address)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=uat@offmap.com
RESEND_FROM_NAME=Offmap UAT
```

### Run UAT with Docker

```bash
# Build and start UAT container
docker build -t offmap-uat \
  --build-arg NEXT_PUBLIC_APP_URL=https://uat.offmap.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$UAT_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$UAT_SUPABASE_ANON_KEY \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$UAT_SUPABASE_PUB_KEY \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$UAT_STRIPE_PUB_KEY \
  .

docker run -d -p 3000:3000 --env-file .env.uat --name offmap-uat offmap-uat
```

### UAT test accounts

Seed test accounts after running `npx tsx drizzle/seed.ts` against the UAT DB. Use Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC) for payment flows.

### UAT checklist

- [ ] Registration + email verification works
- [ ] Traveler can subscribe (Stripe test card)
- [ ] Traveler can search and filter hosts
- [ ] Traveler can unlock a host (conversation created)
- [ ] Messages send and receive in real time
- [ ] Host dashboard shows conversations and trip requests
- [ ] Billing portal loads and shows active subscription
- [ ] Forgot password email arrives
- [ ] Stripe webhooks fire correctly (check Stripe dashboard → Events)
- [ ] Redis caching works (check Upstash console → Data Browser)

---

## 10. Deploy to production

### Option A — Vercel (recommended)

```bash
npm i -g vercel
vercel login
vercel deploy --prod
```

Set all environment variables in **Vercel Dashboard → Project → Settings → Environment Variables**.

Set Stripe webhook: `https://offmap.com/api/webhooks/stripe`

Update Supabase redirect URLs to include `https://offmap.com/auth/callback`.

### Option B — Docker on any VPS / cloud VM

```bash
# On your server
docker pull your-registry/offmap:latest   # or build directly
docker run -d \
  -p 3000:3000 \
  --env-file /etc/offmap/prod.env \
  --restart unless-stopped \
  --name offmap \
  your-registry/offmap:latest
```

Put Nginx or Caddy in front for TLS termination:

```nginx
server {
    listen 443 ssl;
    server_name offmap.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option C — Railway / Render / Fly.io

```bash
docker build -t offmap .
docker tag offmap registry.railway.app/your-project/offmap:latest
docker push registry.railway.app/your-project/offmap:latest
# Set env vars in the platform dashboard
```

---

## 11. Pre-launch checklist

### Infrastructure
- [ ] `MOCK_MODE=false` and `NEXT_PUBLIC_MOCK_MODE=false`
- [ ] All environment variables set in deployment platform
- [ ] Supabase project in **Frankfurt (eu-central-1)** — GDPR requirement
- [ ] Separate Supabase projects for UAT and production

### Database
- [ ] `npm run db:migrate` run against production database
- [ ] `npx tsx drizzle/seed.ts` run to seed cities
- [ ] RLS policies enabled on all tables (Supabase dashboard → Table Editor → RLS)
- [ ] PITR (Point-in-Time Recovery) enabled on Supabase Pro plan

### Auth
- [ ] Email verification enforced: **Supabase → Authentication → Email** → confirm email = ON
- [ ] Supabase redirect URLs updated for production domain
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain (used for CSRF origin check)

### Payments
- [ ] Stripe live keys configured (not test keys)
- [ ] All 4 Stripe products and prices created
- [ ] Stripe webhook endpoint configured with correct events
- [ ] Webhook signature verification confirmed working

### Monitoring (before go-live)
- [ ] Sentry added: `npm install @sentry/nextjs` and configured
- [ ] Vercel Analytics enabled (one checkbox in Vercel dashboard)
- [ ] Betterstack uptime monitoring set up after first deploy

### Legal & compliance
- [ ] Privacy policy, Terms, and Impressum updated with real company details
- [ ] GDPR: confirm all data stored in `eu-central-1`
- [ ] Cookie consent banner reviewed
- [ ] Data export endpoint (`/api/me/data-export`) tested

---

## 12. Commands reference

```bash
# ── Development ──────────────────────────────────────────────────────
npm run dev            # start dev server with hot reload (mock mode by default)
npm run build          # production build — also catches TypeScript errors
npm run start          # run production build locally
npm run typecheck      # type-check without building
npm run lint           # ESLint

# ── Database ─────────────────────────────────────────────────────────
npm run db:generate    # generate Drizzle migration from schema changes
npm run db:migrate     # apply pending migrations to Supabase
npm run db:studio      # visual DB browser at http://localhost:4983

# ── Seeding ──────────────────────────────────────────────────────────
npx tsx drizzle/seed.ts          # seed European cities into database

# ── Stripe ───────────────────────────────────────────────────────────
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# ── Docker ───────────────────────────────────────────────────────────
docker-compose --profile mock up --build        # mock mode, no credentials
docker-compose up --build -d                    # production mode
docker-compose logs -f app                      # tail logs
docker-compose down                             # stop

# Build image manually
docker build -t offmap .
docker run -p 3000:3000 --env-file .env offmap
```

---

## Company

**Offmap GmbH** · Frankfurt am Main, Germany
hello@offmap.com
