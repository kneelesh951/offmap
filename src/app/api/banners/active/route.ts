import { NextRequest, NextResponse } from 'next/server'
import { getActiveBanners, type BannerData } from '@/lib/banners'

export async function GET(request: NextRequest) {
  // Resolve the current user context so we can filter banners by target.
  let userRole: string | null = null
  let hasActiveSub = false

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (user) {
      userRole = user.role
      const { mockDb } = await import('@/lib/mock/db')
      hasActiveSub = !!mockDb.getActiveSubscription(user.id)
    }
  } else {
    try {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server')
      const supabase = await createSupabaseServerClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { db } = await import('@/lib/db')
        const { users, subscriptions } = await import('@/lib/db/schema')
        const { eq, and } = await import('drizzle-orm')
        const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, authUser.id)).limit(1)
        userRole = dbUser?.role ?? null
        const now = new Date()
        const [sub] = await db.select({ id: subscriptions.id }).from(subscriptions)
          .where(and(eq(subscriptions.userId, authUser.id), eq(subscriptions.status, 'active')))
          .limit(1)
        hasActiveSub = !!sub
      }
    } catch { /* fail open — show 'all' banners if auth check errors */ }
  }

  const all = await getActiveBanners()

  const matching = all.filter((b: BannerData) => {
    if (b.target === 'all') return true
    if (!userRole) return b.target === 'unsubscribed'
    if (b.target === 'travelers')    return userRole === 'traveler'
    if (b.target === 'hosts')        return userRole === 'host'
    if (b.target === 'subscribed')   return hasActiveSub
    if (b.target === 'unsubscribed') return !hasActiveSub
    return false
  })

  // Return the highest-priority match (already sorted by priority desc)
  return NextResponse.json({ success: true, data: matching[0] ?? null })
}
