# Offmap — Run locally in 5 minutes (no keys needed)

## Prerequisites
- Node.js 18+ installed (`node --version` to check)
- That's it. No database, no Stripe, no Redis.

---

## Step 1 — Install
```bash
npm install
```

## Step 2 — You're done. Run it.
```bash
npm run dev
```
Open http://localhost:3000

The app runs in **mock mode** by default (`MOCK_MODE=true` in `.env.local`).
Everything works: browsing hosts, searching, filtering, logging in, conversations, the subscription flow — all with realistic fake data. No external services needed.

---

## What works in mock mode

| Feature | Works? | Notes |
|---|---|---|
| Homepage with hosts | ✅ | 8 real-looking sample hosts |
| Search & filter | ✅ | Filter by city, category, language |
| Host profile pages | ✅ | Full profiles with bios and reviews |
| Login / Register | ✅ | Any email + password works |
| Traveler dashboard | ✅ | Shows mock subscription |
| Host dashboard | ✅ | Full dashboard UI |
| Conversations | ✅ | Sample conversation with messages |
| Live chat | ✅ | Messages save in memory (resets on restart) |
| Subscribe button | ✅ | Redirects to dashboard (skips Stripe) |
| Pricing page | ✅ | All plan UI works |
| Legal pages | ✅ | Privacy, Terms, Impressum |

---

## Logging in (mock mode)

Go to http://localhost:3000/auth/login and enter **any** email and password.
You will be logged in as `Dev User` with an active annual subscription.

---

## When you're ready to connect real services

Edit `.env.local` and change `MOCK_MODE=false`, then fill in the real values:

### 1. Supabase (free)
1. supabase.com → New project → choose **Frankfurt** region (GDPR)
2. Settings → API → copy URL and anon key
3. Settings → Database → Connection string → copy URI

### 2. Stripe (free to set up, charges only on real transactions)
1. dashboard.stripe.com → Get API keys
2. Create 4 products (Day €6, Weekly €12, Monthly €18, Annual €49)
3. Webhooks → Add endpoint → `https://yourdomain.com/api/webhooks/stripe`
4. Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 3. Upstash Redis (free tier)
1. upstash.com → Create database → EU region
2. Copy REST URL and token

### 4. Resend (free tier — 3,000 emails/month)
1. resend.com → Create account → Verify your domain
2. Copy API key

### 5. Run database migrations
```bash
npm run db:migrate
npx tsx drizzle/seed.ts  # adds the 8 European cities
```

---

## Useful commands
```bash
npm run dev          # Start development server
npm run build        # Check for TypeScript/build errors
npm run typecheck    # Type-check without building
npm run db:studio    # Visual database browser (needs real DB)
```
