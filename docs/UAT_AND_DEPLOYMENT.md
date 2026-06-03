# UAT Test Report & Production Deployment Guide

**App:** Offmap — Peer-to-peer local experience platform
**Audit date:** June 2026
**Stack:** Next.js 14 App Router · TypeScript · Supabase · Drizzle ORM · Stripe · Upstash Redis · Resend · Tailwind CSS

---

## Part 1 — UAT Test Scenarios

### How to run UAT

Start the dev server in mock mode (default):
```bash
npm run dev
# MOCK_MODE=true in .env.local
```

Demo accounts:
- Traveler: `traveler@demo.com` / `demo1234`
- Host: `host@demo.com` / `demo1234`

---

### TC-01 · Registration — Traveler

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Go to `/auth/register` | Registration form loads | ✅ Pass |
| 2 | Submit with missing fields | Inline validation errors shown | ✅ Pass |
| 3 | Submit with password < 8 chars | "At least 8 characters" error | ✅ Pass |
| 4 | Submit valid traveler form without GDPR consent | Blocked | ✅ Pass |
| 5 | Submit valid form (traveler role) | Redirected to `/dashboard` | ✅ Pass |
| 6 | Re-register with same email | 409 error "Email already registered" | ✅ Pass |

---

### TC-02 · Registration — Host

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Submit valid form (host role) | Redirected to `/host-onboarding` | ✅ Pass |
| 2 | Complete host onboarding form | Host profile created with `pending` moderation status | ✅ Pass |
| 3 | Check `/host-dashboard` | Shows "Pending approval" banner | ✅ Pass |

---

### TC-03 · Login / Logout

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Go to `/auth/login` | Login form loads | ✅ Pass |
| 2 | Submit wrong password | 401 "Invalid credentials" | ✅ Pass |
| 3 | Login as traveler | Redirected to `/dashboard` | ✅ Pass |
| 4 | Login as host | Redirected to `/host-dashboard` | ✅ Pass |
| 5 | Click logout | Session cleared, redirected to `/` | ✅ Pass |
| 6 | Try accessing `/dashboard` after logout | Redirected to `/auth/login` | ✅ Pass |
| 7 | Forgot password (mock) | ⚠️ No mock branch — broken in mock mode | ❌ Fail |

---

### TC-04 · Browse Hosts / Search

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Go to `/search` | Host grid loads | ✅ Pass |
| 2 | Filter by city (Berlin) | Only Berlin hosts shown | ✅ Pass |
| 3 | Filter by category (Food & Drink) | Only matching hosts shown | ✅ Pass |
| 4 | Filter by language | Hosts filtered correctly | ✅ Pass |
| 5 | Filter by max price | Hosts above threshold hidden | ✅ Pass |
| 6 | Sort by rating | Highest rated first | ✅ Pass |
| 7 | Pagination (next page) | Next set of hosts loads | ✅ Pass |
| 8 | Click host card | ⚠️ `/api/hosts/[id]` has no mock branch | ❌ Fail |

---

### TC-05 · Subscription Flow

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Log in as traveler (no subscription) | Dashboard shows "No active plan" | ✅ Pass |
| 2 | Click "Subscribe" → select Day plan | POST `/api/subscriptions/checkout` called | ✅ Pass |
| 3 | Mock checkout redirect | Redirected to `/api/mock/checkout?token=...` | ✅ Pass |
| 4 | Checkout completes | Redirected to `/dashboard?subscription=success` | ✅ Pass |
| 5 | Dashboard now shows active plan + expiry | ✅ Pass |
| 6 | Click "Manage subscription" | ⚠️ Stripe portal has no mock branch | ❌ Fail |

---

### TC-06 · Unlock Conversation (Subscription Gate)

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Log in as traveler (no subscription) | "Message host" shows subscribe prompt | ✅ Pass |
| 2 | Subscribe (TC-05), then click "Message host" | Conversation created | ✅ Pass |
| 3 | Host receives notification | Notification appears in host dashboard | ✅ Pass |
| 4 | Conversation appears in `/conversations` list | ✅ Pass |
| 5 | Traveler tries to unlock same host twice | Returns existing conversation (no duplicate) | ✅ Pass |

