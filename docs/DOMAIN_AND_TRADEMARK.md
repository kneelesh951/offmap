# Domain Registration & Trademark Reference

> Quick reference for buying offmap.* domains and clearing the trademark.
> Status: pre-purchase — none of this is bought yet.

---

## 1. Action checklist

- [ ] **Step 1 — Trademark search (10 min, free)**
  - [ ] EUIPO TMview (https://www.tmview.europa.eu) — search "offmap"
  - [ ] DPMA Register (https://register.dpma.de) — search "offmap"
  - [ ] Google + Apple App Store + Play Store for "offmap" — check existing commercial use
  - [ ] Note any conflicts with class 39 (travel) or class 42 (software)
- [ ] **Step 2 — Tier 1 domains (today, ~€30/yr)**
  - [ ] `offmap.com` at Cloudflare Registrar (~€10/yr)
  - [ ] `offmap.de` at Porkbun or INWX (~€8/yr)
  - [ ] `offmap.eu` at Cloudflare or Porkbun (~€5/yr)
- [ ] **Step 3 — Tier 2 defensive (within 30 days, ~€45/yr)**
  - [ ] `offmap.app` (~€15/yr)
  - [ ] `offmap.io` (~€30/yr)
  - [ ] `offmap.co` (optional, ~€20/yr)
- [ ] **Step 4 — Post-purchase setup (5 min each)**
  - [ ] Enable WHOIS privacy (automatic in EU by GDPR; verify)
  - [ ] Enable auto-renew on all domains
  - [ ] Set up email forwarding `hello@offmap.com → kneelesh951@gmail.com`
- [ ] **Step 5 — Before company registration (~€350)**
  - [ ] File DE trademark via DPMA (or skip to EUIPO if going EU-wide ~€850)

---

## 2. Why "today" — the timing argument

Domain squatter bots scrape WHOIS lookup logs and DNS query traffic. A search on the wrong site → 30 seconds later the domain is registered by an opportunist who resells for €500–€5,000.

Public signals already exist (GitHub repo `kneelesh951/offmap`, mock-mode env files, this doc). The asymmetry is overwhelming: **€30/yr lock-in vs €500–€5,000 buyback.**

Buy before any of these:
- Twitter / LinkedIn / Slack mentions of the name
- Public GitHub repo with >5 stars
- Any landing page or splash site
- Sharing the name with people outside your immediate circle

---

## 3. Where to buy

| Registrar | Best for | Notes |
|---|---|---|
| **Cloudflare Registrar** | `.com`, `.eu`, `.app`, `.io` | At-cost pricing, no markup. Requires Cloudflare account. Doesn't support `.de` new registrations. |
| **Porkbun** | All TLDs including `.de` | Cheap, transparent, clean UI. Good fallback for `.de`. |
| **Namecheap** | Backup option | Solid, slightly more expensive. |
| **INWX** / **United Domains** | `.de` specifically | Direct DENIC integration, best for `.de` if you want German-native registrar. |
| **Gandi.net** | EU/GDPR-conscious | French registrar with good privacy posture. |

**Avoid:** GoDaddy (aggressive upsells, bad UX), Squarespace Domains (former Google Domains, overpriced now), 1&1 IONOS (constant upsell screens).

---

## 4. TLD priority + cost

| TLD | Tier | ~Cost/yr | Why |
|---|---|---|---|
| `offmap.com` | 1 | €10 | International default, expected |
| `offmap.de` | 1 | €8 | German market expects `.de`; legally important once Impressum says "Offmap, Berlin" |
| `offmap.eu` | 1 | €5 | EU coverage signal, cheap |
| `offmap.app` | 2 | €15 | Forces HTTPS, modern brand TLD |
| `offmap.io` | 2 | €30 | Startup default, common squat target |
| `offmap.co` | 2 | €20 | Common typo target |
| `offmap.travel` | 3 | €120 | Industry-specific, prestigious. Skip until Series A. |
| `offmap.net` / `.org` | 3 | €10 each | Old-school defensive; low priority. |

---

## 5. Known trademark / naming concern

⚠️ **At least one existing "OffMap" Android app exists** (offline maps). Before committing:

1. Check whether they hold a **registered EU trademark** (EUIPO TMview).
2. Check the **trademark class** — class 39 (travel services) or class 42 (software) would conflict; an unrelated class is usually fine.
3. Check **jurisdictions** — a US-only filing doesn't block a DE/EU launch.

### Fallback names if "Offmap" is taken in the wrong class

- `getoffmap.com` (founder-friendly modifier)
- `offmap.travel` (TLD distinguishes class)
- `offmapclub`, `offmaps` (plural / suffix)
- Rebrand entirely — better to discover now than after €30k of marketing spend

---

## 6. Post-purchase configuration (do when ready to deploy)

When pointing domains at Vercel:

1. Vercel Project → Domains → Add `offmap.com`
2. Vercel provides 2 nameservers OR 1 A record
3. At registrar: switch nameservers (full Vercel DNS) OR add the A record (keep registrar DNS)
4. DNS propagates in 1–15 minutes
5. Add `staging.offmap.com` as a separate domain pointing to the `staging` branch deployment

Email forwarding `hello@offmap.com` → `kneelesh951@gmail.com`:
- Cloudflare Email Routing: free, 5 min setup
- Porkbun email forwarding: free, included
- Useful for receiving Stripe / Supabase / EUIPO / DPMA notices without exposing your personal Gmail

---

## 7. Trademark filing — when and where

Defer until either:
- You've decided definitively to commit to "Offmap" as the brand (post-MVP, post-soft-launch)
- Someone else is sniffing around the name

Then:

| Filing | Coverage | Cost | When |
|---|---|---|---|
| **DPMA national** (Germany only) | DE only | ~€350 (3 classes) | Before launching in DE market with paid traffic |
| **EUIPO** | All 27 EU member states | ~€850 (1 class) | Once revenue justifies it; covers DE + everywhere |
| **WIPO Madrid System** | International (US, UK, etc.) | €1,500+ | Series A or after first international expansion |

Go EUIPO over DPMA if budget allows — covers more for ~2.5× the price.

---

*Last updated: 2026-06-26.*
