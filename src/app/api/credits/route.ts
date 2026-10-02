import { NextRequest, NextResponse } from 'next/server'

/** GET /api/credits — return current balance */
export async function GET(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
    return NextResponse.json({ success: true, data: { balance: mockDb.getCreditsBalance(user.id) } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { db } = await import('@/lib/db')
  const { users } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const [row] = await db.select({ creditsBalance: users.creditsBalance }).from(users).where(eq(users.id, user.id)).limit(1)
  return NextResponse.json({ success: true, data: { balance: row?.creditsBalance ?? 0 } })
}
