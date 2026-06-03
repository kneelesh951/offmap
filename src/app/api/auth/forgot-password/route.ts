import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid email required.' } }, { status: 422 })
  }

  const { email } = parsed.data

  // ── Mock mode ────────────────────────────────────────────────────────────
  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const user = mockDb.getUserByEmail(email)
    // Always return success to prevent email enumeration
    if (user) {
      console.log(`[Mock] Password reset link: http://localhost:3000/auth/reset-password?token=mock-reset-token-${user.id}`)
    }
    return NextResponse.json({ success: true, data: { message: 'If that email exists, a reset link has been sent.' } })
  }

  // ── Production — Supabase ─────────────────────────────────────────────────
  try {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) {
      console.error('[ForgotPassword] Supabase error:', error.message)
      // Still return success to prevent email enumeration
    }
  } catch (err) {
    console.error('[ForgotPassword] Unexpected error:', (err as Error).message)
  }

  // Always return success — never confirm if email exists (security best practice)
  return NextResponse.json({ success: true, data: { message: 'If that email exists, a reset link has been sent.' } })
}
