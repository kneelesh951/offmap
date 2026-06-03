/**
 * Stripe client + subscription helpers
 */
import Stripe from 'stripe'

// Singleton pattern — one Stripe instance for the whole app
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

// Map our plan names to Stripe Price IDs
// These Price IDs are created once in the Stripe dashboard
export const STRIPE_PRICES: Record<string, string> = {
  day:    process.env.STRIPE_PRICE_DAY!,
  week:   process.env.STRIPE_PRICE_WEEK!,
  month:  process.env.STRIPE_PRICE_MONTH!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
}

// Plan display info for UI
export const PLAN_INFO = {
  day: {
    name: 'Day Pass',
    description: '24hr unlimited connections',
    price: '€6',
    period: 'day',
    badge: null,
  },
  week: {
    name: 'Weekly',
    description: '7 days unlimited',
    price: '€12',
    period: 'week',
    badge: null,
  },
  month: {
    name: 'Monthly',
    description: '30 days unlimited',
    price: '€18',
    period: 'month',
    badge: null,
  },
  annual: {
    name: 'Annual',
    description: '365 days — €4/month effectively',
    price: '€49',
    period: 'year',
    badge: 'Best value',
  },
} as const

export type Plan = keyof typeof PLAN_INFO

/**
 * Create or retrieve a Stripe customer for a user.
 * Idempotent — safe to call multiple times.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { offmapUserId: userId },
  })

  return customer.id
}

/**
 * Create a Stripe Checkout session.
 * The traveler is redirected to this URL to complete payment.
 */
export async function createCheckoutSession({
  stripeCustomerId,
  priceId,
  userId,
  plan,
  successUrl,
  cancelUrl,
}: {
  stripeCustomerId: string
  priceId: string
  userId: string
  plan: Plan
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
    // German law: show cancellation terms
    consent_collection: { terms_of_service: 'required' },
    // Allow EU payment methods
    payment_method_options: {
      card: { request_three_d_secure: 'automatic' },
    },
    locale: 'auto',
  })

  if (!session.url) throw new Error('Failed to create checkout session')
  return session.url
}

/**
 * Create a Stripe Customer Portal session.
 * Lets users manage their subscription (upgrade, cancel, download invoices).
 * Required by German Widerrufsrecht — users must be able to cancel easily.
 */
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })
  return session.url
}

/**
 * Verify a Stripe webhook signature.
 * ALWAYS verify — never process unverified webhook payloads.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
