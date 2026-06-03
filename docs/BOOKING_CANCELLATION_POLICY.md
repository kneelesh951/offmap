# Offmap — Booking & Cancellation Policy
**Document version:** 1.0
**Last updated:** May 2026
**Status:** Approved for V1 implementation
**Owner:** Product / Engineering

---

## 1. Overview

This document defines the end-to-end booking lifecycle, cancellation rules, refund policy, host strike system, and dispute process for Offmap's session booking feature.

Offmap connects travelers (buyers) with local host guides (sellers) for paid in-person or virtual sessions. The platform acts as a marketplace intermediary, holding payments and enforcing fair conduct rules on both sides.

---

## 2. Booking Lifecycle

```
TRAVELER                      PLATFORM                        HOST
────────                      ────────                        ────────
Selects host
Chooses duration
Sees fee breakdown
Confirms booking ──────────► Card held (not charged)
                              Status: PENDING
                              Notify host ─────────────────► Host reviews request

                                                             Host ACCEPTS
                              Status: ACCEPTED ◄─────────────
                              Notify traveler

[Session occurs]

                              Auto-capture 26h after
                              session time (if no dispute)
                              Status: COMPLETED
                              Initiate host payout
                              (T+1 business day)
```

### Booking Statuses

| Status | Description |
|--------|-------------|
| `pending` | Traveler confirmed, awaiting host acceptance |
| `accepted` | Host accepted, session is scheduled |
| `declined` | Host declined the request |
| `completed` | Session happened, payment captured, payout initiated |
| `cancelled` | Cancelled by either party before session |
| `disputed` | No-show or issue reported, under review |
| `refunded` | Refund issued after dispute resolution |

---

## 3. Fee Structure

All amounts in EUR. Stored in cents in the database.

| Component | Who Pays | Rate | Example (€60 session, 1hr) |
|-----------|----------|------|---------------------------|
| Session rate | Traveler | Host's listed rate | €60.00 |
| Service fee | Traveler (on top) | 5% | €3.00 |
| **Traveler total** | | | **€63.00** |
| Platform commission | Deducted from host | 15% | €9.00 |
| **Host payout** | | | **€51.00** |
| **Platform revenue** | | | **€12.00** |

### Payment Timing
- Card is **held** (authorised but not captured) at booking confirmation
- Stripe holds funds for up to **7 days** without charging
- **Auto-capture** occurs 26 hours after the scheduled session time
- If no session date is set, auto-capture occurs 7 days after booking accepted
- Host payout is initiated the next business day after capture

---

## 4. Traveler Cancellation Policy

The traveler must acknowledge this policy at booking confirmation (checkbox required).

### Refund Tiers

| Time before session | Refund to traveler | Platform keeps |
|--------------------|--------------------|----------------|
| Within 1hr of booking (cooling-off) | 100% | 0% |
| 48h+ before session | 100% | 0% |
| 24–48h before session | 50% | 50% |
| Less than 24h before session | 0% | 70% → host: 30% |
| No-show (traveler) | 0% | 70% → host: 30% |

### Rules
- 1 free reschedule per booking (must be 48h+ before original session)
- Rescheduled date must be within 30 days of original
- 2nd reschedule attempt is treated as a cancellation
- "Short notice booking" (booking made < 24h before session): cooling-off period does not apply — traveler accepts full risk
- Cancellation is instant once confirmed; refund processing takes 5–10 business days

---

## 5. Host Cancellation Policy

Host cancellations are penalised more heavily than traveler cancellations because:
- Hosts are the supply-side professionals
- Travelers may have made travel arrangements around the session
- Platform trust depends on host reliability

### Penalties

| Time before session | Traveler outcome | Host outcome |
|--------------------|-----------------|--------------|
| 48h+ before | Full refund | Warning email, no strike |
| 24–48h before | Full refund + €10 platform credit | 1 strike + search ranking suppressed |
| Less than 24h | Full refund + €20 platform credit | 2 strikes + payout frozen 7 days |
| No-show | Full refund + €25 platform credit | 2 strikes + payout frozen 14 days |

**Platform credits** are funded by the platform from its commission revenue — not charged to the host.

### Strike Consequences

| Strike count | Consequence |
|-------------|-------------|
| 1 | Warning email |
| 2 | Warning + 30-day search ranking suppression |
| 3 | Account review (manual by Offmap team) |
| 4 | Permanent suspension |

Strikes reset after **6 months** of clean behaviour (no cancellations, no no-shows).

---

## 6. Host Accept / Decline Flow

- Host has **48 hours** to accept or decline a booking request
- If host does not respond in 48 hours: booking is **auto-declined**, full refund to traveler, 1 warning to host
- Declined bookings: traveler gets full refund, no strike for host (declining is legitimate)

---

## 7. No-Show Detection & Validation

The platform cannot automatically verify if a session happened. The following process applies:

### Process
1. **Scheduled session time passes**
2. **2-hour dispute window opens** — traveler can tap "Report no-show"
3. If no report: auto-capture fires 26 hours after session time
4. If reported: dispute flow opens (see Section 8)

### Proof Considered in No-Show Disputes
- Conversation thread (was host communicating on the day?)
- Both parties' self-report
- Any photos or messages shared as evidence
- Pattern history (previous no-shows from host)

