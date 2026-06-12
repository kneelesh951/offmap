# Offmap Phase 0 Launch Plan — 3-Month Roadmap

> Created: June 2026 | Solo founder | Target: public launch by September 2026

---

## Month 1: Harden, Test, Prepare (Weeks 1–4)

### Week 1–2: Security & Code Hardening

| Task | How | Time |
|------|-----|------|
| Add `@sentry/nextjs` | `npm i @sentry/nextjs && npx @sentry/wizard@latest -i nextjs` | 1hr |
| Security headers in `next.config.js` | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy | 2hr |
| Run `npm audit --audit-level=high` | Fix all high/critical vulnerabilities | 1–3hr |
| Enable GitHub Dependabot | Repo → Settings → Security → Enable | 5min |
| Run Mozilla Observatory scan | observatory.mozilla.org → fix flagged issues | 2hr |
| Enable Supabase email verification | Dashboard → Auth → Settings → Enable email confirmation | 10min |
| Test all RLS policies with real auth | Log in as user A, try to access user B's data via API | 3hr |
| Verify Stripe webhook signatures work in production | Send test events from Stripe dashboard | 1hr |
| CSRF origin check | Already built — verify `NEXT_PUBLIC_APP_URL` is set in Vercel env | 10min |
| Remove any remaining `console.log` with PII | Grep for email, name, IP in server logs | 1hr |
| Rate limiting verification | Hit auth endpoints 20x rapidly, confirm blocking works | 30min |

**CI security scanning (add to `.github/workflows/ci.yml`):**
```yaml
- name: Security audit
  run: npm audit --audit-level=high
```

### Week 2–3: Testing

**Manual testing protocol:**

| Test type | What to test | How |
|-----------|-------------|-----|
| **Functional** | Every user flow end-to-end in mock mode | Traveler: search → view host → subscribe → message → review. Host: all dashboard flows. |
| **Cross-browser** | Chrome, Firefox, Safari, Edge | BrowserStack free trial or own devices |
| **Mobile** | iOS Safari, Android Chrome | Real phone — emulators miss touch/keyboard issues |
| **Accessibility** | Keyboard navigation, screen reader | axe DevTools extension (free) |
| **Edge cases** | Empty states, long text, special characters, emoji in messages | Try to break every input field |
| **Auth flows** | Register, login, logout, forgot password, session expiry | Test with real Supabase auth (MOCK_MODE=false) |
| **Subscription flows** | Stripe test mode checkout, webhook handling, portal | Stripe test cards (4242...) |
| **Error states** | Kill Supabase connection, invalid API calls, 404 pages | Verify graceful error messages, no stack traces |

**Load testing (free):**

| Tool | Purpose | How |
|------|---------|-----|
| **k6** (open source) | API load testing | `brew install k6`, hit `/api/hosts/search`, `/api/auth/login`, `/api/conversations` |
| **Target** | 100 concurrent users, 200ms P95 on search | Sufficient for launch |

Sample k6 script:
```javascript
import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 50, duration: '60s' };
export default function () {
  const res = http.get('https://your-app.vercel.app/api/hosts/search?cityId=city-berlin');
  check(res, { 'status 200': (r) => r.status === 200, 'fast': (r) => r.timings.duration < 400 });
}
```

### Week 3–4: Production Infrastructure Setup

| Task | Service | Cost/month |
|------|---------|------------|
| Deploy to Vercel | Connect GitHub repo, set env vars | **$20** (Pro) |
| Supabase Pro (Frankfurt eu-central-1) | PITR, more connections | **$25** |
| Upstash Redis | Rate limiting + caching | **~$10** |
| Custom domain | `offmap.com` or `offmap.de` | **~€12/year** |
| DNS + SSL | Vercel handles automatically | $0 |
| Stripe live mode | Switch from test to live keys | $0 (pay per txn) |
| Resend (transactional email) | Welcome, subscription confirmation | $0 (free: 3K emails/mo) |
| Sentry | Error tracking | $0 (free: 5K errors/mo) |
| Betterstack | Uptime monitoring | **~$20** |

---

## Month 2: Soft Launch & First Users (Weeks 5–8)

### Week 5: Seed Content — The Cold Start Problem

**Get first 10–15 hosts (€0 cost, just hustle):**

| Channel | How | Target |
|---------|-----|--------|
| **Your network** | Friends in Berlin, Hamburg, Lisbon who'd enjoy showing their city | 3–5 hosts |
| **Facebook groups** | "Expats in Berlin", city-specific groups | 3–5 hosts |
| **Reddit** | r/berlin, r/hamburg, r/lisbon, r/digitalnomads | 2–3 hosts |
| **Couchsurfing refugees** | CS went paid in 2020 — former hosts want alternatives. Post in CS Facebook groups | 3–5 hosts |
| **Instagram DMs** | Local guides/food bloggers with 1K–10K followers | 2–3 hosts |

