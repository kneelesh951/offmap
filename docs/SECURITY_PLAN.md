# Offmap Security Plan — EU / GDPR Production Readiness

> Living document. Last reviewed: 2026-06-14.
> Companion to `docs/PRODUCTION_ARCHITECTURE.md` (this one is security-only).
> Severities: **P0** = blocker before first real signup · **P1** = within 2 weeks of go-live · **P2** = first 90 days · **P3** = ongoing discipline.

---

## 1. Current baseline (verified against the code, not memory)

### Strong
- Drizzle ORM only, no raw SQL → SQL injection closed.
- Zod `safeParse` on every mutating route; consistent `{success,data/error}` shape.
- CSRF via Origin check in `src/middleware.ts` (webhooks exempt).
- Stripe webhook signature verified before processing (`src/app/api/webhooks/stripe/route.ts`).
- Supabase service-role client is server-only (`src/lib/supabase/server.ts`).
- RLS enabled on all 14 deployed tables (per audit 2026-06-03).
- GDPR data export + erasure routes exist; deletion anonymises PII, keeps financial records.
- `audit_logs` table exists; deletion path writes a row.
- Security headers (HSTS preload, X-Frame, X-Content-Type, Referrer-Policy) in `next.config.js`.
- Avatar upload validates MIME + size (`src/app/api/me/avatar/route.ts`).
- Mock session cookie is `httpOnly`, `SameSite=lax`.

### Confirmed gaps
1. **Cron auth bypass when `CRON_SECRET` is unset** — `src/app/api/cron/emails/route.ts:22-25` uses `if (cronSecret && authHeader !== ...)`; missing env var means the endpoint is open.
2. **Webhook idempotency is implicit** — relies on Drizzle upsert. Stripe retries can re-fire confirmation emails + duplicate audit rows.
3. **Flat 100 req/60s for all `/api/*`** — no tighter bucket for `/api/auth/*` or `/api/ai/chat` (cost vector).
4. **No CSP** anywhere. `next.config.ts` has `Permissions-Policy` but Next loads `next.config.js` — only one wins.
5. **Password policy:** 8-char min, no leaked-password check, no email verification enforced.
6. **`bookings`, `notifications`, `audit_logs` RLS** — audit notes coverage but the bookings migration may not be deployed; verify before traffic.
7. **PII in logs** — cron route logs raw `err.message`; needs structured logger that redacts.
8. **ID documents** (`host_profiles.id_document_url`) are GDPR Art. 9 *special-category* data, stored as a plain URL with no column-level encryption and likely a public-readable storage bucket.
9. **EXIF not stripped** on uploads → leaks GPS + camera metadata.
10. **AI chat route** — no per-user/IP throttle, no token-budget cutoff.
11. **No Sentry** — blind in production.
12. **Real Supabase auth cookies** must be verified `Secure + SameSite=Lax + HttpOnly` once we leave mock mode.
13. **No impressum, no Datenschutz, no AGB, no cookie consent** — legal preconditions for serving from a `.de` audience.

---

## 2. EU-specific obligations

| Regime | What we must do | Where it lands |
|---|---|---|
| **GDPR / BDSG** | Lawful basis per purpose; Art. 13/14 notice; Art. 15 access; Art. 17 erasure; Art. 20 portability; Art. 30 ROPA; ≤72h breach notice to BfDI/state DPA; DPA with every processor | Privacy Policy, `/api/me/data-export`, `/api/me/delete`, ROPA doc, processor list |
| **TTDSG / TDDDG** | Prior, informed, freely-given consent for any non-essential cookie or local-storage write; granular categories; symmetric reject button | Cookie banner before any analytics/marketing tag fires |
| **ePrivacy** | Marketing emails only with opt-in; one-click unsubscribe (`List-Unsubscribe` header) | Resend templates; `users.marketingConsent` exists |
| **DSA (Art. 14, 16, 24)** | Notice-and-action mechanism for illegal content; clear ToS; single contact point; transparency report once thresholds crossed | `/api/reports` exists — needs public NTD form + statement of reasons |
| **AI Act (Art. 50)** | Tell users they are interacting with AI; mark AI-generated content | Alma chatbot UI label + system message |
| **Schrems II** | SCCs + Transfer Impact Assessment for every non-EU processor (Anthropic US, Stripe IE/US, Resend US, Upstash US, Cloudflare US) | DPA list with Module 2 SCCs on file |
| **Impressum (TMG §5 / DDG)** | Mandatory legal notice (company, address, contact, VAT ID once registered, responsible person) | Public `/impressum` page |
| **FernAbsG / VRRL** | 14-day withdrawal right on subscriptions — except where consumer explicitly waives for digital services | Checkout consent + waiver checkbox |
| **PSD2 / SCA** | Strong customer auth on card payments — Stripe handles; do not route around it | Stripe Checkout (already) |

