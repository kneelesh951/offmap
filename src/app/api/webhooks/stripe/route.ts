/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events.
 * This is the most critical API route — if it breaks, nobody gets access.
 *
 * Events handled:
 *   checkout.session.completed      → create subscription record, send confirmation email
 *   customer.subscription.updated   → sync plan/status changes
 *   customer.subscription.deleted   → mark as cancelled
 *   invoice.payment_failed          → mark as past_due, notify user
 */
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { subscriptions, users } from '@/lib/db/schema'
import { stripe, verifyWebhookSignature } from '@/lib/stripe'
import { sendSubscriptionConfirmationEmail, sendPaymentFailedEmail, sendSubscriptionCancelledEmail } from '@/lib/email'
import { logRevenueEvent } from '@/lib/revenue/log'
import { eq } from 'drizzle-orm'
import { format } from 'date-fns'
import type Stripe from 'stripe'

// Stripe requires the raw body for signature verification — Next.js App Router reads body as text by default
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // ─── Verify signature ──────────────────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = verifyWebhookSignature(body, signature)
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ─── Idempotency check ─────────────────────────────────────────────────────
  // Stripe can deliver the same event multiple times — we must handle duplicates
  // In Phase 1 add Redis-based deduplication. For now, Drizzle upserts handle it.
  console.log(`[Stripe webhook] Processing event: ${event.type} (${event.id})`)

  try {
    switch (event.type) {

      // ─── New subscription created via Checkout ─────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        const plan = session.metadata?.plan as 'day' | 'week' | 'month' | 'annual'
        const stripeSubscriptionId = session.subscription as string
        const stripeCustomerId = session.customer as string

        if (!userId || !plan || !stripeSubscriptionId) {
          console.error('[Stripe webhook] Missing metadata on session:', session.id)
          break
        }

        // Fetch the subscription details from Stripe
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)

        // Upsert subscription record
        await db
          .insert(subscriptions)
          .values({
            userId,
            stripeCustomerId,
            stripeSubscriptionId,
            plan,
            status: 'active',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            amountCents: sub.items.data[0]?.price.unit_amount ?? null,
            currency: sub.currency,
          })
          .onConflictDoUpdate({
            target: [subscriptions.stripeSubscriptionId],
            set: {
              status: 'active',
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              updatedAt: new Date(),
            },
          })

        // Log revenue event — first charge of a new subscription
        const amountCents = sub.items.data[0]?.price.unit_amount ?? 0
        if (amountCents > 0) {
          await logRevenueEvent({
            type: 'subscription_charge',
            userId,
            subscriptionId: null, // our internal sub UUID — filled in via metadata below if we have it
            stripeEventId: event.id,
            amountCents,
            currency: sub.currency.toUpperCase(),
            occurredAt: new Date(event.created * 1000),
            metadata: { plan, stripeSubscriptionId, source: 'checkout.session.completed' },
          })
        }

        // Send confirmation email
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
        if (user?.email) {
          const expiresAt = format(new Date(sub.current_period_end * 1000), 'MMMM d, yyyy')
          await sendSubscriptionConfirmationEmail({
            to: user.email,
            name: user.fullName ?? 'there',
            plan: plan.charAt(0).toUpperCase() + plan.slice(1),
            expiresAt,
          })
        }

        break
      }

      // ─── Renewal payment succeeded ─────────────────────────────────────────
      // Fires for every recurring charge after the first. The first charge is
      // captured by checkout.session.completed; this handles month-2, month-3, etc.
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubscriptionId = invoice.subscription as string | null
        if (!stripeSubscriptionId) break
        // Skip the very first invoice — already logged by checkout.session.completed
        if (invoice.billing_reason === 'subscription_create') break

        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        const userId = sub.metadata?.userId
        const plan = sub.metadata?.plan
        if (!userId) break

        await logRevenueEvent({
          type: 'subscription_charge',
          userId,
          stripeEventId: event.id,
          amountCents: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          occurredAt: new Date(event.created * 1000),
          metadata: { plan, stripeSubscriptionId, billingReason: invoice.billing_reason, source: 'invoice.payment_succeeded' },
        })

        break
      }

      // ─── Subscription updated (plan change, renewal, etc.) ─────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        await db
          .update(subscriptions)
          .set({
            status: sub.status as any,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id))

        break
      }

      // ─── Subscription cancelled ────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription

        await db
          .update(subscriptions)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id))

        // Send cancellation email
        const userId = sub.metadata?.userId
        if (userId) {
          const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
          if (user?.email) {
            const accessUntil = format(new Date(sub.current_period_end * 1000), 'MMMM d, yyyy')
            sendSubscriptionCancelledEmail({
              to: user.email,
              name: user.fullName ?? 'there',
              accessUntil,
            }).catch(console.error)
          }
        }

        break
      }

      // ─── Payment failed ────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubscriptionId = invoice.subscription as string
        if (!stripeSubscriptionId) break

        await db
          .update(subscriptions)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

        // Send payment failed email
        const [subRecord] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1)
        if (subRecord) {
          const [failedUser] = await db.select().from(users).where(eq(users.id, subRecord.userId)).limit(1)
          if (failedUser?.email) {
            sendPaymentFailedEmail({
              to: failedUser.email,
              name: failedUser.fullName ?? 'there',
              plan: (subRecord.plan ?? 'your').charAt(0).toUpperCase() + (subRecord.plan ?? 'your').slice(1),
            }).catch(console.error)
          }
        }
        break
      }

      default:
        // Ignore unhandled events
        break
    }
  } catch (err) {
    console.error(`[Stripe webhook] Error processing ${event.type}:`, err)
    // Return 500 — Stripe will retry the webhook
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
