# Admin Panel — Architecture, Security & Scaling Plan

Internal tool for host moderation, dispute resolution, and platform oversight.
Not public-facing. URL: `/admin` — protected by IP allowlist + role check.

---

## Security model

The URL itself is not what makes the admin panel secure. Two independent layers
must both pass before anyone can see anything.

### Layer 1 — IP allowlist in middleware

Add to `src/middleware.ts`. Anyone not on the allowlist gets a **404** — not a
login page, not a 403, just "page not found." The panel is invisible to everyone
else on the internet.

```ts
const ADMIN_ALLOWED_IPS = (process.env.ADMIN_ALLOWED_IPS ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)

if (pathname.startsWith('/admin')) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
             ?? req.headers.get('x-real-ip')
             ?? ''
  if (!ADMIN_ALLOWED_IPS.includes(ip)) {
    return NextResponse.rewrite(new URL('/404', req.url))
  }
}
```

Set `ADMIN_ALLOWED_IPS=your.home.ip,your.office.ip` in Vercel environment
variables. Change them from the Vercel dashboard — no redeploy needed.

### Layer 2 — role check on every admin API route

Even if the IP check is bypassed, the DB role gate blocks access.
Returns 404 (not 403) so the attacker doesn't learn the route exists.

```ts
// src/lib/admin.ts
export async function requireAdmin() {
  const { cookies } = await import('next/headers')
  const token = cookies().get('offmap_mock_session')?.value
  const { mockGetUser } = await import('@/lib/mock/auth')
  const user = mockGetUser(token)
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Not found' } },
      { status: 404 }
    )
  }
  return null // null = passed, proceed
}
```

In production replace `mockGetUser` with `createSupabaseServerClient().auth.getUser()`
and check the `users` table for `role = 'admin'`.

### Set yourself as admin (one-time SQL in Supabase dashboard)

```sql
UPDATE users SET role = 'admin' WHERE email = 'kneelesh951@gmail.com';
```

No code change or deploy needed. The `admin` role is already defined in
`src/lib/db/schema.ts` as part of the `user_role` enum.

### Prevent search engine indexing

`src/app/admin/layout.tsx`:
```tsx
export const metadata = { robots: 'noindex, nofollow' }
```

`public/robots.txt`:
```
Disallow: /admin
```

### Security summary

| Layer | What it blocks |
|---|---|
| IP allowlist → 404 | Anyone not on your network sees nothing |
| `role: 'admin'` DB check | Access denied even if IP is bypassed |
| Returns 404 not 403 | Attacker doesn't know the route exists |
| `robots: noindex` + robots.txt | Not indexed by Google, not in sitemaps |
| Supabase RLS | DB blocks non-admin queries even if API is hit directly |

---

## Pages to build

```
/admin                    ← dashboard: pending hosts, open disputes, recent reports
/admin/hosts              ← list all hosts (filter: pending / approved / suspended)
/admin/hosts/[id]         ← review profile, approve / reject / suspend, add notes
/admin/reports            ← abuse reports queue (from "Report concern" button)
/admin/disputes           ← booking disputes awaiting resolution
/admin/users              ← search any user, view their bookings and subscription
```

### Approve/reject API

```ts
// PATCH /api/admin/hosts/[id]
// body: { action: 'approve' | 'suspend' | 'reject', note?: string }
```

Updates `moderation_status` on `host_profiles` and sends the host a status email.

---

## Host management — scaling phases

### Phase 0: 0–50 hosts (now)
Manage everything through the Supabase table editor.  
Every signup → `moderationStatus: 'pending'` → manually flip to `'approved'`.  
Takes ~5 minutes per host. You *want* to read every early bio and vet personally.  
**No tooling needed yet.**

### Phase 1: 50–500 hosts — build the admin panel
Supabase table editor becomes painful. Build `/admin` inside the existing
Next.js app. Estimated effort: 2–3 days.

Key features for this phase:
- Host review queue (pending → approve / reject with one click)
- Internal notes on each host (visible only to you)
- Abuse report inbox
- User search

### Phase 2: 500–5,000 hosts — add auto-scoring

Manual review of every host is a bottleneck. Add a profile completeness score
that auto-approves low-risk submissions:

| Signal | Points |
|---|---|
| Profile photo uploaded | +2 |
| Bio is 100+ words | +2 |
| Neighbourhood filled in | +1 |
| At least 3 categories selected | +1 |
| Social link provided | +2 |
| Email verified | +1 |

- Score ≥ 7 → **auto-approved** (sample audit weekly)
- Score 4–6 → **manual review queue**
- Score < 4 → **auto-rejected** with guidance email

Reduces manual review load by ~70%.

Also add **Stripe Identity** for optional host ID verification (€1–2 per host).
Changes legal position from "we do no vetting" to "we confirmed this person's
identity." Adds a Verified badge to their profile.

### Phase 3: 5,000+ hosts — automated quality management

At this scale you stop reading bios. Quality scoring runs continuously:

- Response rate (calculated from bookings DB)
- Bayesian review average (penalises hosts with only 2–3 reviews)
- Profile completeness
- Activity recency (last login < 90 days or auto-deprioritised)

Low-scoring hosts are demoted in search automatically.
Flagged hosts are auto-emailed.
You only intervene for disputes and permanent bans.

This uses the same scoring logic as the hero carousel ranking — see CLAUDE.md.

---

## Do you need a CMS?

**For host management: No.** The admin panel is internal CRUD over your own
Postgres tables. A CMS adds a layer you don't need.

A CMS only makes sense for **editorial content** — blog posts, city guides,
press releases — and only when someone is writing that content regularly.

| Content type | CMS needed? | Recommendation |
|---|---|---|
| Host profiles | ❌ | DB-driven, hosts manage their own |
| City pages | ❌ | Static + DB data, updated by seed script |
| Blog / city guides | ✅ | Yes — when you hire a content writer |
| FAQ / legal pages | ❌ | Edit the TSX file directly |
| Press releases | ✅ | Yes — if publishing 2+ articles/week |

**If you ever need a CMS:** use **Sanity** (free tier, TypeScript-native,
Next.js integration is first-class) or **Contentlayer** (MDX files in git,
zero external dependency). Both take ~1 day to integrate.

---

## Build order

| Milestone | Action | Effort |
|---|---|---|
| Now | Manual Supabase table editor | 0 |
| 50 hosts | Build `/admin` panel in Next.js | 2–3 days |
| 500 hosts | Auto-scoring + fast-track approval | 1 week |
| 1,000 hosts | Stripe Identity for ID verification | 2 days |
| 5,000 hosts | Fully automated quality scoring | 1 week |
| Content growth | Add Sanity CMS for blog/city guides | 1 day |