---

## 3. Phased plan

### P0 — Hard blockers before any real signup

#### Auth & session
- Enforce email verification (Supabase Auth → "Confirm email" toggle).
- Enable Supabase leaked-password protection; raise password floor to **10 chars** (or zxcvbn ≥ 3, or HIBP `range` check).
- Tiered rate limits in `src/middleware.ts`:
  - `/api/auth/*` → 5 req / 15 min per IP.
  - `/api/ai/chat` → 20 req / hour per user.
  - default → 100 / 60s.
- Verify Supabase cookies: `Secure`, `SameSite=Lax`, `HttpOnly`; `__Host-` prefix where possible.

#### Webhooks & cron
- Cron must fail-closed if `CRON_SECRET` is unset (or hard-fail at module load).
- Stripe webhook idempotency via Upstash:
  `SETNX stripe:event:{event.id} 1 EX 172800` at the top of the handler.
- Move Resend calls out of the webhook request path (Inngest or fire-and-forget with retry) so a slow Resend never causes a Stripe retry storm.

#### Browser hardening
- Delete `next.config.ts` (dead — Next reads `.js`) OR consolidate into one file.
- Add to `next.config.js`:
  - `Content-Security-Policy` — `default-src 'self'`; `script-src 'self' https://js.stripe.com https://va.vercel-scripts.com`; `img-src 'self' https://*.supabase.co https://images.unsplash.com data:`; `connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co`; `frame-src https://*.stripe.com`; `upgrade-insecure-requests`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.
  - `Cross-Origin-Opener-Policy: same-origin`; `Cross-Origin-Resource-Policy: same-site`.
- Roll CSP in `Content-Security-Policy-Report-Only` first; flip to enforcing after a clean week.
- Mozilla Observatory → A+.

#### Database & RLS
- Run a regression: log in as two real Supabase users, attempt cross-tenant reads/writes on `messages`, `bookings`, `conversations`, `subscriptions`, `audit_logs`, `notifications`, `host_photos`. Any success is a P0 fix.
- Deploy the `bookings` table with RLS policies **in the same migration** — never expose a table before policy.
- Deny-by-default on `audit_logs` for everyone except service role + own row read.
- Normalise `users.email` to lowercase (or use `citext`) so case-variant enumeration is impossible.

#### GDPR-critical
- ID documents → **private** Supabase Storage bucket + signed-URL fetch. `host_profiles.id_document_url` stores the path, not a public URL. Cascade-delete storage object on user delete.
- Strip EXIF on every uploaded image (`sharp().rotate().withMetadata({})` or `exiftool-vendored`). Block if mime sniffing disagrees with declared type (`file-type`).
- Pino logger with redaction on `email`, `phone`, `name`, `ip`, `authorization`. Sweep `console.error('...:', err)` callsites.
- Sentry `beforeSend` hook strips email/phone/name from event payloads.

#### Application / abuse
- Sentry (`@sentry/nextjs`), `tracesSampleRate: 0.1`, source maps via auth token, release = git SHA.
- `npm audit --audit-level=high` + Snyk OSS in `.github/workflows/ci.yml`. Enable Dependabot.
- Lock `/api/admin/*` to `users.role === 'admin'` + step-up confirmation header.

