# Booking UI Test Guide

Manual test checklist for the calendar booking flow.
Run this after any changes to booking, availability, or slot logic.

**Dev server:** `npm run dev` → `http://localhost:3000`
**Mode:** Mock (no real Stripe, no real DB — all in-memory, resets on restart)

---

## Credentials

| Role | Email | Password | Notes |
|---|---|---|---|
| Traveler | `traveler@demo.com` | `demo1234` | Has active subscription |
| Host — Berlin, Amira Khalil | `host@demo.com` | `demo1234` | Has pending booking-seed-1 on restart |
| Host — Amsterdam, Yuki Tanaka | `amsterdam@demo.com` | `demo1234` | Has accepted booking-seed-2 on restart |
| Host — Lisbon, Marco Vasquez | `lisbon@demo.com` | `demo1234` | Clean slate |
| Host — Berlin, Lars Bauer | `berlin2@demo.com` | `demo1234` | Clean slate |

> All mock data resets on server restart. Re-run from Test 1 after every restart.

---

## Test 1 — Traveler books a session (full happy path)

**Login as:** `traveler@demo.com`

**Steps:**
1. Go to Search → pick any city → open any host profile
2. Click **"Book a session"** button
3. **Step 1 — Calendar**
   - Green dates = available (clickable)
   - Orange dot = pending request exists that day
   - Grey = no window / within min-notice cutoff / blocked
   - Click a grey date → nothing should happen
   - Click a **green** date → it highlights, "Next: Choose time →" activates
4. **Step 2 — Time slots**
   - Hourly slots appear (e.g. `14:00`, `15:00`, `16:00`)
   - Click a slot → highlights in green
   - Use `+`/`−` to change duration — watch the time range summary update
   - Duration cannot exceed host's max (shown next to `−`/`+`)
5. **Step 3 — Details**
   - Fill in interests and/or meeting point (both optional)
   - Click Next
6. **Step 4 — Review & confirm**
   - Booking summary shows correct date, time, duration
   - Price breakdown shows: session rate × hours + 5% fee = total
   - Host payout shown (session rate × hours − 15%)
   - Tick all **3 safety checkboxes** — submit button stays disabled until all ticked
   - Click **"Send booking request"**
7. Success screen shows date/time → modal auto-closes after 3s

**Pass criteria:**
- [ ] Calendar renders with green/orange/grey dates
- [ ] Grey dates are not clickable
- [ ] Duration `+`/`−` capped at host max
- [ ] Price recalculates when duration changes
- [ ] Submit disabled until all 3 safety boxes ticked
- [ ] Success state shown after submit
- [ ] `paymentStatus: 'authorized'` — card not charged yet (mock)

---

## Test 2 — Host accepts the pre-seeded pending booking

**Login as:** `host@demo.com` (Amira Khalil)

**Steps:**
1. Go to **Host Dashboard** (`/host-dashboard`)
2. Scroll to **"Session booking requests"**
3. Find **booking-seed-1**: Alex Demo · next Tuesday 14:00 · 3h · Berlin street food tour
4. Click **"Accept"** → modal shows 3 host safety checkboxes → tick all → confirm
5. Booking status changes to **Confirmed** ✅
6. Sign out → log in as `traveler@demo.com`
7. Go to **My Trips** → booking shows as **Confirmed**
8. Open Amira's host profile → booking calendar → next Tuesday is now **grey** (booked)

**Pass criteria:**
- [ ] Pending booking appears in host dashboard on login
- [ ] Accept modal requires all 3 checkboxes
- [ ] After accept: status = Confirmed on both sides
- [ ] That date/slot is no longer green on the traveler-facing calendar

---

## Test 3 — Host declines a booking

**Login as:** `traveler@demo.com`

**Steps:**
1. Find any host with green dates → book a session (follow Test 1 steps)
2. Sign out → log in as that host
3. Host Dashboard → find the pending request
4. Click **"Decline"** → optionally enter a reason → confirm
5. Booking shows as **Declined**
6. Sign out → log in as `traveler@demo.com`
7. My Trips → booking shows as **Declined**
8. Open that host's profile → the date is **green again** (slot unlocked)

**Pass criteria:**
- [ ] Decline sets booking to Declined
- [ ] `paymentStatus: 'released'` (no charge in mock)
- [ ] Slot is green again on traveler's calendar

---

## Test 4 — Host sets availability

**Login as:** `host@demo.com` (Amira)

