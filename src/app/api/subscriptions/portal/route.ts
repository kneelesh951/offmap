import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const sub = Array.from(mockDb.subscriptions.values()).find(s => s.userId === user.id)
    if (!sub) return NextResponse.json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found' } }, { status: 404 })

    // In mock mode return a fake portal URL that renders a mock management page
    const portalUrl = `/mock/subscription-portal?userId=${user.id}`
    return NextResponse.json({ success: true, data: { portalUrl } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { subscriptions } = await import('@/lib/db/schema')
  const { createPortalSession } = await import('@/lib/stripe')
  const { eq, desc } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1)
  if (!sub?.stripeCustomerId) return NextResponse.json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found' } }, { status: 404 })

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
  const portalUrl = await createPortalSession(sub.stripeCustomerId, returnUrl)
  return NextResponse.json({ success: true, data: { portalUrl } })
}