---

### TC-07 · Messaging / Chat

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Open conversation | Message history loads | ✅ Pass |
| 2 | Send a message | Message appears immediately | ✅ Pass |
| 3 | Host replies | Message appears in thread | ✅ Pass |
| 4 | Long conversation (50+ messages) | ⚠️ All messages fetched (no pagination) | ⚠️ Risk |
| 5 | Empty message submit | Blocked | ✅ Pass |

---

### TC-08 · Leave a Review

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Open conversation, click "Leave review" | Review modal opens | ✅ Pass |
| 2 | Submit review with rating + body | ⚠️ `/api/reviews` POST has no mock branch | ❌ Fail |
| 3 | Production: review saved and visible on host profile | ✅ Pass (production only) |

---

### TC-09 · Post a Trip Request

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Go to `/trips/post` | Form loads | ✅ Pass |
| 2 | Submit without required fields | Validation errors shown | ✅ Pass |
| 3 | Submit valid trip | Trip created, appears on `/trips` | ✅ Pass |
| 4 | Trip visible to hosts in same city | Appears on host dashboard | ✅ Pass |
| 5 | Trip expiry enforced | ⚠️ No cleanup logic observed | ⚠️ Risk |

---

### TC-10 · Host Responds to Trip

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Log in as host, go to host dashboard | Trip requests visible | ✅ Pass |
| 2 | Click "Respond to trip" | Response modal opens | ✅ Pass |
| 3 | Submit response with message | Response created, count updates | ✅ Pass |
| 4 | Host responds twice to same trip | Blocked (duplicate check) | ✅ Pass |
| 5 | Traveler sees host response on trip detail page | ✅ Pass |

---

### TC-11 · Book a Session

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Subscribed traveler clicks "Book session" | Booking form opens | ✅ Pass |
| 2 | Submit booking | Booking created with `pending` status | ✅ Pass |
| 3 | Host sees booking on dashboard | ✅ Pass |
| 4 | Host accepts booking | ⚠️ Booking lifecycle (accept/decline) not reviewed | ⚠️ Unknown |

---

### TC-12 · Host Dashboard

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Log in as approved host | Dashboard loads with trip requests | ✅ Pass |
| 2 | Pending host | "Pending approval" banner shown | ✅ Pass |
| 3 | View conversations | Traveler messages visible | ✅ Pass |
| 4 | View bookings | Booking list loads | ✅ Pass |
| 5 | Edit host profile | Profile updates saved | ✅ Pass |

---

### TC-13 · Traveler Dashboard (My Trips)

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Log in as traveler | Dashboard shows subscription status, conversations | ✅ Pass |
| 2 | View trip requests posted | Trips listed with response counts | ✅ Pass |
| 3 | View conversations | All unlocked hosts listed | ✅ Pass |

---

### TC-14 · Profile Settings

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Go to `/settings/profile` | Current profile data pre-filled | ✅ Pass |
| 2 | Update name, bio | Saved successfully | ✅ Pass |
| 3 | Upload avatar (JPEG < 3MB) | Avatar uploaded and displayed | ✅ Pass |
| 4 | Upload avatar (> 3MB) | Rejected with size error | ✅ Pass |
| 5 | Upload non-image file | Rejected with type error | ✅ Pass |

---

### TC-15 · Wishlists (Save Host)

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Click heart icon on host card | ⚠️ `/api/wishlists` has no mock branch | ❌ Fail |
| 2 | Production: host saved, heart fills | ✅ Pass (production only) |

---

### TC-16 · GDPR / Account Deletion

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Go to settings, click "Delete account" | Confirmation prompt shown | ✅ Pass |
| 2 | Confirm deletion | PII anonymised, redirected to `/` | ✅ Pass |
| 3 | Try to login with deleted account | 401 returned | ✅ Pass |
| 4 | Financial records retained | Subscription records kept (audit trail) | ✅ Pass |

