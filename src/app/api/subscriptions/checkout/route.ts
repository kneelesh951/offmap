import { NextRequest, NextResponse } from 'next/server'
import { createSubscriptionSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = createSubscriptionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid plan' } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockCreateCheckoutSession } = await import('@/lib/mock/stripe')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
    const checkoutUrl = mockCreateCheckoutSession(user.id, parsed.data.plan)
    return NextResponse.json({ success: true, data: { checkoutUrl } })
  }

  // Production Stripe
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
  const { STRIPE_PRICES, getOrCreateStripeCustomer, createCheckoutSession } = await import('@/lib/stripe')
  const { db } = await import('@/lib/db')
  const { subscriptions } = await import('@/lib/db/schema')
  const { eq, desc } = await import('drizzle-orm')
  const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1)
  const stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email!, existingSub?.stripeCustomerId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const checkoutUrl = await createCheckoutSession({ stripeCustomerId, priceId: STRIPE_PRICES[parsed.data.plan], userId: user.id, plan: parsed.data.plan, successUrl: `${appUrl}/dashboard?subscription=success`, cancelUrl: `${appUrl}/pricing` })
  return NextResponse.json({ success: true, data: { checkoutUrl } })
}
