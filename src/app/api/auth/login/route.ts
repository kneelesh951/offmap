import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Email and password are required.',
        },
      },
      { status: 422 }
    )
  }
  const { email, password } = parsed.data

  // ── Mock mode ────────────────────────────────────────────────────────────
  if (process.env.MOCK_MODE === 'true') {
    const { mockSignIn } = await import('@/lib/mock/auth')
    const result = mockSignIn(email, password)
    if (result.error) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: result.error } }, { status: 401 })
    }
    const res = NextResponse.json({ success: true, data: { user: result.user } })
    res.cookies.set('offmap_mock_session', result.token!, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
    })
    return res
  }

  // ── Production — Supabase ─────────────────────────────────────────────────
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }, { status: 401 })
  }

  // Fetch role from users table so the client can redirect correctly
  let role = 'traveler'
  try {
    const { db } = await import('@/lib/db')
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, data.user.id)).limit(1)
    if (u?.role) role = u.role
  } catch { /* fail open — default to traveler */ }

  return NextResponse.json({ success: true, data: { user: { id: data.user.id, email: data.user.email, role } } })
}
