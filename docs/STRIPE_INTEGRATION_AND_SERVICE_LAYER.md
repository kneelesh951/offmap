# Stripe Integration & Service Layer Plan

**Status:** Mock mode live. Stripe integration is ~2–3 days of work. Service layer refactor is ~1 day.

---

## Part 1 — Stripe Integration

### How much changes

The mock/production split was designed so the UI and API structure stay identical. Only the payment calls inside two files change.

| File | What changes | Effort |
|---|---|---|
| `src/app/api/bookings/route.ts` | Replace mock PaymentIntent flag with real `stripe.paymentIntents.create()` | 2h |
| `src/app/api/bookings/[id]/route.ts` | Replace mock captured/released flags with `stripe.paymentIntents.capture()` / `.cancel()` | 1h |
| `src/components/booking/BookSessionButton.tsx` | Add Stripe Elements card input in Step 4 | 4h |
| `src/app/api/stripe/connect/` | New: host Connect Express onboarding endpoint | 4h |
| `src/lib/db/schema.ts` | Add `stripe_connect_account_id` to `host_profiles` | 30min |
| `src/app/api/webhooks/stripe/route.ts` | Add `payment_intent.succeeded`, `transfer.paid` handlers | 2h |

**Total: ~2 days**

The calendar, availability APIs, slot logic, booking modal steps — none of that changes.

---

### Step-by-step integration order

**Step 1 — Host onboarding (Connect Express)**

Before taking any payments, hosts need a Stripe Connect account to receive payouts.

```
POST /api/stripe/connect/onboard
→ stripe.accounts.create({ type: 'express', country: 'DE' })
→ stripe.accountLinks.create({ account: id, type: 'account_onboarding' })
→ redirect host to Stripe's onboarding URL
→ on return: store stripeConnectAccountId on host_profiles
```

Add to `host_profiles` table (new nullable column, zero-downtime):
```sql
ALTER TABLE host_profiles ADD COLUMN stripe_connect_account_id TEXT;
```

**Step 2 — Booking creation: authorise only**

In `POST /api/bookings`, before creating the booking record:

```typescript
// Create PaymentIntent FIRST — if Stripe fails, no booking is created
const intent = await stripe.paymentIntents.create({
  amount: fees.travelerTotal,       // cents
  currency: 'eur',
  capture_method: 'manual',         // authorise only — do not charge yet
  transfer_data: {
    destination: host.stripeConnectAccountId,
  },
  application_fee_amount: fees.platformFee,
  metadata: {
    hostUserId: data.hostUserId,
    travelerId: user.id,
    sessionDate: data.sessionDate,
  },
})

// Then create booking with the real payment intent id
// Field name stays the same: mockPaymentIntentId → rename to paymentIntentId in schema
```

The `capture_method: 'manual'` is the key. Stripe holds a 7-day authorisation on the card. Nothing is charged until host accepts.

**Step 3 — Host accept: capture payment**

In `PATCH /api/bookings/[id]`:

```typescript
if (action === 'accept') {
  await stripe.paymentIntents.capture(booking.paymentIntentId)
  // Stripe automatically transfers host payout via transfer_data set at creation
}
if (action === 'decline') {
  await stripe.paymentIntents.cancel(booking.paymentIntentId)
  // Full authorisation released — traveler sees nothing on their statement
}
```

**Step 4 — Frontend: collect card in Step 4**

Add Stripe Elements to the confirm step. The flow becomes:
1. `POST /api/bookings/prepare` → returns `clientSecret` from a new PaymentIntent
2. `stripe.confirmCardPayment(clientSecret)` — Stripe handles 3DS if needed
3. On success → `POST /api/bookings` with the confirmed `paymentIntentId`

Packages to add:
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Step 5 — Add webhook handlers**

In `src/app/api/webhooks/stripe/route.ts`, add:

```typescript
case 'payment_intent.payment_failed':
  // booking.paymentStatus = 'failed', notify traveler, unlock slot
  break
case 'account.updated':
  // host Connect onboarding complete → mark host as payout-enabled
  break
```

---

### Env vars needed for production

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

No new env vars for Connect — uses the same secret key.

---

### Fee flow (recap)

