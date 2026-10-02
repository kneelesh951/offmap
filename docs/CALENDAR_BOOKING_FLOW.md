# Calendar Booking Flow

## Overview

Offmap uses a **calendar-based availability + request model**:
- Host sets their weekly availability once (recurring schedule + blocked dates)
- Traveler sees only genuinely available dates/slots — cannot pick arbitrary times
- Traveler submits a booking REQUEST for an available slot
- Slot is immediately soft-locked (no second request possible for same window)
- Card is AUTHORISED (not charged) at request time
- Host accepts → card CAPTURED (money moves)
- Host declines / no response → authorisation released (nothing charged)

---

## Availability Data Model

Stored as JSONB in `host_profiles.availability`:

```typescript
interface HostAvailability {
  windows: Array<{
    dayOfWeek: number   // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
    startTime: string   // "14:00"
    endTime: string     // "20:00"
  }>
  minNoticeHours: number     // default 24 — min hours ahead traveler can book
  maxSessionHours: number    // default 4  — max duration per session
  maxSessionsPerDay: number  // default 1  — prevents double-booking same day
  blockedDates: string[]     // ["2026-10-26", "2026-10-27"] — holidays/travel
}
```

---

## Calendar Status Logic

For each date shown to traveler:

| Status | Colour | Condition |
|--------|--------|-----------|
| `available` | 🟢 Green | Has window for that day + not blocked + past min notice + no pending/accepted booking |
| `pending` | 🟡 Orange | Has a pending booking request for that day |
| `booked` | ⛔ Grey | Has an accepted booking OR no window OR blocked OR within min notice window |

---

## API Routes

### `GET /api/hosts/[id]/availability?month=YYYY-MM`
Returns day-by-day status for the month. Used to render the calendar.

```json
{
  "success": true,
  "data": {
    "2026-10-07": "available",
    "2026-10-08": "unavailable",
    "2026-10-14": "pending",
    "2026-10-15": "available"
  }
}
```

### `GET /api/hosts/[id]/slots?date=YYYY-MM-DD`
Returns available start times for a specific date.

```json
{
  "success": true,
  "data": {
    "window": { "start": "14:00", "end": "20:00" },
    "slots": ["14:00", "15:00", "16:00"],
    "maxSessionHours": 4,
    "bookedSlots": []
  }
}
```

### `POST /api/bookings`
Creates a booking request. Validates slot availability server-side before accepting.

Requires: `hostUserId`, `sessionDate` (ISO), `durationHours`, `noteFromTraveler?`

### `PATCH /api/bookings/[id]`
Host accepts or declines a pending booking.

Body: `{ "action": "accept" | "decline", "reason"?: string }`

---

## Full Flow

```
TRAVELER opens host profile
  └─ Sees calendar with available (green) / pending (orange) / unavailable (grey) dates

TRAVELER picks green date
  └─ Sees available time slots for that date

TRAVELER picks slot + duration + details
  └─ Sees price breakdown (rate × hours + 5% service fee)
  └─ Completes safety checklist
  └─ Clicks "Send Booking Request"

SERVER validates:
  ├─ Is this date/time still available? (re-check, prevents race condition)
  ├─ Is traveler subscribed?
  └─ Is duration within host's maxSessionHours?

SLOT LOCKED (status: pending)
  └─ Other travelers see date as "pending"

HOST receives notification
  └─ Must respond within dynamic window:
     - >72h before session  → 24h to respond
     - 24–72h before        → 8h to respond
     - 12–24h before        → 4h to respond
     - <12h before          → blocked (cannot book)

HOST ACCEPTS
  └─ Mock: booking status → 'accepted', paymentCapturedAt set
  └─ Production: Stripe PaymentIntent captured
  └─ Both get confirmation email + calendar invite
  └─ Host payout queued (after session completes)

HOST DECLINES / NO RESPONSE
  └─ Mock: booking status → 'declined', slot unlocked
  └─ Production: Stripe authorisation cancelled (no charge)
  └─ Traveler notified + shown alternative hosts

AFTER SESSION COMPLETES
  └─ Host marks session complete (or auto-completes 26h after session_date)
  └─ Host payout released
  └─ Both prompted to leave review
```

---

## Payment States (Mock vs Production)

| State | Mock | Production (Stripe) |
|-------|------|---------------------|
| Request submitted | `paymentStatus: 'authorized'` flag | `PaymentIntent` created with `capture_method: 'manual'` |
| Host accepts | `paymentStatus: 'captured'` flag | `stripe.paymentIntents.capture(id)` |
| Host declines | `paymentStatus: 'released'` flag | `stripe.paymentIntents.cancel(id)` |
| Refund | `paymentStatus: 'refunded'` flag | `stripe.refunds.create({ payment_intent: id })` |

In mock mode, no real money moves. The `paymentStatus` field simulates the Stripe state.
When Stripe is integrated, replace the mock payment flags with real PaymentIntent calls.
The booking flow UI does not change — only the payment handler in `POST /api/bookings`.

---

## Host Availability Settings (Dashboard)

Host sets in `/host-dashboard/availability`:

1. **Weekly schedule** — toggle each day on/off, set start/end time
2. **Session limits** — min notice hours, max session hours, max sessions per day
3. **Blocked dates** — pick specific dates to block (holidays, travel)

Settings saved to `host_profiles.availability` JSONB.
Takes effect immediately for future booking requests.

---

## Waitlist (Phase 2)

Not built in Phase 1. When a slot is pending:
- Show traveler: "This date has a pending request — try another date"
- Phase 2: "Join waitlist" stores interest, notifies on slot opening with 2h priority window
- Waitlist join is FREE — no payment, no authorisation
- Payment only when waitlisted traveler submits their own booking request

---

## Double-Booking Prevention

Server-side check in `POST /api/bookings`:

```
Reject if host has ANY booking with status IN ('pending', 'accepted')
WHERE session overlap with requested (sessionDate, sessionDate + durationHours)
```

This is the final safety net even if the calendar UI shows a slot as available (race condition between two simultaneous requests).

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/mock/db.ts` | `MockBooking.hostMustRespondBy`, `MockHostProfile.availability` |
| `src/lib/mock/data.ts` | Seed availability windows for all mock hosts |
| `src/app/api/hosts/[id]/availability/route.ts` | Calendar month view API |
| `src/app/api/hosts/[id]/slots/route.ts` | Time slots for a date API |
| `src/app/api/bookings/route.ts` | Updated POST with slot validation |
| `src/app/api/bookings/[id]/route.ts` | PATCH accept/decline |
| `src/components/booking/BookSessionButton.tsx` | Replaced with calendar flow |
| `src/components/booking/AvailabilityCalendar.tsx` | Calendar date picker component |
| `src/app/host-dashboard/availability/page.tsx` | Host availability settings UI |
