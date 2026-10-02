# Legal Protection Plan

How Offmap limits liability as a peer-to-peer marketplace operating under German/EU law.
The UI checklist is one layer. This document covers all layers.

**Important:** This document is an internal planning guide, not legal advice.
Before taking real money from real users, have a German IT-Recht lawyer review
your Terms of Service. One-time cost ~€1,500–3,000. Non-negotiable.

---

## The core legal position

Offmap is a **Vermittlungsplattform** (marketplace/intermediary) — not a tour operator,
guide service, or experience provider. Offmap connects travelers with locals; it does not
deliver the experience. This distinction drives every legal decision below.

The moment your marketing copy, onboarding flow, or product design implies Offmap
*manages* or *delivers* the experience (e.g. "curated experiences", "we guarantee quality"),
courts apply a higher duty of care. Keep all language in the marketplace framing:
"we connect you", "book with locals", "discover through locals" — not "we offer" or "we provide".

---

## Layer 1 — UI checklist (what users acknowledge at booking time)

Documented proof of informed consent at the moment of transaction. Updated checklist below.

### Traveler side (Step 4 of booking modal)

| # | Statement | Legal purpose |
|---|---|---|
| 1 | I confirm I am 18 years of age or older | Contract validity — BGB §104 minors cannot enter binding contracts |
| 2 | I will verify my host via a video or phone call before meeting, and meet in a public place first | Shifts duty of personal verification to traveler |
| 3 | I have shared (or will share) my plans with someone I trust | Demonstrates traveler took reasonable precautions |
| 4 | I understand Offmap does not background-check, vet, or endorse hosts — I meet this person at my own discretion and risk | Non-endorsement — closes "I thought Offmap verified them" argument |
| 5 | I understand Offmap's dispute resolution covers payment issues only — conduct, injuries, or losses during in-person meetups cannot be mediated by the platform | Scope limitation — prevents "I expected Offmap to handle this" claims |
| 6 | I have read and agree to Offmap's Terms of Service, including Section 4 on in-person meetings | Double consent at transaction time — ToS agreed at registration + reconfirmed here |

### Host side (accept modal)

| # | Statement | Legal purpose |
|---|---|---|
| 1 | I confirm I am 18 years of age or older | Contract validity |
| 2 | I will conduct a video or phone call with the traveler before meeting in person | Host due diligence — cannot claim they had no way to assess the traveler |
| 3 | I will meet in a public location first | Safety standard — shifts responsibility for unsafe meeting choice to host |
| 4 | I understand I am responsible for my own safety and liability insurance | Explicitly declines any assumption of Offmap providing coverage |
| 5 | I understand Offmap does not mediate disputes arising from in-person conduct | Scope limitation on host side too — both parties on record |

**Why both sides matter:** If only travelers see the disclaimer, a host could argue
"I wasn't informed of these limitations." Both sides on record = symmetric protection.

---

## Layer 2 — Terms of Service (the legal contract)

The checklist points to ToS Section 4. That section must exist and must clearly state:

**Section 4 must cover:**

1. **Platform as intermediary** — Offmap facilitates introductions only. All activities,
   experiences, and interactions that occur in-person are between users directly.
   Offmap is not a party to those interactions.

2. **No vetting or endorsement** — Offmap does not conduct criminal background checks,
   identity verification beyond profile review, or skills verification. User ratings
   and reviews are opinions submitted by users and are not verified by Offmap.

3. **Dispute scope limitation** — Offmap's support and dispute resolution processes apply
   to: subscription billing, payment processing, and platform account issues only.
   Offmap cannot and will not mediate disputes arising from in-person conduct.

4. **Liability cap** — Offmap's liability to any user is capped at the amount paid to
   Offmap in the 3 months preceding the claim. (Standard German IT-Recht clause.)

5. **Force majeure and third-party conduct** — Offmap is not liable for harm caused by
   third parties (hosts or travelers) acting outside the platform's control.

6. **Governing law** — German law (BGB). Jurisdiction: courts of [city of registration].

7. **Widerrufsrecht** (Right of withdrawal) — Under EU consumer law (§312g BGB),
   users may have a 14-day right of withdrawal from digital service contracts.
   Subscription services must handle this correctly. Booking sessions (once accepted
   by host) are exempt as they are scheduled personal services (§312g Abs. 2 Nr. 9 BGB).

**Who writes this:** A German Anwalt specialising in IT-Recht or E-Commerce-Recht.
Search: "IT-Recht Kanzlei München" or "Händlerbund" offer affordable startup ToS packages.
Budget: €1,500–3,000 one-time. Required before go-live with real users.