```
Traveler pays: session_rate × hours + 5% service fee  → goes to Stripe
Stripe holds the full amount as a manual PaymentIntent

Host accepts:
  → capture fires
  → Stripe sends to host Connect account: session_rate × hours − 15% commission
  → Platform keeps: 5% service fee + 15% commission = ~20% of session_rate × hours
  → Host receives: 85% of session_rate × hours
```

---

## Part 2 — Production Readiness Gaps

### Critical — fix before go-live

#### Gap 1: Race condition on slot booking

**What breaks:** Two travelers open the same host profile, both see slot X as green, both hit "Send request" within 200ms. Both pass the in-memory overlap check before either writes to the database. Result: double-booking.

**Fix — DB advisory lock in a transaction:**

In `src/lib/services/BookingService.ts` (after refactor):

```typescript
await db.transaction(async (tx) => {
  // Acquire advisory lock scoped to this host+date — serialises concurrent requests
  const lockKey = hashFnv32(hostId + sessionDate.slice(0, 10))
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`)

  // Now check overlap — no other transaction can hold this lock simultaneously
  const conflicts = await tx.select()...where(overlap condition)
  if (conflicts.length > 0) throw new SlotUnavailableError()

  // Safe to insert
  await tx.insert(bookings).values(...)
})
```

The advisory lock is held only for the duration of the transaction (~5ms). No impact on unrelated host/date combinations. **~2 hours to implement.**

#### Gap 2: `hostMustRespondBy` is stored but never enforced

**What breaks:** Host ignores the booking. Slot stays locked forever. Traveler's card stays authorised indefinitely (Stripe's manual capture window is 7 days, then it expires).

**Fix — Inngest scheduled job:**

```typescript
// inngest/functions/autoDeclineExpiredBookings.ts
export const autoDeclineExpired = inngest.createFunction(
  { id: 'auto-decline-expired', name: 'Auto-decline overdue booking requests' },
  { cron: '*/15 * * * *' },           // every 15 minutes
  async ({ step }) => {
    const expired = await step.run('fetch-expired', async () =>
      db.select().from(bookings)
        .where(and(
          eq(bookings.status, 'pending'),
          lt(bookings.hostMustRespondBy, new Date()),
        ))
    )
    for (const b of expired) {
      await step.run(`decline-${b.id}`, async () => {
        await stripe.paymentIntents.cancel(b.paymentIntentId)
        await db.update(bookings).set({ status: 'declined', paymentStatus: 'released' })
          .where(eq(bookings.id, b.id))
        // send traveler "slot expired" email
      })
    }
  }
)
```

**Half a day.**

#### Gap 3: No rate limit on `POST /api/bookings`

A subscribed user could automate booking requests as a DoS against a host's calendar. Fix: add Upstash rate limit (5 booking attempts per user per hour) — the same pattern already used on auth endpoints in `src/middleware.ts`. **20 minutes.**

---

### Important — fix within first month

#### Gap 4: Session auto-complete

Accepted bookings never move to `completed`. Host payouts never release. Fix: Inngest job that fires 26 hours after `session_date`, checks for no dispute, moves to `completed`, triggers payout and review prompts.

#### Gap 5: Booking idempotency

If a traveler's network drops after the server creates the booking but before the client receives the response, they might retry and create a duplicate. Fix: client generates a UUID idempotency key, server stores it and returns the existing booking if the key is seen twice.

---

## Part 3 — Service Layer

### Where business logic lives today (the problem)

All the core logic is currently **inline inside route handlers**:

| Logic | Current location | Should be |
|---|---|---|
| Fee calculation (`calcFees`) | `src/app/api/bookings/route.ts:20` | `BookingService.calculateFees()` |
| Slot availability (`getDateStatus`) | `src/app/api/hosts/[id]/availability/route.ts:12` | `AvailabilityService.getDayStatus()` |
| Time slot generation (`getAvailableSlots`) | `src/app/api/hosts/[id]/slots/route.ts:19` | `AvailabilityService.getSlots()` |
| Overlap/double-booking check | `src/app/api/bookings/route.ts:125` | `BookingService.checkSlotAvailable()` |
| Response window (`hostMustRespondBy`) | `src/app/api/bookings/route.ts:160` | `BookingService.calculateResponseDeadline()` |
| Cancellation policy | `src/lib/booking/cancellation.ts` ✅ | Already extracted — this is the right pattern |

The `src/lib/booking/cancellation.ts` file shows what extracted logic looks like: pure functions, no HTTP calls, no database calls, fully testable in isolation.

---

### Should this move to Python?

**Short answer: no — not at Phase 0. The security concern is already solved.**

The common reason to move business logic to Python is: "Python is more secure." That framing is wrong. Next.js API routes run **entirely on the server** — they are never sent to browsers, never in client bundles, identical in security posture to a Python FastAPI service.

What matters for security is:
- Code runs server-side ✅ (both Next.js API routes and Python FastAPI)
- No secrets in client code ✅ (env vars, never in browser bundle)
- Input validated before business logic runs ✅ (Zod)
- DB queries parameterised ✅ (Drizzle ORM)
- Auth checked before any logic executes ✅

A Python microservice would add:
- A new deployment target (Railway/Fly.io/Cloud Run)
- Service-to-service auth (API keys or mTLS)
- Network hop (~20–50ms added latency per booking request)
- A second language/runtime to maintain and monitor
- Duplicate schema types (TypeScript types + Python Pydantic models)

And it would give you nothing that a TypeScript service layer doesn't already give you.

**When Python does make sense (future phases):**

| Trigger | Why Python then |
|---|---|
| ML-based host recommendations | scikit-learn, PyTorch — no JS equivalent |
| Fraud detection scoring | Python ML ecosystem |
| NLP for review analysis | Hugging Face models |
| Heavy data pipelines | Pandas/Polars for analytics |
| >10K bookings/day with complex pricing | Python has better numerical libraries |

Until you hit one of those triggers, the right move is extracting TypeScript service classes — same language, zero new infrastructure.

---

### Target service layer structure

```
src/lib/services/
  BookingService.ts        ← fee calc, slot validation, overlap check, response deadline
  AvailabilityService.ts   ← day status, slot generation, window logic
  SubscriptionService.ts   ← check active sub, Redis cache, fallback to DB
  HostService.ts           ← profile, search, ranking score
  ReviewService.ts         ← create, validate, bidirectional
  CancellationService.ts   ← already exists as src/lib/booking/cancellation.ts
