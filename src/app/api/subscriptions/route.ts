import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: true, data: { isActive: false, plan: null, expiresAt: null } })
    const sub = mockDb.getActiveSubscription(user.id)
    return NextResponse.json({ success: true, data: { isActive: !!sub, plan: sub?.plan ?? null, expiresAt: sub?.currentPeriodEnd ?? null, stripeCustomerId: sub?.stripeCustomerId ?? null } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { subscriptions } = await import('@/lib/db/schema')
  const { eq, and, gte, desc } = await import('drizzle-orm')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: true, data: { isActive: false, plan: null, expiresAt: null, stripeCustomerId: null } })
  const [sub] = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active'), gte(subscriptions.currentPeriodEnd, new Date()))).orderBy(desc(subscriptions.createdAt)).limit(1)
  return NextResponse.json({ success: true, data: { isActive: !!sub, plan: sub?.plan ?? null, expiresAt: sub?.currentPeriodEnd?.toISOString() ?? null, stripeCustomerId: sub?.stripeCustomerId ?? null } })
}
