/**
 * Mock Stripe — replaces real Stripe in local dev.
 * "Checkout" instantly activates subscription without any real payment.
 * "Portal" shows a simple manage page.
 */
import { mockDb } from './db'
import { nanoid } from 'nanoid'

const PLAN_DURATIONS: Record<string, number> = {
  day:    1,
  week:   7,
  month:  30,
  annual: 365,
}

export function mockCreateCheckoutSession(userId: string, plan: string): string {
  // Return a URL that our mock checkout handler processes
  const token = nanoid(16)
  // Store pending checkout in sessions temporarily
  mockDb.sessions.set(`checkout:${token}`, `${userId}:${plan}`)
  return `/api/mock/checkout?token=${token}`
}

export function mockCompleteCheckout(token: string): { success: boolean; conversationId?: string } {
  const val = mockDb.sessions.get(`checkout:${token}`)
  if (!val) return { success: false }

  mockDb.sessions.delete(`checkout:${token}`)
  const [userId, plan] = val.split(':')

  // Cancel any existing subscription
  Array.from(mockDb.subscriptions.values())
    .filter(s => s.userId === userId && s.status === 'active')
    .forEach(s => { s.status = 'cancelled' })

  const days = PLAN_DURATIONS[plan] ?? 1
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)

  const sub = {
    id: `sub-${nanoid(8)}`,
    userId,
    stripeCustomerId: `cus_mock_${userId}`,
    stripeSubscriptionId: `sub_mock_${nanoid(8)}`,
    plan: plan as 'day' | 'week' | 'month' | 'annual',
    status: 'active' as const,
    currentPeriodEnd: expiry.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
  }
  mockDb.subscriptions.set(sub.id, sub)

  console.log(`[MOCK STRIPE] ✅ Subscription activated: ${plan} for user ${userId} — expires ${expiry.toLocaleDateString()}`)
  return { success: true }
}

export function mockGetPortalUrl(userId: string): string {
  return `/dashboard/subscription?mock=true`
}

const CREDIT_PACK_AMOUNTS: Record<string, number> = {
  '10': 10,
  '25': 30,
}

export function mockCreateCreditCheckout(userId: string, pack: '10' | '25'): string {
  const token = nanoid(16)
  mockDb.sessions.set(`credits:${token}`, `${userId}:${pack}`)
  return `/api/mock/checkout?credits=${token}`
}

export function mockCompleteCreditCheckout(token: string): { success: boolean; newBalance?: number } {
  const val = mockDb.sessions.get(`credits:${token}`)
  if (!val) return { success: false }
  mockDb.sessions.delete(`credits:${token}`)
  const [userId, pack] = val.split(':')
  const amount = CREDIT_PACK_AMOUNTS[pack]
  if (!amount) return { success: false }
  const newBalance = mockDb.addCredits(userId, amount)
  console.log(`[MOCK STRIPE] ✅ Credits added: ${amount} credits for user ${userId} — new balance: ${newBalance}`)
  return { success: true, newBalance }
}