```

Each service is a plain TypeScript module that exports pure functions (or a class). No HTTP calls. No `cookies()`. No `NextResponse`. Just inputs → outputs, testable with `jest` or `vitest` in 10 lines.

Route handlers become thin:
```typescript
// Before (current): 80 lines mixing auth, validation, business logic, DB
export async function POST(req: Request) {
  const user = getUser()
  const data = validate()
  // ... 60 lines of inline business logic ...
  const booking = db.insert(...)
}

// After (target): 20 lines — auth, validate, delegate, respond
export async function POST(req: Request) {
  const user = await requireAuth()
  const data = bookingSchema.parse(await req.json())
  const booking = await BookingService.createBooking(user.id, data, db)
  return NextResponse.json({ success: true, data: { booking } }, { status: 201 })
}
```

---

### Migration plan (1 day of work)

1. Create `src/lib/services/BookingService.ts` — move `calcFees`, overlap check, response deadline calculation
2. Create `src/lib/services/AvailabilityService.ts` — move `getDateStatus`, `getAvailableSlots`
3. Update route handlers to call services instead of inline logic
4. Write unit tests for each service function (pure functions — trivial to test)
5. Rename `src/lib/booking/cancellation.ts` → `src/lib/services/CancellationService.ts` for consistency

No behaviour changes. Routes get shorter. Logic becomes testable.

---

## Summary

| Task | Effort | Priority |
|---|---|---|
| DB advisory lock (race condition) | 2h | Do before launch |
| Auto-decline cron (Inngest) | 4h | Do before launch |
| Rate limit on booking POST | 20min | Do before launch |
| Stripe Connect host onboarding | 4h | Sprint 1 |
| Stripe PaymentIntent in booking POST | 2h | Sprint 1 |
| Stripe Elements in modal Step 4 | 4h | Sprint 1 |
| Stripe capture/cancel in PATCH | 1h | Sprint 1 |
| Webhook handlers | 2h | Sprint 1 |
| Session auto-complete cron | 1 day | Sprint 2 |
| Service layer extraction | 1 day | Sprint 2 |
| Unit tests for service functions | 1 day | Sprint 2 |
| Python microservice | — | Only when ML needed |