**Pitch to hosts:**
> "We're launching a platform where travelers find real locals for city experiences. Completely free to list — you set your own rate. We're looking for founding hosts in [city]. Interested?"

**5 hosts with great photos and bios > 20 empty profiles.**

### Week 5: Register Kleingewerbe

Register at local Gewerbeamt (€20–60, same day). Required before accepting real payments.

### Week 6: Beta Launch (Invite-Only)

- Deploy with real Supabase + Stripe
- Invite 20–30 travelers from your network
- Give free 1-month subscriptions (create manually in Stripe)
- Set up feedback form (Tally.so — free) or WhatsApp group
- Monitor Sentry daily
- Watch Supabase dashboard for slow queries

### Week 7–8: Fix & Iterate

- Fix every bug from beta users
- Improve UX based on feedback
- Add missing error/empty states
- Verify emails are received (check spam)

---

## Month 3: Public Launch & Growth (Weeks 9–12)

### Week 9: Public Launch Checklist

- [ ] All beta bugs fixed
- [ ] Privacy policy and Terms of Service reviewed
- [ ] Impressum page complete (legally required in Germany)
- [ ] Cookie consent banner added (GDPR)
- [ ] Analytics enabled (Vercel Analytics)
- [ ] Stripe live mode verified with real €6 test purchase (refund yourself)
- [ ] Transactional emails working
- [ ] 404 and error pages look professional
- [ ] OpenGraph/social media meta tags on all pages
- [ ] Sitemap.xml and robots.txt in place

### Week 9–12: Marketing & Acquisition

**Free channels (€0):**

| Channel | Strategy |
|---------|----------|
| **Product Hunt** | "Offmap: Meet real locals, skip the tourist traps" |
| **Hacker News** | "Show HN" — focus on tech story (solo founder, Next.js, GDPR) |
| **Reddit** | r/solotravel, r/digitalnomads, r/travel, r/backpacking |
| **Twitter/X** | Build in public — journey, screenshots, user stories |
| **Instagram** | City content: "5 things only Berlin locals know" → link to Offmap |
| **TikTok** | "I asked a local to show me the real [city]" — viral format |
| **Travel blogs** | 20 bloggers, offer free accounts for honest reviews |
| **Facebook groups** | Travel planning, expat, digital nomad groups |
| **SEO** | Blog: "Best local experiences in Berlin", "How to meet locals traveling" |

**Paid channels (€200–500/month MAX, only after 10+ hosts with good profiles):**

| Channel | Budget | Target | Expected CPA |
|---------|--------|--------|-------------|
| **Instagram/Facebook ads** | €150/mo | Travelers 22–40, interests: travel, backpacking | €3–8/signup |
| **Google Ads** | €100/mo | "meet locals [city]", "local guide Berlin" | €5–15/signup |
| **Reddit ads** | €50/mo | r/travel, r/solotravel audience | €4–10/signup |

**Referral program (build in Month 3):**
- Traveler refers friend → both get 3 free days
- Host refers host → "Founding Host" badge
- Cost: €0 (giving subscription time, not cash)

---

## Budget Summary

### Monthly Recurring

| Item | Month 1 | Month 2 | Month 3 |
|------|---------|---------|---------|
| Vercel Pro | $20 | $20 | $20 |
| Supabase Pro | $25 | $25 | $25 |
| Upstash Redis | $10 | $10 | $10 |
| Betterstack | $20 | $20 | $20 |
| Sentry / Resend | $0 | $0 | $0 |
| Paid ads | €0 | €0 | €200–500 |
| **Total** | **~€75** | **~€75** | **€275–575** |

### One-Time Costs

| Item | Cost |
|------|------|
| Domain name | €15–50 |
| Kleingewerbe registration | €20–60 |
| **Total** | **€35–110** |

### 3-Month Total Out of Pocket

| Scenario | Total |
|----------|-------|
| **Minimum** (no ads, delay registration) | **€240–275** |
| **Moderate** (small ad spend, Kleingewerbe) | **€500–700** |
| **Maximum** (ads + UG registration) | **€900–1,200** |

---

## Legal — Company Registration in Germany

### Registration Path

| Step | When | What | Cost |
|------|------|------|------|
| 1 | Month 2 (before first real payment) | **Kleingewerbe** — sole proprietorship at local Gewerbeamt | €20–60 |
| 2 | When hitting €1K MRR or raising money | **UG (haftungsbeschränkt)** — mini-GmbH, limited liability | €500–700 |
| 3 | Pre-seed/Seed round | **GmbH** — full limited company, investors expect this | €25,000 capital + €1–2K legal |

### Kleinunternehmerregelung

If revenue < €22,000/year, you don't charge or remit VAT. Once over, register for USt-ID at Finanzamt.

### Legal Must-Haves Before Launch

