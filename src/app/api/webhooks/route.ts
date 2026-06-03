import { NextRequest, NextResponse } from 'next/server'
import { stripe, verifyWebhookSignature } from '@/lib/stripe'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { sendSubscriptionConfirmationEmail } from '@/lib/email'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // 1. Verify webhook signature — NEVER skip this
  let event: Stripe.Event
  try {
    event = verifyWebhookSignature(body, signature)
  } catch (err) {
    console.error('[Stripe Webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // 2. Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  if (!userId || !plan) {
    throw new Error('Missing userId or plan in checkout session metadata')
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  const periodStart = new Date(stripeSubscription.current_period_start * 1000)
  const periodEnd = new Date(stripeSubscription.current_period_end * 1000)

  await db.insert(subscriptions).values({
    userId,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId: stripeSubscription.customer as string,
    plan: plan as 'day' | 'week' | 'month' | 'annual',
    status: 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  })

  await sendSubscriptionConfirmationEmail({
    to: session.customer_email ?? '',
    name: session.customer_details?.name ?? 'Traveler',
    plan,
    expiresAt: periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  })

  console.log(`[Stripe Webhook] Subscription activated for user ${userId}`)
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      status: stripeSubscription.status === 'active' ? 'active' : 'past_due',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id))

  console.log(`[Stripe Webhook] Subscription ${stripeSubscription.id} cancelled`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  await db
    .update(subscriptions)
    .set({ status: 'past_due', updatedAt: new Date() })
    .where(eq(subscriptions.stripeCustomerId, invoice.customer as string))

  console.log(`[Stripe Webhook] Payment failed for customer ${invoice.customer}`)
}