**Steps:**
1. Host Dashboard → click **"Set your availability"** card
2. Current schedule loads (Tue/Wed/Fri/Sat windows pre-seeded)
3. **Toggle off** Wednesday — toggle goes grey, day shows "Not available"
4. Change Friday's end time to `16:00`
5. Add a blocked date: pick any date 2+ weeks out → "Block date" → red chip appears
6. Click **"Save availability settings"** → button turns green "Saved!"
7. Sign out → log in as `traveler@demo.com`
8. Open Amira's profile → booking calendar:
   - Wednesday = grey (no window)
   - The blocked date = grey
   - Friday slots end at 15:00 (last slot that fits within 16:00 end)

**Pass criteria:**
- [ ] Settings page loads with existing schedule
- [ ] Toggle off removes the day from calendar
- [ ] Changed end time shrinks available slots
- [ ] Blocked date shows as grey on traveler calendar
- [ ] Save confirmation shows

---

## Test 5 — Amsterdam pre-seeded accepted booking

**Login as:** `amsterdam@demo.com` (Yuki Tanaka)

**Steps:**
1. Host Dashboard → booking requests
2. Find **booking-seed-2**: Alex Demo · next Friday 10:00 · 2h · already accepted
3. Status shows **Confirmed** — no action needed
4. Sign out → `traveler@demo.com` → open Yuki's profile (Amsterdam hosts)
5. Next Friday shows as **grey/booked** on calendar

**Pass criteria:**
- [ ] Pre-accepted booking visible in host dashboard
- [ ] Correct date shows as booked on traveler-facing calendar

---

## Test 6 — Double-booking prevention

**Login as:** `traveler@demo.com`

**Steps:**
1. Book a session with Amira on an available green date (any slot)
2. Do NOT switch accounts — open Amira's profile again in the **same browser**
3. Try to book the same date and overlapping time slot
4. Server should return: **"This time slot is already taken"** (409 error shown in modal)

**Pass criteria:**
- [ ] Second booking on the same slot is rejected with a clear error message
- [ ] The date shows as orange (pending) not green

---

## Test 7 — Edge cases

| Test | Steps | Expected result |
|---|---|---|
| Grey day is not clickable | Click any grey calendar day | No slots load, no step change |
| Duration cap | In Step 2, tap `+` past max (host max is 4h) | Button stops at max, no higher |
| Partial safety checklist | In Step 4, tick only 2 of 3 boxes | Submit stays disabled |
| Too-close booking | Open host profile, try API call with sessionDate = today + 6h | `SLOT_UNAVAILABLE: Host requires at least 24h notice` |
| Host cannot book | Log in as any host, visit another host's profile | No "Book a session" button, or 403 if forced |
| Past dates | Look at current month | All past dates are grey, cannot be clicked |
| Back navigation | In modal Step 3, click `‹` back arrow | Returns to Step 2 with slot still selected |
| Close and reopen | Close modal mid-flow, reopen | Returns to Step 1 (state reset) |

---

## Quick API smoke tests (browser console or curl)

```bash
# Availability for Amira (replace month as needed)
curl "http://localhost:3000/api/hosts/user-host-demo/availability?month=2026-10"

# Slots for a specific available date
curl "http://localhost:3000/api/hosts/user-host-demo/slots?date=2026-10-07"

# List all bookings (must be logged in — use cookie)
curl -b cookies.txt "http://localhost:3000/api/bookings"
```

Expected responses:
- Availability: `{ "2026-10-01": "booked", "2026-10-02": "available", ... }`
- Slots: `{ window: {start, end}, slots: ["14:00","15:00",...], maxSessionHours: 4 }`

---

## Pre-seeded mock data reference

| ID | Type | Traveler | Host | Date | Status |
|---|---|---|---|---|---|
| `booking-seed-1` | Pending request | Alex Demo | Amira (Berlin) | Next Tuesday 14:00 | `pending` / `authorized` |
| `booking-seed-2` | Accepted booking | Alex Demo | Yuki (Amsterdam) | Next Friday 10:00 | `accepted` / `captured` |

Availability windows seeded for all 11 hosts. Specific windows per host are in `src/lib/mock/db.ts` around line 483 (`hostAvailability` map).

---

## Known limitations in mock mode

| Limitation | Impact | Fix |
|---|---|---|
| Data resets on server restart | All bookings made during testing are lost | Expected — restart = fresh state |
| No real payment UI | Step 4 has no card input | Stripe Elements added when Stripe is integrated |
| `hostMustRespondBy` not auto-enforced | Expired requests stay pending forever | Inngest cron job (not yet built) |
| Race condition not DB-locked | In mock, single-threaded JS prevents races | DB advisory lock needed for production |
| No email notifications | Booking request/accept emails not sent in mock | Mock email log in `src/lib/mock/email.ts` |