---

## 8. Dispute Process

### Traveler Raises Dispute
1. Traveler taps "Report no-show" within 2 hours of session time
2. Platform notifies host — host has 24 hours to respond with evidence
3. If host does not respond: traveler wins, full refund, host gets double strike
4. If host responds: Offmap team reviews conversation thread + evidence
5. Decision communicated within 48 hours
6. Losing side has no appeal (V1 — appeals in V2)

### Extenuating Circumstances (Both Sides)
Full refund, no strike, if supported by documentation:

| Circumstance | Acceptable Documentation |
|-------------|--------------------------|
| Medical emergency | Doctor's note or hospital record |
| Death in immediate family | Obituary or death certificate |
| Natural disaster | News article or government advisory |
| Government travel ban | Official government source |
| Serious crime affecting travel | Police report |

**Process:** Claimant submits form + document scan → Offmap reviews within 24 hours → decision emailed.

---

## 9. Rescheduling Policy

| Action | Rule |
|--------|------|
| 1st reschedule (either party) | Free, must be 48h+ before session |
| New date range | Within 30 days of original session date |
| 2nd reschedule | Treated as cancellation — policy applies |
| Reschedule after 48h window | Not allowed, treat as cancellation |

---

## 10. Refund Processing

- Stripe refunds go back to the original payment method
- Processing time: 5–10 business days (bank dependent)
- Platform credits: added to user's Offmap account instantly, valid 12 months
- Credits can be used to offset future booking costs (not redeemable for cash)

---

## 11. Host Payout Policy

- Payouts initiated **T+1 business day** after payment capture
- Payout method: Stripe Connect Express (bank transfer)
- Minimum payout: €10 (smaller amounts held until threshold reached)
- Payout currency: EUR
- Payout frozen during: active dispute, payout suspension period (from cancellation strikes)

---

## 12. Data & Audit Trail

All booking events are logged in `audit_logs` table with:
- Timestamp (UTC)
- Actor (traveler, host, or system)
- Action (created, accepted, declined, cancelled, disputed, completed, refunded)
- Refund amount
- Strike applied (if any)

Retained for **10 years** (financial records — GDPR Article 17(3)(b) exception).

---

## 13. Test Scenarios (Local Development — Mock Mode)

The following flows can be tested locally using mock mode (`MOCK_MODE=true`) without real Stripe or real money.

### Mock Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Traveler (with subscription) | traveler@demo.com | demo1234 |
| Host | host@demo.com | demo1234 |

### Test Scenarios Checklist

#### Booking Creation
- [ ] Traveler books a session → status `pending`
- [ ] Fee breakdown shown correctly (5% service fee, 15% commission)
- [ ] Traveler without subscription blocked with `SUBSCRIPTION_REQUIRED`

#### Host Accept / Decline
- [ ] Host logs in → sees pending booking in dashboard
- [ ] Host accepts → status becomes `accepted`
- [ ] Host declines → status becomes `declined`, traveler sees decline

#### Traveler Cancellation
- [ ] Cancel 48h+ before → 100% refund shown
- [ ] Cancel 24–48h before → 50% refund shown
- [ ] Cancel <24h before → 0% refund warning shown
- [ ] Cooling-off: cancel within 1hr of booking → 100% refund

#### Host Cancellation
- [ ] Host cancels 48h+ before → traveler refunded, warning issued
- [ ] Host cancels <24h before → traveler refunded + platform credit, strike recorded
- [ ] Host no-show → report flow, host gets double strike

#### No-Show Flow
- [ ] Traveler taps "Report no-show" → dispute status
- [ ] Host responds with evidence → under review
- [ ] Auto-resolve after 24h host non-response → traveler wins

#### Strikes
- [ ] Host accumulates strikes → warning email triggered
- [ ] 3 strikes → account review flag set

---

## 14. Future Enhancements (V2)

| Feature | Description |
|---------|-------------|
| Appeal process | Losing party can appeal within 72hrs |
| In-app check-in | Both parties tap "Start session" when they meet |
| Automated KYC for disputes | ID verification required before dispute raised |
| Dynamic cancellation policy | Host can choose stricter policy (e.g. no refunds always) |
| Group bookings | Multiple travelers on one booking |
| Recurring sessions | Weekly/monthly repeat bookings at discounted rate |
| Instant book | Host pre-approves — no 48hr acceptance window |

---

## 15. Open Questions (To Resolve Before Go-Live)

| # | Question | Priority |
|---|----------|----------|
| 1 | What currency for platform credits — EUR only or allow GBP for UK expansion? | High |
| 2 | Who bears Stripe fees on refunds? (Stripe doesn't refund processing fees) | High |
| 3 | How long until host can re-list after permanent suspension? | Medium |
| 4 | Should rescheduling notify the traveler's calendar automatically? | Low |
| 5 | Should we charge a deposit (e.g. 20%) upfront rather than full hold? | Medium |

---

*This document is intended for internal use. Export to Confluence via Markdown import or copy-paste into a Confluence page. For Word export, open this .md file in Typora or Pandoc: `pandoc BOOKING_CANCELLATION_POLICY.md -o BOOKING_CANCELLATION_POLICY.docx`*