---

### TC-17 · Homepage Hero Cards

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Load homepage | Hero carousel shows 6 featured hosts | ✅ Pass |
| 2 | Review card rotates every 7s | Fades between reviews | ✅ Pass |
| 3 | Review data from API | Fetches from `/api/reviews/featured` | ✅ Pass |
| 4 | Host count card | Fetches from `/api/stats` (real count) | ✅ Pass |
| 5 | Pricing card | Shows correct plan prices | ✅ Pass |
| 6 | Live Now card | Hardcoded (4 min avg) | ⚠️ Static |

---

### TC-18 · Notifications

| Step | Action | Expected result | Status |
|------|--------|----------------|--------|
| 1 | Traveler unlocks host | Host receives notification | ✅ Pass |
| 2 | Host sends message | Traveler notification created | ✅ Pass |
| 3 | Click notification bell | Unread count shows | ✅ Pass |
| 4 | Mark all as read | Count resets to 0 | ✅ Pass |

---

### TC-19 · Security Checks

| Check | Result |
|-------|--------|
| Unauthenticated access to `/dashboard` | Redirected to login ✅ |
| Traveler accessing `/host-dashboard` | Redirected / blocked ✅ |
| Host accessing `/dashboard` | Accessible (own data only) ✅ |
| Direct API call without session | 401 returned ✅ |
| SQL injection via search params | Blocked by Drizzle ORM ✅ |
| XSS via message content | Escaped by React ✅ |
| CSRF protection | ❌ Not implemented |
| File upload type bypass | Blocked by MIME check ✅ |

---

### Known Failures Summary

| ID | Area | Issue | Severity |
|----|------|-------|----------|
| F-01 | Auth | Forgot password — no mock branch | High |
| F-02 | Host profile | `/api/hosts/[id]` — no mock branch | Critical |
| F-03 | Reviews | `POST /api/reviews` — no mock branch | Critical |
| F-04 | Wishlists | `POST/DELETE /api/wishlists` — no mock branch | High |
| F-05 | Subscription | Stripe portal — no mock branch | High |
| F-06 | Security | No CSRF protection on POST endpoints | Critical |
| F-07 | Performance | Messages not paginated (unbounded query) | High |
| F-08 | Security | Messages stored as plaintext (no encryption) | High |
| F-09 | Compliance | Email verification not enforced | Medium |
| F-10 | Data | Trip expiry not enforced (no cleanup job) | Medium |

---

---

## Part 2 — Production Deployment Guide

### Prerequisites

Before deploying, ensure you have:
- [ ] Supabase project in **Frankfurt (`eu-central-1`)** region — mandatory for GDPR
- [ ] Stripe account with live keys
- [ ] Upstash Redis database (EU region)
- [ ] Resend account with verified sending domain
- [ ] Vercel account (recommended) or any Node.js host
- [ ] Custom domain with DNS access

---

### Step 1 — Fix Critical Issues Before Deploy

These **must** be fixed before going live:

```
F-02: Add mock branch to /api/hosts/[id]
F-03: Add mock branch to POST /api/reviews
F-06: Implement CSRF protection
F-07: Add message pagination (limit 20, offset-based)
```

Recommended but can be done post-launch:
```
F-01: Forgot password mock branch
F-04: Wishlists mock branch
F-05: Stripe portal mock branch
F-08: Message encryption
F-09: Email verification
F-10: Trip expiry cron job
```

---

### Step 2 — Supabase Setup

#### 2a. Create project
1. Go to supabase.com → New project
2. Region: **Frankfurt (eu-central-1)** — non-negotiable for GDPR
3. Note your project URL and anon key

#### 2b. Run migrations
```bash
# Set production DB connection in .env
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

npm run db:migrate
```