---

## Layer 3 — Host vetting process

The checklist says "Offmap does not background-check hosts." That's true.
But having *any* manual review process dramatically changes your legal position
compared to zero vetting.

**Current plan (first 50 hosts — already in CLAUDE.md):**
- Manual profile review before approval
- `moderationStatus: 'pending' → 'approved'` flow already exists in codebase
- Approval means: profile is complete, photo is real, bio is plausible
- This is NOT identity verification — ToS must say so clearly

**What to check at approval:**
- [ ] Profile photo looks like a real person (reverse image search if unsure)
- [ ] Bio mentions a real neighbourhood, specific local knowledge
- [ ] No red flags in categories or language (e.g. unusual requests in bio)
- [ ] Social link (LinkedIn/Instagram) optionally checked

**What to document:**
- Keep a simple log of who approved each host and when
- If a problem arises later, you want to show you had a process, even if basic

**Phase 1 (50+ hosts):** Stripe Identity or Onfido for ID verification.
Costs ~€1–2 per verification. Adds a "Verified" badge. Changes legal position from
"we did no vetting" to "we confirmed this person's identity."

---

## Layer 4 — Abuse reporting and response (the most important operational layer)

**This is the single biggest legal risk that the checklist cannot cover.**

Under German `Störerhaftung` doctrine and the EU Digital Services Act (DSA, fully live 2024):
if Offmap receives a report that a specific user is dangerous or acting illegally,
and Offmap fails to act, Offmap becomes liable for the next incident — regardless
of what any checklist or ToS says.

**What must exist before go-live:**

- A visible "Report this host/traveler" button on every profile and in every conversation
- A monitored inbox (e.g. `safety@offmap.com`) that receives those reports
- A documented response process: acknowledge within 24h, investigate within 72h,
  decision within 7 days
- A clear outcome: warn / suspend / ban, with record kept
- A record of every report received and how it was resolved

**DSA specific obligations (apply to all EU platforms):**

| Obligation | What it means for Offmap |
|---|---|
| Notice-and-action mechanism | Users must be able to flag illegal content/conduct, and you must act |
| Statement of reasons | If you remove a user, you must tell them why |
| No dark patterns | Cannot use deceptive UI to get users to consent to things |
| Point of single contact | A contact for EU authorities to reach you |
| Transparency report | Once you have >100K monthly active users — annual report required |

At Phase 0 scale you are a "micro-enterprise" under DSA and most heavy obligations
don't apply yet. But the notice-and-action mechanism and safety reporting must exist.

**Minimum viable implementation:**
- Add a "Report concern" link on host profiles → form with category + description
- Route to `safety@offmap.com` (monitored by founder daily)
- Keep a spreadsheet log of all reports and actions taken
- This is enough for Phase 0 and shows good faith

---

## Layer 5 — Business liability insurance

The checklist and ToS protect the company. Insurance pays if the company is found
liable anyway.

**What to get:**
- **Betriebshaftpflichtversicherung** (business liability insurance)
  Covers third-party bodily injury and property damage claims arising from business operations.
  Cost: ~€500–1,500/year at Phase 0 scale.

- **Vermögensschadenhaftpflicht** (financial loss liability / E&O insurance)
  Covers financial losses users claim were caused by the platform (e.g. bad advice, incorrect data).
  Often bundled with Betriebshaftpflicht for digital businesses.

**Providers in Germany:** Hiscox, ERGO, Allianz, HDI — all offer digital business packages.
Get quotes from at least 2. Buy before the first real-money transaction.

**Company structure matters:**
A GmbH (Gesellschaft mit beschränkter Haftung) limits personal liability of founders.
A Kleingewerbe or GbR does not — you are personally liable.
Register as UG (haftungsbeschränkt) or GmbH before go-live. Already in CLAUDE.md roadmap.

---

## Layer 6 — Product and marketing language

Courts look at the full picture of how a platform presents itself, not just the ToS.

**Avoid:**
- "Curated experiences" → implies Offmap selects and endorses
- "We guarantee quality" → creates warranty obligation
- "Verified local experts" → implies professional verification
- "Safe meetups" → could imply Offmap ensures safety
- "Trusted locals" → implies Offmap has established trust

