import { db } from '@/lib/db'
import { revenueEvents, type NewRevenueEvent } from '@/lib/db/schema'

// Idempotent insert into revenue_events. If the same stripe_event_id arrives
// twice (Stripe webhook retry), the second insert is silently dropped.
// See docs/ADMIN_DASHBOARD_PLAN.md.
export async function logRevenueEvent(event: NewRevenueEvent): Promise<void> {
  await db
    .insert(revenueEvents)
    .values(event)
    .onConflictDoNothing({ target: revenueEvents.stripeEventId })
}
