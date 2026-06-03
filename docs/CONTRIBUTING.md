# Offmap — Contributing Guide

Everything you need to understand the codebase and add features safely.

---

## Table of contents

1. [Local setup](#1-local-setup)
2. [Code conventions](#2-code-conventions)
3. [Mock mode patterns](#3-mock-mode-patterns)
4. [Adding a new API route](#4-adding-a-new-api-route)
5. [Adding a new database table](#5-adding-a-new-database-table)
6. [Adding a new email template](#6-adding-a-new-email-template)
7. [Adding a Stripe event handler](#7-adding-a-stripe-event-handler)
8. [Input validation](#8-input-validation)
9. [Auth patterns](#9-auth-patterns)
10. [Error handling](#10-error-handling)
11. [TypeScript conventions](#11-typescript-conventions)
12. [What not to do](#12-what-not-to-do)

---

## 1. Local setup

```bash
git clone https://github.com/your-org/offmap
cd offmap
npm install
npm run dev
```

The app starts in mock mode by default. No external accounts needed.

```bash
# Check types
npm run typecheck

# Lint
npm run lint

# Build (also type-checks)
npm run build
```

---

## 2. Code conventions

### File structure

- API route handlers live at `src/app/api/<resource>/route.ts`
- Business logic belongs in service files at `src/lib/<service>/` — never inline complex logic in a route handler
- All DB table definitions live in `src/lib/db/schema.ts` — one file, all tables
- All Zod validators live in `src/lib/validators/index.ts`
- Shared TypeScript types live in `src/types/index.ts`

### Naming

- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions and variables: `camelCase`
- DB table names: `snake_case` (Drizzle convention)
- Env vars: `SCREAMING_SNAKE_CASE`

### Imports

Use the `@/` alias for all internal imports:
```ts
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import type { SessionUser } from '@/types'
```

Never use relative `../../` paths that traverse more than one level.

### Lazy imports in route handlers

External service imports (Drizzle, Supabase, Stripe, Resend) are done **inside** the branch that uses them, not at the top of the file. This prevents import errors in mock mode when the real env vars aren't present.

```ts
// ✓ Correct
if (IS_MOCK) {
  const { mockDb } = await import('@/lib/mock/db')
  // ...
} else {
  const { db } = await import('@/lib/db')
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  // ...
}

// ✗ Wrong — will throw in mock mode if env vars aren't set
import { db } from '@/lib/db'
import { createSupabaseServerClient } from '@/lib/supabase/server'
```

---

## 3. Mock mode patterns

Every route that touches data needs a mock implementation.

### The IS_MOCK constant

```ts
import { IS_MOCK } from '@/lib/mock'
// IS_MOCK = process.env.MOCK_MODE === 'true'
```

### The in-memory database

`src/lib/mock/db.ts` exports `mockDb` — a class wrapping JavaScript `Map` objects.

```ts
const { mockDb } = await import('@/lib/mock/db')

// Read
const hosts = mockDb.searchHosts({ cityId, page, limit })

// Write
const user = mockDb.createUser({ id, email, role, fullName })

// Check session
const user = mockGetUser(cookieToken)
```

### Adding a mock implementation

When you add a new API route, add the mock branch first:

```ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = mySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  if (IS_MOCK) {
    // Simple in-memory version — just enough to make the UI work
    const token = request.cookies.get('offmap_mock_session')?.value
    const { mockGetUser } = await import('@/lib/mock/auth')
    const user = mockGetUser(token)
    if (!user) return unauthorizedError()

    // Use mockDb or return hardcoded data
    return NextResponse.json({ success: true, data: { ... } }, { status: 201 })
  }

  // Real implementation below
  // ...
}
```

### Adding to mockDb

If your feature needs to persist data across requests in mock mode, add a new `Map` to `src/lib/mock/db.ts`:

```ts
// In MockDatabase class
private myThings = new Map<string, MyThing>()

createMyThing(data: MyThing): MyThing {
  this.myThings.set(data.id, data)
  return data
}

getMyThing(id: string): MyThing | undefined {
  return this.myThings.get(id)
}
```

---

## 4. Adding a new API route

Full example: adding `POST /api/reports` (report a user).

### Step 1 — Add the Zod validator

`src/lib/validators/index.ts`:
```ts
export const createReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.enum(['inappropriate_content', 'fake_profile', 'harassment', 'spam', 'other']),
  description: z.string().max(1000).optional(),
})

export type CreateReportInput = z.infer<typeof createReportSchema>
```

### Step 2 — Create the route file

`src/app/api/reports/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { IS_MOCK } from '@/lib/mock'
import { createReportSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = createReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', fields: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    )
  }

  if (IS_MOCK) {
    // Mock: just return success — reports are a moderation feature
    const token = request.cookies.get('offmap_mock_session')?.value
    const { mockGetUser } = await import('@/lib/mock/auth')
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
    return NextResponse.json({ success: true, data: { reportId: `report-mock-${Date.now()}` } }, { status: 201 })
  }

  // Production
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { db } = await import('@/lib/db')
  const { reports } = await import('@/lib/db/schema')

  const [report] = await db.insert(reports).values({
    reporterId: user.id,
    reportedUserId: parsed.data.reportedUserId,
    reason: parsed.data.reason,
    description: parsed.data.description,
  }).returning()

  return NextResponse.json({ success: true, data: { reportId: report.id } }, { status: 201 })
}
```

### Step 3 — Document it in docs/API.md

Add the endpoint to the API reference with request/response examples.

---

## 5. Adding a new database table

Full example: adding a `notifications` table.

### Step 1 — Define the table in schema.ts

`src/lib/db/schema.ts`:
```ts
export const notificationTypeEnum = pgEnum('notification_type', ['message', 'review', 'trip_response'])

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    isRead: boolean('is_read').default(false).notNull(),
    // Nullable first — zero-downtime rule
    relatedId: uuid('related_id'),
    ...timestamps,
  },
  (t) => ({
    userIdx: index('notifications_user_idx').on(t.userId),
    unreadIdx: index('notifications_unread_idx').on(t.userId, t.isRead),
  })
)

// Add type exports
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
```

### Step 2 — Generate and review the migration

```bash
npm run db:generate
```

Check the generated file in `drizzle/migrations/`. Make sure it looks right before applying.

### Step 3 — Apply the migration

```bash
npm run db:migrate
```

### Step 4 — Add an RLS policy

The generated migration file should include RLS. If not, add it manually to the migration SQL:

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

### Step 5 — Add relations (optional)

```ts
// In usersRelations:
notifications: many(notifications),
```

### Migration rules (must follow)

- New columns must be **nullable on creation**. Add `NOT NULL` only after backfilling existing rows.
- Never rename columns — add new, backfill, drop old.
- Never create indexes without `CONCURRENTLY` on large tables.
- Never edit the Supabase schema dashboard manually.

---

## 6. Adding a new email template

`src/lib/email/index.ts`:

```ts
export async function sendNotificationEmail({
  to,
  name,
  message,
}: {
  to: string
  name: string
  message: string
}) {
  const content = `
    <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;">You have a new notification</h1>
    <p style="font-size:15px;line-height:1.75;margin-bottom:24px;color:#3D3428;">
      Hi ${name}, ${message}
    </p>
    <a href="${APP_URL}/dashboard" style="display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;">
      View dashboard →
    </a>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'New notification from Offmap',
    html: baseLayout(content),
  })
}
```

Add the mock equivalent in `src/lib/mock/email.ts`:
```ts
export async function sendNotificationEmail({ to, name, message }: { to: string; name: string; message: string }) {
  console.log(`[MOCK EMAIL] Notification to ${to}: ${message}`)
}
```

**Email rules:**
- Always wrap the send call in try/catch — a failing email must never crash an API route
- Always fire emails as fire-and-forget in the request path: `.catch(console.error)`
- Never log the recipient's email in the catch block
- Only send marketing emails if `user.marketingConsent = true`

---

## 7. Adding a Stripe event handler

In `src/app/api/webhooks/stripe/route.ts`, add a new `case` inside the `switch`:

```ts
case 'customer.subscription.paused': {
  const sub = event.data.object as Stripe.Subscription
  const userId = sub.metadata?.userId
  if (!userId) break

  await db
    .update(subscriptions)
    .set({ status: 'past_due', updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))

  break
}
```

Rules for webhook handlers:
- Always verify the signature **before** the switch — never process unverified events
- Use `break` not `return` inside `case` blocks — the outer function returns `200` after the switch
- Handle duplicates safely — Stripe can deliver the same event more than once. Use Drizzle upserts or check-before-insert.
- Log the event type and ID at the start of each case for debugging
- Return `500` on processing errors so Stripe retries — return `200` only when handled successfully

---

## 8. Input validation

All API inputs are validated with Zod before any business logic runs.

### Pattern

```ts
const parsed = mySchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        fields: parsed.error.flatten().fieldErrors,
      },
    },
    { status: 422 }
  )
}
// parsed.data is now fully typed and safe to use
```

### Validators live in one place

All schemas go in `src/lib/validators/index.ts`. Export both the schema and the inferred type:

```ts
export const mySchema = z.object({ ... })
export type MyInput = z.infer<typeof mySchema>
```

### Query param validation

For GET routes with query params, coerce types:
```ts
const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
const params = Object.fromEntries(new URL(request.url).searchParams)
const parsed = schema.safeParse(params)
```

---

## 9. Auth patterns

### Getting the current user (production)

```ts
const { createSupabaseServerClient } = await import('@/lib/supabase/server')
const supabase = createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json(
  { success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } },
  { status: 401 }
)
// user.id is now the authenticated user's UUID
```

### Getting the current user (mock)

```ts
const token = request.cookies.get('offmap_mock_session')?.value
const { mockGetUser } = await import('@/lib/mock/auth')
const user = mockGetUser(token)
if (!user) return NextResponse.json(
  { success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } },
  { status: 401 }
)
```

### Admin operations

When you need to bypass RLS (e.g. in a webhook handler or admin operation):
```ts
const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
const adminClient = createSupabaseAdminClient()
```

Never use `createSupabaseAdminClient()` in a route that is accessible to regular users. It bypasses all Row Level Security.

### Protected pages (client-side)

Use the `useUser()` hook:
```ts
const { user, loading, logout } = useUser()
if (loading) return <Spinner />
if (!user) redirect('/auth/login')
```

---

## 10. Error handling

### Standard error responses

```ts
// 401 Unauthorized
return NextResponse.json(
  { success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } },
  { status: 401 }
)

// 403 Forbidden
return NextResponse.json(
  { success: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } },
  { status: 403 }
)

// 403 Subscription required
return NextResponse.json(
  { success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Subscribe from €6/day to connect with hosts.' } },
  { status: 403 }
)

// 404 Not found
return NextResponse.json(
  { success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } },
  { status: 404 }
)

// 500 Internal error
return NextResponse.json(
  { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
  { status: 500 }
)
```

### Wrapping external calls

```ts
// ✓ Correct — external calls are always wrapped
try {
  await stripe.subscriptions.retrieve(id)
} catch (err) {
  console.error('[checkout] Stripe error:', err)
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Payment service unavailable' } },
    { status: 500 }
  )
}

// ✓ Fire-and-forget for non-critical operations (email, notifications)
sendWelcomeEmail(email, name, role).catch(console.error)
```

### What not to log

```ts
// ✗ Never log PII
console.log('User logged in:', user.email)
console.log('Processing payment for:', user.email, 'IP:', ip)

// ✓ Log identifiers, not PII
console.log('[auth] User logged in:', user.id)
console.log('[stripe] Processing webhook event:', event.id)
```

---

## 11. TypeScript conventions

### Always use strict types

The project uses `"strict": true` in `tsconfig.json`. No `any` unless absolutely necessary and clearly documented.

### DB row types

Use the inferred types from Drizzle — don't define manual interfaces for DB rows:
```ts
// ✓ Use inferred types
import type { User, HostProfile } from '@/lib/db/schema'

// ✗ Don't re-define manually
interface User { id: string; email: string; ... }
```

### API response types

```ts
import type { ApiSuccess, ApiError } from '@/types'

// Route handler return type
return NextResponse.json<ApiSuccess<{ conversationId: string }>>({
  success: true,
  data: { conversationId: newConv.id }
})
```

### Avoid `!` non-null assertions

```ts
// ✗ Risky
const name = user!.fullName!.toUpperCase()

// ✓ Handle nulls explicitly
const name = user?.fullName ?? 'there'
```

---

## 12. What not to do

These are hard rules derived from the architecture and GDPR requirements.

| Don't | Why |
|---|---|
| Call external APIs (Stripe, Resend) directly from components or pages | Breaks the layer separation; leaks secrets |
| Use `createSupabaseAdminClient()` in user-facing routes | Bypasses RLS — any bug becomes a data breach |
| Hard-delete conversations or messages | Legal audit trail requirement |
| Store monetary amounts as floats | Use cents (integers) only |
| Log email addresses, names, or IPs in plain text | GDPR — log IDs only |
| Rename DB columns | Zero-downtime rule — add new, backfill, drop old |
| Edit Supabase schema manually | Drizzle migration history gets out of sync |
| Write raw SQL | Use Drizzle ORM — parameterised queries only |
| Put `NEXT_PUBLIC_` prefix on a secret | Exposes it to the browser |
| Send marketing email without checking `marketingConsent` | GDPR violation |
| Store EU user data outside Frankfurt region | GDPR violation |
| Await email sends in the request path (unless absolutely necessary) | Makes response slow; email failure crashes the endpoint |
| Build features listed in "What never to build in Phase 0" | Check CLAUDE.md — no escrow, no ID verification, no native app, no multi-language |