**Use instead:**
- "Connect with locals" → marketplace language
- "Discover the city through someone who lives it" → peer introduction
- "Locals share their city" → user-generated, not Offmap-delivered
- "Reviewed by travelers" → user reviews, not Offmap endorsement
- "Profile approved" (not "Verified") → internal moderation, not professional verification

Audit every marketing page, onboarding screen, and email for language
that implies Offmap is the service provider rather than the marketplace.

---

## Layer 7 — GDPR and data protection (already partially addressed)

GDPR is covered in more detail in `docs/SECURITY_PLAN.md`. The booking-specific
obligations:

- **Consent timestamp stored** — the safety checklist acknowledgment is stored
  with a timestamp in the bookings table: `travelerAcknowledgedAt` (set at booking
  creation) and `hostAcknowledgedAt` (set when host accepts). Both are in `MockBooking`
  and must be added to the production `bookings` schema before go-live. ✅ Implemented in mock.

- **Data minimisation** — only collect what you need for the booking.
  Interests, meeting point, notes are voluntary — keep them that way.

- **Retention** — booking records must be kept for 10 years (HGB §257 commercial records).
  Personal data outside financial records: delete/anonymise after account closure.

- **Right to erasure** — a user can request deletion of personal data.
  Booking *financial records* (amounts, dates) must be kept. Names/emails can be
  anonymised while keeping the financial record. Build this before go-live.

---

## Pre-launch legal checklist

### Must-do before first real user pays money

- [ ] Register company as UG (haftungsbeschränkt) or GmbH — not Kleingewerbe
- [ ] Have a German IT-Recht lawyer draft or review Terms of Service
- [ ] Add Section 4 (in-person meetings) to ToS explicitly
- [ ] Add Privacy Policy in German and English
- [ ] Add Impressum (required by German law — name, address, contact, VAT number)
- [ ] Buy Betriebshaftpflichtversicherung (business liability insurance)
- [ ] Set up `safety@offmap.com` and monitor it daily
- [ ] Add "Report concern" button to host profiles
- [ ] Add `safetyAcknowledgedAt` timestamp column to bookings table
- [ ] Confirm Supabase region is Frankfurt (eu-central-1) — already done ✅
- [ ] Run Mozilla Observatory security scan on live domain
- [ ] Register for VAT (Umsatzsteuer) if revenue expected to exceed €22,000/year (Kleinunternehmergrenze)

### Do within first 3 months of going live

- [ ] Keep a report log (even a spreadsheet) of all abuse/safety reports received
- [ ] Conduct first manual review of all host profiles before approving
- [ ] Add Stripe Identity or equivalent for host ID verification (Phase 1)
- [ ] Audit all marketing copy for platform-framing language
- [ ] Document host approval process (even a 1-page internal SOP)
- [ ] Review DSA obligations as you pass user count milestones

---

## What the checklist alone cannot protect you from (summary)

| Scenario | Protected by checklist? | What actually protects you |
|---|---|---|
| User unhappy with experience quality | ✅ Yes | Checklist + ToS scope limitation |
| Host no-show or late cancellation | ✅ Yes | Cancellation policy + refund process |
| User claims they weren't warned | ✅ Yes | Checklist timestamp on record |
| Known bad actor left on platform after report | ❌ No | Active abuse response process |
| Physical injury during meetup | ⚠️ Partial | Insurance + host vetting + ToS |
| German court finds a clause "unfair" (BGB §307) | ❌ No | Lawyer-drafted ToS |
| DSA compliance audit | ❌ No | Notice-and-action mechanism |
| Gross negligence by Offmap itself | ❌ No | Cannot be disclaimed |
| Fraudulent host Offmap could have detected | ❌ No | Vetting process + active monitoring |
| Financial harm from platform error | ⚠️ Partial | E&O insurance + liability cap in ToS |

---

## Cost summary (Phase 0)

| Item | One-time | Recurring | Priority |
|---|---|---|---|
| German IT-Recht lawyer (ToS review) | €1,500–3,000 | — | Must before go-live |
| UG/GmbH registration | €300–800 | ~€500/yr accounting | Must before go-live |
| Betriebshaftpflichtversicherung | — | €500–1,500/yr | Must before go-live |
| Stripe Identity (host ID verification) | — | ~€1–2 per host | Phase 1 |
| DSA compliance review | €500–1,000 | — | Within 3 months |
| **Total Year 1** | **~€2,300–4,800** | **~€2,000–3,000/yr** | |

At €6–49/subscription and a target of 1,000 subscribers in Year 1, this is 5–10% of
projected revenue. Cheap relative to a single uninsured legal dispute.
