import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ pack: z.enum(['10', '25']) })

const PACK_CREDITS: Record<string, number> = { '10': 10, '25': 30 }
const PACK_PRICE_CENTS: Record<string, number> = { '10': 1000, '25': 2500 }

/** POST /api/credits/checkout — create checkout session for a credit pack */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Pack must be "10" or "25"' } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockCreateCreditCheckout } = await import('@/lib/mock/stripe')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
    const checkoutUrl = mockCreateCreditCheckout(user.id, parsed.data.pack)
    return NextResponse.json({ success: true, data: { checkoutUrl } })
  }

  // Production — Stripe one-time payment
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { stripe, getOrCreateStripeCustomer } = await import('@/lib/stripe')
  const { db } = await import('@/lib/db')
  const { subscriptions } = await import('@/lib/db/schema')
  const { eq, desc } = await import('drizzle-orm')

  const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1)
  const stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email!, existingSub?.stripeCustomerId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const pack = parsed.data.pack
  const credits = PACK_CREDITS[pack]
  const amountCents = PACK_PRICE_CENTS[pack]

  const priceId = pack === '10'
    ? process.env.STRIPE_CREDIT_10_PRICE_ID!
    : process.env.STRIPE_CREDIT_25_PRICE_ID!

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?credits=success`,
    cancel_url: `${appUrl}/dashboard`,
    metadata: { type: 'credits', userId: user.id, credits: String(credits), amountCents: String(amountCents) },
  })

  return NextResponse.json({ success: true, data: { checkoutUrl: session.url } })
}