#### Legal pages (required to launch in DE)
- `/impressum` (TMG §5).
- `/datenschutz` (Privacy Policy in German, Art. 13 disclosures, processor list, retention, rights, BfDI complaint route).
- `/agb` (Terms in German, DSA "clear and intelligible").
- Cookie consent banner — block analytics/marketing tags until consent.
- AGB consent + 14-day withdrawal waiver checkbox in `/pricing` checkout.

---

### P1 — Within 2 weeks of launch

- **Inngest** for emails + heavy webhook side effects + outbound Stripe calls. Webhook returns 200 in <50ms; side effects retry.
- **Audit log enrichment**: `withAudit()` wrapper on every mutating route, writes `{ userId, action, recordId, oldData, newData }`. Today only `me/delete` writes.
- **IP hashing cron**: daily rewrite of `audit_logs.ip_address` older than 7 days to `sha256(ip + daily_salt)`.
- **Account-takeover hardening**: on password change → invalidate all other sessions via `supabase.auth.admin.signOut(userId)`. Email user on new IP/UA login.
- **Subscription gate** server-side on every protected route via Redis-cached lookup, not just middleware cookie presence.
- **DSA notice-and-action** form (`/report-content`) feeding `reports` table + statement-of-reasons emails.
- **AI Act Art. 50** disclosures: "You're chatting with Alma, an AI assistant" badge, system prompt blocks impersonation of staff, `aria-label="AI-generated"` on output.

---

### P2 — First 90 days

- **PITR** (Supabase Pro), quarterly restore drill, RPO ≤ 1 min and RTO ≤ 60 min documented in `docs/RUNBOOKS.md`.
- **Secrets rotation policy**: 90-day rotation for `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`. Vercel env, never `.env`.
- **Cloudflare** in front of Vercel — WAF (OWASP CRS), Bot Fight Mode, country-block on `/api/admin/*`.
- **Per-user rate limits** (key on `userId`, not just IP) to defeat credential-stuffing with IP rotation.
- **Image pipeline** in Inngest: virus scan → sharp resize (thumb/card/full WebP) → immutable filenames (content hash) → CDN 1y.
- **Penetration test** (€2-4k, e.g. cure53, SecuRing, NSIDE) once the booking flow is live.
- **ROPA** (Verzeichnis von Verarbeitungstätigkeiten) — required in DE if processing special-category data (IDs) or systematic processing.
- **DPAs on file** with: Vercel, Supabase, Stripe, Resend, Upstash, Anthropic, Cloudflare. Store in `docs/legal/dpas/`.
- **Schrems II TIA** documenting US transfers + supplementary measures (encryption in transit, pseudonymisation, minimum-necessary fields).
- **Incident response runbook**: breach criteria, 72h BfDI notice template, user notification template, post-mortem template. Primary + backup responder named.

---

### P3 — Ongoing discipline

- Row-level **Postgres audit triggers** on `users`, `host_profiles`, `bookings`, `subscriptions`.
- **Supabase Vault** column-level encryption for `users.phone`, `host_profiles.id_document_url`.
- **SOC 2 Type II** only if pursuing enterprise/B2B.
- **Bug bounty** (YesWeHack EU, HackerOne) once triage capacity exists.
- **PR template**: every new PII column gets a ROPA row, retention, logger redaction, data-export path.

---

## 4. Development-phase action list

What we can ship now, on `main`, without breaking mock mode or the existing dev loop. All items use the `MOCK_MODE` branch pattern that's already in the codebase, or live entirely in production-only code paths that never run in dev.

