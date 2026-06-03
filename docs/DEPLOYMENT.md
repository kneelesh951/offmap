# Offmap — Deployment Guide

This guide covers every step to go from zero to a running production instance on any cloud provider.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [External service setup](#2-external-service-setup)
3. [Environment variables reference](#3-environment-variables-reference)
4. [Database setup](#4-database-setup)
5. [Deploy to Vercel](#5-deploy-to-vercel)
6. [Deploy to Railway](#6-deploy-to-railway)
7. [Deploy to Fly.io](#7-deploy-to-flyio)
8. [Deploy to AWS / GCP / Azure (Docker)](#8-deploy-to-aws--gcp--azure-docker)
9. [Self-hosted with Docker Compose](#9-self-hosted-with-docker-compose)
10. [Pre-launch checklist](#10-pre-launch-checklist)
11. [Post-launch operations](#11-post-launch-operations)

---

## 1. Prerequisites

- Node.js 18+ (for local runs and CLI tools)
- Docker Desktop (for container-based deployments)
- A domain name (for production — Stripe and Supabase need a real URL)
- Accounts at: Supabase · Stripe · Upstash · Resend

---

## 2. External service setup

### 2.1 Supabase

**Region: Frankfurt (eu-central-1) is required for GDPR compliance. Do not choose any other region.**

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose **Frankfurt (eu-central-1)** region
3. Set a strong database password (save it — you need it for `DATABASE_URL`)
4. Wait for the project to provision (~2 minutes)

**Get credentials** from **Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL      = https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY     = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Get database URL** from **Settings → Database → Connection string → URI**:
```
DATABASE_URL = postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres
```

**Configure Auth** from **Authentication → Providers**:
- Enable **Email** provider
- Optionally enable **Google** OAuth

**Configure redirect URLs** from **Authentication → URL Configuration**:
```
Site URL:     https://your-domain.com
Redirect URL: https://your-domain.com/auth/callback
```

For local development also add:
```
http://localhost:3000/auth/callback
```

---

### 2.2 Stripe

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **API keys** → copy keys:
   ```
   STRIPE_SECRET_KEY                 = sk_live_...   (or sk_test_... for testing)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
   ```

3. Create **4 products** (Products → Add product):

   | Product name | Price | Billing period | Env var |
   |---|---|---|---|
   | Day Pass | €6.00 | Every day | `STRIPE_PRICE_DAY` |
   | Weekly Pass | €12.00 | Every week | `STRIPE_PRICE_WEEK` |
   | Monthly Pass | €18.00 | Every month | `STRIPE_PRICE_MONTH` |
   | Annual Pass | €49.00 | Every year | `STRIPE_PRICE_ANNUAL` |

   For each product, copy the **Price ID** (starts with `price_`).

4. **Webhooks** → Add endpoint:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

5. **Customer Portal** → Configure billing portal:
   - Allow cancellation: Yes (required by German Widerrufsrecht)
   - Allow plan switching: optional
   - Set return URL: `https://your-domain.com/dashboard`

**Testing Stripe locally:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This gives you a local webhook secret — use it as `STRIPE_WEBHOOK_SECRET` during development.

---

### 2.3 Upstash Redis

1. Go to [upstash.com](https://upstash.com) → **Create database**
2. **Region: EU West** (Ireland) or **EU Central** (Germany) — keep data in EU
3. Plan: Free tier is sufficient up to ~10k users
4. Copy credentials:
   ```
   UPSTASH_REDIS_REST_URL   = https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN = AXxx...
   ```

---

### 2.4 Resend

1. Go to [resend.com](https://resend.com) → Create account
2. **Domains** → Add domain → follow DNS verification steps
3. **API Keys** → Create API key
   ```
   RESEND_API_KEY     = re_...
   RESEND_FROM_EMAIL  = noreply@yourdomain.com
   RESEND_FROM_NAME   = Offmap
   ```

---

## 3. Environment variables reference

Complete list of all environment variables. In mock mode only `MOCK_MODE`, `NEXT_PUBLIC_MOCK_MODE`, and `NEXT_PUBLIC_APP_URL` are strictly required.

```bash
# ── Mode ───────────────────────────────────────────────────────────
MOCK_MODE=false                           # false = real services
NEXT_PUBLIC_MOCK_MODE=false               # must match MOCK_MODE

# ── App ────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://offmap.com  # no trailing slash

# ── Supabase ───────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server-only, never expose
DATABASE_URL=postgresql://...             # for Drizzle ORM

# ── Stripe ─────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_DAY=price_...
STRIPE_PRICE_WEEK=price_...
STRIPE_PRICE_MONTH=price_...
STRIPE_PRICE_ANNUAL=price_...

# ── Upstash Redis ──────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# ── Resend ─────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Offmap
```

**Security rules:**
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server secrets — never put them in `NEXT_PUBLIC_*` variables or expose them to the browser
- Never commit `.env.local` or `.env` to version control
- Use your deployment platform's secrets manager for production values

---

## 4. Database setup

Run once per environment (staging, production):

```bash
# 1. Apply all Drizzle migrations (creates all tables + RLS policies)
npm run db:migrate

# 2. Seed the 8 European cities
npx tsx drizzle/seed.ts
```

To inspect the database visually:
```bash
npm run db:studio
# Opens at http://localhost:4983
```

### Schema changes workflow

1. Edit `src/lib/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Review the generated SQL in `drizzle/migrations/`
4. Apply to database: `npm run db:migrate`
5. Commit both the schema change and the migration file

**Never edit Supabase schema manually** — all changes must go through Drizzle so the migration history stays in sync.

---

## 5. Deploy to Vercel

Vercel is the recommended deployment target — zero config for Next.js, automatic preview deployments per branch, and built-in edge CDN.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel

# Or connect via GitHub:
# Vercel dashboard → New Project → Import Git Repository
```

**Set environment variables:**
Vercel dashboard → Project → **Settings → Environment Variables**

Add every variable from section 3. Set scope to **Production** for live values and **Preview** for test/staging values.

**Update Stripe webhook:**
After deployment, update the Stripe webhook URL to:
```
https://your-app.vercel.app/api/webhooks/stripe
```

**Update Supabase redirect URLs:**
Add your Vercel deployment URL to Supabase Auth redirect URLs.

**Custom domain:**
Vercel dashboard → Project → **Settings → Domains** → Add your domain.

---

## 6. Deploy to Railway

Railway is a good Docker-based alternative with simple pricing.

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Railway detects the `Dockerfile` automatically
3. **Variables** → Add all environment variables from section 3
4. **Settings → Networking** → Generate a domain or add your custom domain
5. Update Stripe webhook URL to your Railway domain

**Build arguments** (set in Railway Variables):
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://your-railway-app.railway.app
NEXT_PUBLIC_MOCK_MODE=false
```

---

## 7. Deploy to Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Create app
fly launch --name offmap

# Set secrets (all environment variables)
fly secrets set \
  MOCK_MODE=false \
  NEXT_PUBLIC_MOCK_MODE=false \
  NEXT_PUBLIC_APP_URL=https://offmap.fly.dev \
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  DATABASE_URL=postgresql://... \
  STRIPE_SECRET_KEY=sk_live_... \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_DAY=price_... \
  STRIPE_PRICE_WEEK=price_... \
  STRIPE_PRICE_MONTH=price_... \
  STRIPE_PRICE_ANNUAL=price_... \
  UPSTASH_REDIS_REST_URL=https://... \
  UPSTASH_REDIS_REST_TOKEN=... \
  RESEND_API_KEY=re_... \
  RESEND_FROM_EMAIL=noreply@yourdomain.com \
  RESEND_FROM_NAME=Offmap

# Deploy
fly deploy
```

---

## 8. Deploy to AWS / GCP / Azure (Docker)

### Build the image

```bash
docker build \
  --build-arg NEXT_PUBLIC_MOCK_MODE=false \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-domain.com \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... \
  -t offmap:latest .
```

Note: `NEXT_PUBLIC_*` variables must be set at **build time** because Next.js inlines them during `next build`. All other variables (secrets) are injected at **runtime** via your platform's secrets manager.

### Push to registry

```bash
# AWS ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag offmap:latest <account>.dkr.ecr.<region>.amazonaws.com/offmap:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/offmap:latest

# GCP Artifact Registry
docker tag offmap:latest gcr.io/<project>/offmap:latest
docker push gcr.io/<project>/offmap:latest

# Azure Container Registry
az acr login --name <registry>
docker tag offmap:latest <registry>.azurecr.io/offmap:latest
docker push <registry>.azurecr.io/offmap:latest
```

### Run the container

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  -e STRIPE_SECRET_KEY=sk_live_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  -e STRIPE_PRICE_DAY=price_... \
  -e STRIPE_PRICE_WEEK=price_... \
  -e STRIPE_PRICE_MONTH=price_... \
  -e STRIPE_PRICE_ANNUAL=price_... \
  -e UPSTASH_REDIS_REST_URL=https://... \
  -e UPSTASH_REDIS_REST_TOKEN=... \
  -e RESEND_API_KEY=re_... \
  -e RESEND_FROM_EMAIL=noreply@yourdomain.com \
  -e RESEND_FROM_NAME=Offmap \
  -e MOCK_MODE=false \
  offmap:latest
```

**Recommended services by cloud:**

| Cloud | Compute | Notes |
|---|---|---|
| AWS | ECS Fargate | Serverless containers, scales to zero |
| AWS | App Runner | Zero-config container hosting |
| GCP | Cloud Run | Serverless, scales to zero, pay per request |
| Azure | Container Apps | Similar to Cloud Run |

For all of these, use the platform's native secrets manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) rather than plain environment variables.

---

## 9. Self-hosted with Docker Compose

For VPS / bare metal deployments (Hetzner, DigitalOcean, etc.):

```bash
# 1. Clone the repo
git clone https://github.com/your-org/offmap
cd offmap

# 2. Create .env with all production values
cp .env.example .env
# Edit .env — set MOCK_MODE=false and all real credentials

# 3. Build and start
docker-compose up --build -d

# 4. Run migrations (first time only)
docker-compose exec app npm run db:migrate
docker-compose exec app npx tsx drizzle/seed.ts

# 5. View logs
docker-compose logs -f app

# 6. Update (rolling restart)
git pull
docker-compose up --build -d
```

**Add a reverse proxy** (nginx or Caddy) in front of the container for HTTPS:

```nginx
# nginx.conf example
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 10. Pre-launch checklist

Work through this before switching to production traffic.

### Infrastructure
- [ ] Supabase project created in **Frankfurt (eu-central-1)**
- [ ] `MOCK_MODE=false` and `NEXT_PUBLIC_MOCK_MODE=false`
- [ ] All environment variables set in deployment platform (not in code)
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain (no trailing slash)

### Database
- [ ] `npm run db:migrate` run against production database
- [ ] `npx tsx drizzle/seed.ts` run to seed cities
- [ ] Supabase Auth redirect URLs updated for production domain
- [ ] RLS policies confirmed active (check Supabase dashboard → Database → Policies)

### Stripe
- [ ] Live mode keys used (not test keys) for production
- [ ] All 4 products and prices created
- [ ] Webhook endpoint configured with production URL
- [ ] All 4 webhook events selected
- [ ] Customer portal configured (cancellation allowed — German law)
- [ ] Stripe webhook tested end-to-end

### Email
- [ ] Resend domain verified (check DNS records)
- [ ] `RESEND_FROM_EMAIL` set to a verified sender address
- [ ] Welcome email tested manually
- [ ] Subscription confirmation email tested

### Legal (Germany)
- [ ] Privacy policy reviewed and up to date with real company details
- [ ] Terms of service reviewed — includes 14-day Widerrufsrecht notice
- [ ] Impressum (Impressumspflicht) updated with real company address, HRB, VAT
- [ ] GDPR consent checkbox present at registration
- [ ] Data export endpoint working (`GET /api/me/data-export`)
- [ ] Cookie consent (if using analytics beyond what's described here)

### Security
- [ ] Security headers present (X-Frame-Options, HSTS, nosniff) — check `next.config.js`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not exposed to client-side code
- [ ] All secrets in platform secrets manager, not hardcoded or in git
- [ ] Rate limiting tested (100 req/60s)
- [ ] Stripe webhook signature verification confirmed working

### Monitoring
- [ ] Health check endpoint responding: `GET /api/cities`
- [ ] Error tracking configured (Sentry recommended)
- [ ] Logs review — no PII (email, name, IP) appearing in plain text

---

## 11. Post-launch operations

### Database migrations

Always test migrations on a staging environment first. Apply to production:
```bash
# Generate from schema change
npm run db:generate

# Review the generated SQL carefully
cat drizzle/migrations/XXXX_new_migration.sql

# Apply to production database
DATABASE_URL=<prod-url> npm run db:migrate
```

### Monitoring the Stripe webhook

```bash
# Check recent webhook deliveries
# Stripe dashboard → Developers → Webhooks → your endpoint → Recent deliveries

# Retry a failed delivery
stripe events resend evt_xxx
```

### Scaling

The app is stateless — to scale horizontally, simply add more container instances behind a load balancer. Redis rate limiting works correctly across multiple instances because it's shared state.

Connection limit: Supabase free tier allows 60 simultaneous DB connections. PgBouncer pools these. If you hit limits, upgrade to Supabase Pro or add `?pgbouncer=true&connection_limit=1` to `DATABASE_URL` for serverless deployments.

### Backup

Supabase performs automatic daily backups (Pro tier: 7-day PITR). For extra safety:
```bash
# Manual backup via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```
