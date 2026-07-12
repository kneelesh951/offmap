import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  // Default role to 'traveler' if omitted (legacy clients)
  const withDefaults = body && typeof body === 'object' ? { role: 'traveler', ...body } : body
  const parsed = registerSchema.safeParse(withDefaults)
  if (!parsed.success) {
    const firstIssue = parsed.error.errors[0]
    const code = firstIssue?.path?.[0] === 'gdprConsent' ? 'GDPR_REQUIRED' : 'VALIDATION_ERROR'
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message: firstIssue?.message ?? 'Please check your details and try again.',
        },
      },
      { status: 422 }
    )
  }
  const { email, password, fullName, role } = parsed.data

  // ── Mock mode ────────────────────────────────────────────────────────────
  if (process.env.MOCK_MODE === 'true') {
    const { mockSignUp } = await import('@/lib/mock/auth')
    const { mockEmail } = await import('@/lib/mock/email')

    const result = mockSignUp(email, password, fullName, role as 'traveler' | 'host')
    if (result.error) {
      return NextResponse.json({ success: false, error: { code: 'EMAIL_TAKEN', message: result.error } }, { status: 409 })
    }

    mockEmail.sendWelcome(email, fullName, role)

    const res = NextResponse.json({ success: true, data: { user: result.user } }, { status: 201 })
    res.cookies.set('offmap_mock_session', result.token!, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
    })
    return res
  }

  // ── Production — Supabase + Drizzle ───────────────────────────────────────
  const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { users } = await import('@/lib/db/schema')
  const { sendWelcomeEmail } = await import('@/lib/email')

  const supabase = createSupabaseAdminClient()

  // 1. Create Supabase auth user (email_confirm: true = auto-confirm, no verification email sent)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (authError || !authData.user) {
    const msg = authError?.message?.includes('already registered')
      ? 'An account with this email already exists.'
      : authError?.message ?? 'Registration failed.'
    return NextResponse.json({ success: false, error: { code: 'REGISTRATION_FAILED', message: msg } }, { status: 400 })
  }

  // 2. Create user record in Postgres via Drizzle
  try {
    await db.insert(users).values({
      id: authData.user.id,
      email,
      role: role as 'traveler' | 'host',
      fullName,
      gdprConsentAt: new Date(),
    })
  } catch {
    // User record might already exist from a previous attempt — not fatal
  }

  // 3. Send welcome email (non-blocking)
  sendWelcomeEmail(email, fullName, role).catch(console.error)

  return NextResponse.json({ success: true, data: { emailVerificationRequired: true } }, { status: 201 })
}