| # | Change | Files | Why safe in dev |
|---|---|---|---|
| 1 | Cron auth fail-closed | `src/app/api/cron/emails/route.ts` | Mock mode rarely calls this; require `CRON_SECRET` always |
| 2 | Stripe webhook idempotency | `src/app/api/webhooks/stripe/route.ts` | Production-only branch; mock skips webhook entirely |
| 3 | Tiered rate limits | `src/middleware.ts` | Already wrapped in `if (!isMock)` |
| 4 | CSP in **Report-Only** mode | `next.config.js` | Logs violations without blocking; flip to enforcing later |
| 5 | Delete dead `next.config.ts` | — | `.js` wins anyway |
| 6 | Pino logger + sweep `console.error` | `src/lib/logger.ts` + API routes | Drop-in replacement; dev sees pretty-printed |
| 7 | Sentry SDK install + config | `sentry.*.config.ts`, `next.config.js` | No-op when `SENTRY_DSN` unset |
| 8 | EXIF strip on uploads | `src/app/api/me/avatar/route.ts`, host photo route | Works in mock — just transforms bytes |
| 9 | Password floor → 10 chars on **register** only | `src/app/api/auth/register/route.ts` | Login is unchanged, demo accounts (`demo1234`) still work |
| 10 | AI Act label on Alma | chatbot UI component + system prompt | UI text, safe |
| 11 | Cookie consent banner | new component + provider | UI plumbing, no tags to gate yet |
| 12 | Impressum / Datenschutz / AGB pages | `src/app/impressum`, `/datenschutz`, `/agb` | Static content |
| 13 | RLS regression script | `scripts/test-rls.ts` | Only runs against real Supabase env |
| 14 | `npm audit --audit-level=high` + Snyk in CI | `.github/workflows/ci.yml` | CI-only, no runtime impact |
| 15 | Dependabot config | `.github/dependabot.yml` | CI-only |
| 16 | AGB checkbox + withdrawal waiver | `/pricing` checkout component | UI, safe |
| 17 | `withAudit()` wrapper | `src/lib/audit.ts` + route adoption | Writes to mockDb in mock mode, real DB in prod |

### Defer until pre-prod (would break dev or needs real creds)

- **Supabase email verification enforcement** — Supabase dashboard toggle; mock mode needs a flag to skip (mock users have no real email).
- **Leaked-password check (HIBP API)** — adds network latency in dev; gate behind `!IS_MOCK`.
- **Move ID documents to private bucket + signed URLs** — production-only code path; mock mode stores nothing real.
- **Per-user rate limits keyed on userId** — needs real Supabase auth context.
- **Cloudflare WAF / Bot Fight** — needs prod DNS.
- **PITR** — Supabase Pro.
- **Sentry source-map upload** — needs Sentry account + auth token.
- **CSP in *enforcing* mode** — start in Report-Only in dev; flip on a per-env flag once violations are zero.
- **DSA `/report-content` flow** — fine to design but depends on a real moderation queue.

### Order of operations (4–5 dev days)

1. PR 1 — items 1, 2, 5, 14, 15 (mechanical, near-zero risk).
2. PR 2 — items 4, 6, 7 (observability + headers, all behind env flags).
3. PR 3 — items 3, 9, 17 (auth + audit wrapper).
4. PR 4 — items 8, 10 (upload + AI label).
5. PR 5 — items 11, 12, 13, 16 (consent banner + legal pages + RLS test).

---

## 5. Operational baseline checklist (sign before launch)

- [ ] All P0 items shipped and verified.
- [ ] Sentry receiving events; alert rules wired to email/Slack.
- [ ] Mozilla Observatory ≥ A on `https://staging.offmap.com`.
- [ ] RLS regression script passes against real Supabase.
- [ ] CSP enforcing, zero violations in last 24h.
- [ ] Stripe webhook tested with replayed event — handler is idempotent.
- [ ] Cron secret set; calling without secret returns 401.
- [ ] Privacy Policy, Impressum, AGB published in DE.
- [ ] Cookie consent banner blocks analytics until accept.
- [ ] DPAs on file for all named processors.
- [ ] Incident response runbook + on-call contact saved in `docs/RUNBOOKS.md`.
- [ ] Backup + restore drill completed once successfully.
- [ ] Pen-test report received and findings triaged.