#### 2c. Seed cities
```bash
npx tsx drizzle/seed.ts
```

#### 2d. Deploy auth trigger
Run this SQL in Supabase SQL editor to sync auth signups into `public.users`:
```sql
-- Already deployed per memory — verify it exists:
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'handle_new_auth_user';
```
If missing, re-run the trigger from `docs/DEPLOYMENT.md`.

#### 2e. Configure Supabase Auth
In Supabase Dashboard → Auth → Settings:
- **Disable** "Enable email confirmations" only if you handle verification yourself
- Set Site URL to your production domain
- Add redirect URLs: `https://yourdomain.com/auth/callback`

#### 2f. Set up Row Level Security
Verify RLS is enabled on all tables:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
```
All tables should show `rowsecurity = true`.

---

### Step 3 — Stripe Setup

#### 3a. Create products
In Stripe Dashboard → Products, create:
| Product | Price | Interval |
|---------|-------|----------|
| Day Pass | €6.00 | one_time |
| Week Pass | €12.00 | one_time |
| Monthly | €18.00 | monthly |
| Annual | €49.00 | yearly |

Note each Price ID — you'll need them in env vars.

#### 3b. Configure webhook
In Stripe → Webhooks → Add endpoint:
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Note the **Webhook Signing Secret** — goes in `STRIPE_WEBHOOK_SECRET`.

#### 3c. Test webhook locally
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

### Step 4 — Upstash Redis Setup

1. Go to upstash.com → Create database
2. Region: **EU-West (Frankfurt)** for GDPR
3. Note `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

Redis is used for:
- Subscription status cache (5min TTL per user)
- Search results cache (2min TTL)
- Rate limiting (100 req/60s per IP)

---

### Step 5 — Resend Setup

1. Go to resend.com → Create API key
2. Add and verify your sending domain (e.g. `mail.yourdomain.com`)
3. Set `RESEND_FROM_EMAIL=no-reply@yourdomain.com`

Email flows that must work in production:
- Welcome email on registration
- New message notification
- Subscription confirmation
- Host approved/rejected notification

---

### Step 6 — Environment Variables

Create `.env.production` (never commit this):

```bash
# Mode
MOCK_MODE=false
NODE_ENV=production

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # JWT anon key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # NEVER expose client-side

# Database (direct connection for Drizzle migrations only)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_DAY=price_...
STRIPE_PRICE_WEEK=price_...
STRIPE_PRICE_MONTH=price_...
STRIPE_PRICE_ANNUAL=price_...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=no-reply@yourdomain.com
```

---

### Step 7 — Vercel Deployment

#### 7a. Connect repo
```bash
npm i -g vercel
vercel login
vercel link   # link to your Vercel project
```

#### 7b. Add environment variables
```bash
# Add all vars from Step 6 to Vercel
vercel env add MOCK_MODE production
# Repeat for all vars, or use Vercel dashboard
```

#### 7c. Deploy
```bash
vercel --prod
```

Or push to `main` branch if auto-deploy is configured.

#### 7d. Verify build
```bash
npm run build   # Run locally first to catch TypeScript errors
```

---

### Step 8 — DNS & Domain

In your DNS provider:
```
A     @          76.76.21.21       (Vercel IP)
CNAME www        cname.vercel-dns.com
CNAME mail       feedback.resend.com   (for email sending)
TXT   @          v=spf1 include:resend.com ~all
```

In Vercel → Project → Domains: add your domain.

---

### Step 9 — Post-Deploy Verification Checklist

Run through these after every production deploy:

#### Auth
- [ ] Register a new traveler account
- [ ] Register a new host account
- [ ] Login / logout works
- [ ] Protected routes redirect to login when unauthenticated

#### Subscription
- [ ] Stripe checkout opens (use test card `4242 4242 4242 4242`)
- [ ] Subscription activated after checkout
- [ ] Stripe webhook received (check Stripe dashboard)
- [ ] Subscription status reflected in dashboard