| Requirement | What | Cost |
|-------------|------|------|
| **Impressum** | Name, address, email, registration number (TMG §5) | €0 |
| **Datenschutzerklärung** | GDPR privacy policy (use datenschutz-generator.de) | €0 |
| **AGB (Terms of Service)** | Liability, cancellation, disputes (template-based) | €0 |
| **Cookie consent** | GDPR + ePrivacy consent banner | €0 |
| **Widerrufsbelehrung** | 14-day withdrawal right for digital subscriptions | €0 |

**Get lawyer review before €5K MRR.** Budget €500–1,000.

### Key Legal Risks

| Risk | Mitigation |
|------|------------|
| **User safety incident** | ToS Section 4 explicitly states Offmap doesn't vet/monitor/control meetings |
| **Not an OTA** | Don't say "book trips" in marketing — say "connect with locals" |
| **ZAG / payment regulation** | Subscription-only = no ZAG license. Stripe Connect handles Phase 1 commissions |
| **Platform liability (DSA)** | Need: Report button on profiles, content moderation transparency |

---

## Investor Readiness

### When to Pitch (Month 6–9, NOT Month 3)

| Milestone needed | Why |
|-----------------|-----|
| Live product with real users | Proves you can build and ship |
| 50+ hosts across 3+ cities | Proves supply acquisition |
| €500+ MRR (or strong growth) | Proves willingness to pay |
| 100+ registered travelers | Proves demand |
| 3+ months of data | Shows retention, engagement, conversion |

### What Pre-Seed Investors Want

| Element | What to show |
|---------|-------------|
| **Traction** | MRR chart going up. Even €200 → €500 → €1,200 over 3 months works |
| **Unit economics** | CAC, LTV, LTV/CAC ratio > 3 |
| **Market size** | TAM for P2P travel experiences — ref Airbnb Experiences, GetYourGuide |
| **Wedge** | "Real locals, not tour operators" — Couchsurfing-meets-Airbnb |
| **Ask** | €100K–300K pre-seed for German UG/GmbH |

### Where to Pitch (Germany)

| Stage | Where | Check size |
|-------|-------|-----------|
| **Pre-seed** | Angels, EXIST Gründerstipendium, local Startup-Zentrum | €25K–150K |
| **Pre-seed funds** | Antler, Entrepreneur First, APX, IBB Ventures (Berlin) | €50K–200K |
| **Seed** | Cherry Ventures, Point Nine, HV Capital, Cavalry Ventures | €500K–2M |
| **Grants** | EXIST Forschungstransfer, NRW/Bayern startup grants | €10K–50K |

### EXIST Gründerstipendium

If you graduated from a German university within last 5 years:
- €3,000/month for 12 months + €30K materials + €5K coaching = **~€65K non-dilutive**
- Need university as institutional partner

### Pitch Deck Structure (Build Month 4–5)

1. Problem — "Travelers get tourist traps, locals stay invisible"
2. Solution — "Offmap connects travelers with verified local hosts"
3. Demo — live product screenshots
4. Traction — users, hosts, MRR, growth rate
5. Market — €50B+ European travel experiences
6. Business model — subscription + booking commission (15%+5%)
7. Competition — Airbnb Experiences, Couchsurfing, Showaround
8. Roadmap — Phase 1 commissions, Phase 2 host tiers
9. Team
10. Ask — €X for Y months runway

---

## Timeline Summary

```
MONTH 1 — HARDEN
├── Week 1-2: Security audit, headers, Sentry, dependency scanning
├── Week 2-3: Manual testing, cross-browser, mobile, accessibility
├── Week 3-4: Deploy to Vercel, Supabase Pro, domain, Stripe live
└── Deliverable: Production-ready app, all critical bugs fixed

MONTH 2 — SOFT LAUNCH
├── Week 5: Recruit first 10-15 hosts + register Kleingewerbe
├── Week 6: Beta launch — 20-30 invited travelers, free subs
├── Week 7-8: Fix bugs, iterate UX, monitor Sentry
└── Deliverable: Working product with real users, first feedback

MONTH 3 — PUBLIC LAUNCH
├── Week 9: Launch checklist, final polish
├── Week 9: Product Hunt + HN Show HN
├── Week 10-12: Content marketing, social media, community posts
├── Week 11-12: Start small paid ads if host supply ready
└── Deliverable: Public product, first paying customers
```

## Key Metrics to Track from Day 1

| Metric | Tool | Target by Month 3 |
|--------|------|-------------------|
| Registered travelers | Supabase | 100+ |
| Active hosts | Supabase | 15–25 |
| Paying subscribers | Stripe | 10–20 |
| MRR | Stripe | €100–300 |
| Conversations started | Supabase | 30+ |
| Visitor → signup | Vercel Analytics | >3% |
| Signup → subscriber | Stripe/DB | >10% |
| Error rate | Sentry | <1% |
| P95 latency | Vercel Analytics | <400ms |

What matters at pre-seed is the **slope**, not the intercept — 10 → 20 → 50 subscribers over 3 months beats 200 flat.
