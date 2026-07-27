# Go-To-Market: Product · Audience · Fundraising

_Last updated: 2026-07 · A solo-founder execution plan tying together the three
tracks that run in parallel toward launch and seed funding._

> This is the **sequencing / how-they-fit-together** doc. For deep detail see:
> - `LAUNCH_PLAN.md` — full launch plan, German company registration, budget
> - `REVENUE_AND_TEAM_PLAN.md` — revenue model & projections
> - `pitch-deck.html` — the investor deck
> - `PAYMENTS_AND_ENVIRONMENTS.md` — Stripe/Supabase prod migration steps

## Core principle
These three tracks **run in parallel, not in sequence.** A solo founder does not
finish the product, then start marketing, then raise money. You build audience
and prepare the raise *while* finishing the product. Traction is what unlocks the
raise, and marketing is what creates traction.

---

## Current status (2026-07)
- ✅ Product live on Vercel in **mock/demo mode** (demo data, no real users yet)
- ✅ Code saved & pushed; build green; chat mobile-responsive
- ⏳ Real services (Supabase DB, Stripe) not yet enabled for production
- ⏳ No audience / marketing started
- ⏳ No investor outreach started

---

## Track A — Product (get to real users)
Technical gate. The code for both is largely written; this is configuration +
testing, not building from scratch. Realistically a few focused days.

1. **Enable Supabase end-to-end** — run migrations (incl. `0002`), flip
   `MOCK_MODE=false`, verify auth + DB in prod. Foundation for everything real.
2. **Integrate Stripe** — subscription flow already built; needs real keys +
   webhook wired. Booking payments (Stripe Connect) come after.
3. **Add Sentry** — error monitoring before real users (currently blind to bugs).
4. **Smoke test** — register → subscribe → message a host, end to end.

See `PAYMENTS_AND_ENVIRONMENTS.md` for the exact steps.

---

## Track B — Audience / Marketing (start NOW, in parallel)
You can build an audience today, in mock mode, before payments are live.
"Building in public" *is* marketing and costs €0.

**Channel priority for this product (don't do all four at once):**
| Channel | Priority | Play |
|---|---|---|
| **LinkedIn** | 🥇 Highest | Founder build-in-public story, milestones, the "why." Also reaches investors. |
| **Instagram** | 🥈 High | Travel is visual — city photos, host stories, "travel like a local" reels. Where demand lives. |
| **YouTube** | 🥉 Later | High effort. Great long-term SEO/trust, but don't start solo — it eats all your time. |
| **Facebook** | Lowest | Local city groups + paid ads later, once there's budget. Not a launch priority. |

**Start with LinkedIn + Instagram only.** Build a waitlist / early-interest list
you can convert to first users and hosts when you go real.

---

## Track C — Fundraising (seed / pre-seed — prepare in parallel, pitch when ready)

### Golden rule: raise on traction, not on an idea
Investors at pre-seed/seed fund **momentum**. A live product + a waitlist + early
users/hosts + early revenue signal is worth far more than a polished deck alone.
Do not pitch before you have *something* to show beyond the demo. Target window:
after real users are live and there's early traction (roughly Month 6–9 per
`LAUNCH_PLAN.md`).

### What to have ready before approaching investors
- [ ] **Live product** with real users (not just the mock demo) ✅ demo already exists
- [ ] **Traction proof** — signups, active hosts, waitlist size, first revenue, retention
- [ ] **Pitch deck** — 10–12 slides (`pitch-deck.html` is the starting point)
- [ ] **The numbers** — market size, unit economics, revenue model
      (`REVENUE_AND_TEAM_PLAN.md`), CAC/LTV thinking
- [ ] **Company registered** — a legal entity to receive investment
      (Kleingewerbe → UG → GmbH path in `LAUNCH_PLAN.md`)
- [ ] **The story** — why you, why now, why this is big (the LinkedIn narrative
      you'll already have been telling in Track B)

### Where a solo founder in Germany/EU raises pre-seed/seed
- **Angels** — the most realistic first money. Warm intros beat cold outreach.
  Build angel relationships early via LinkedIn (Track B feeds this).
- **Pre-seed / seed funds (DACH/EU)** — target funds that do first cheques and
  marketplace/travel/consumer.
- **Accelerators** — structured programs that give cheque + network + credibility.
- **Government / non-dilutive** — Germany has strong options: **EXIST**
  (founder grant), **High-Tech Gründerfonds (HTGF)**, regional grants. Free money,
  no equity — pursue in parallel; great runway extender.

### Practical sequence
1. **Now → launch:** build the public founder narrative on LinkedIn (Track B).
   Investors follow founders who build in public. This warms the pipeline before
   you ask for anything.
2. **At real-user launch:** start collecting the traction metrics that will go on
   the deck.
3. **Once there's early traction:** finalize the deck, list 20–30 target
   angels/funds, get **warm introductions** (cold email is the last resort).
4. **In parallel throughout:** apply for EXIST / HTGF / relevant grants —
   non-dilutive money and validation.

---

## How the three tracks fit together (timeline sketch)

| Phase | Track A (Product) | Track B (Audience) | Track C (Funding) |
|---|---|---|---|
| **Now** | Get demo feedback | Start LinkedIn + Instagram, build waitlist | Warm up narrative; research grants |
| **Next weeks** | Enable Supabase + Stripe + Sentry | Grow audience; convert waitlist | Draft deck; apply EXIST/HTGF |
| **Real launch** | First real users & hosts | Turn audience → first users | Collect traction metrics |
| **Traction (M6–9)** | Iterate on real usage | Scale channels | Pitch angels/funds with proof |

## What NOT to do
- ❌ Don't finish the product before marketing — start audience now.
- ❌ Don't pitch investors before you have traction to show.
- ❌ Don't chase all four social channels or YouTube solo — LinkedIn + Instagram.
- ❌ Don't let website polish (i18n, UI tweaks) block launch. Momentum > perfection.