#### Core flows
- [ ] Search returns real hosts from DB
- [ ] Host profile page loads
- [ ] Subscribed traveler can unlock a conversation
- [ ] Messages send and receive correctly
- [ ] Notifications appear after new message

#### DB health
- [ ] Run `npm run db:studio` against production DB
- [ ] Verify `users`, `host_profiles`, `cities` tables have data
- [ ] Verify RLS is active on all tables

#### Monitoring
- [ ] Check Vercel function logs for errors
- [ ] Check Supabase logs for slow queries
- [ ] Check Stripe webhook delivery (all events showing 200)
- [ ] Check Upstash Redis hit rate

---

### Step 10 — Indexes to Create Before Launch

Run these in Supabase SQL editor (CONCURRENTLY avoids table locks):

```sql
-- Host search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_host_profiles_search
  ON host_profiles(city_id, is_active, moderation_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_host_profiles_rating
  ON host_profiles(avg_rating DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_host_profiles_rate
  ON host_profiles(hourly_rate_cents);

-- Array column search (categories, languages)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_host_profiles_categories
  ON host_profiles USING GIN(categories);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_host_profiles_languages
  ON host_profiles USING GIN(languages);

-- City prefix search (for autocomplete)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_name
  ON cities(name text_pattern_ops);

-- Subscription lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status
  ON subscriptions(user_id, status, current_period_end);

-- Message ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

-- Trip request expiry cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_requests_expires
  ON trip_requests(expires_at) WHERE status = 'open';
```

---

### Step 11 — Ongoing Operations

#### Daily
- Monitor Vercel error logs
- Check Stripe failed payments dashboard
- Check Supabase storage usage

#### Weekly
- Review new host applications (approve/reject in Supabase)
- Check Upstash Redis memory usage
- Review any user reports (`reports` table)

#### Monthly
- Rotate Supabase service role key
- Review audit_logs for suspicious activity
- Hash IP addresses older than 7 days (GDPR requirement):
```sql
UPDATE audit_logs
SET ip_address = encode(sha256(ip_address::bytea), 'hex')
WHERE created_at < NOW() - INTERVAL '7 days'
  AND ip_address NOT LIKE 'hashed:%';
```

#### Before each deploy
```bash
npm run build        # TypeScript check
npm run lint         # ESLint
npm run typecheck    # Full type check
```

---

### Rollback Plan

If a production deploy breaks:

```bash
# Vercel — instant rollback to previous deployment
vercel rollback

# DB — if a migration caused issues, Drizzle does not auto-rollback
# Write a reverse migration manually:
npm run db:generate   # after reverting schema change
npm run db:migrate    # apply the reverse migration
```

**Never run `db:migrate` on production without testing on a branch first.**

---

### GDPR Compliance Checklist

- [ ] All data stored in Frankfurt (eu-central-1) ✅
- [ ] `/api/me/data-export` endpoint returns all user data ✅
- [ ] `/api/me/delete` anonymises PII within 30 days ✅
- [ ] IP addresses hashed after 7 days (set up cron)
- [ ] Financial records retained 10 years (subscriptions never deleted)
- [ ] Breach notification plan: 72hrs to BfDI (Berlin data protection authority)
- [ ] Marketing emails only sent if `marketingConsent = true` ✅
- [ ] Privacy policy and Impressum pages live ✅
- [ ] Cookie consent banner (if using analytics)

---

### Support & Monitoring Stack (Recommended)

| Tool | Purpose | Priority |
|------|---------|----------|
| Sentry | Error tracking | Before launch |
| Vercel Analytics | Page performance | Before launch |
| Upstash Redis | Rate limiting + cache | Already planned |
| Stripe Dashboard | Payment monitoring | Already set up |
| Supabase Dashboard | DB + auth monitoring | Already set up |
| Resend Dashboard | Email delivery | Before launch |
| Plausible / Fathom | Privacy-friendly analytics | Post-launch |

---

*Last updated: June 2026*
