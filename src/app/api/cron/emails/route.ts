/**
 * GET /api/cron/emails
 *
 * Scheduled email jobs — call this endpoint via Vercel Cron or external cron service.
 * Runs three jobs:
 *   1. 24-hour session reminders (accepted bookings with session_date tomorrow)
 *   2. Post-session review requests (completed sessions 2h+ ago, no review yet)
 *   3. Subscription expiring warnings (3 days before current_period_end)
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 *
 * Vercel cron config in vercel.json:
 * { "crons": [{ "path": "/api/cron/emails", "schedule": "0 * * * *" }] }
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    sessionReminders: 0,
    reviewRequests: 0,
    expiringWarnings: 0,
    errors: [] as string[],
  }

  // ── Mock mode ────────────────────────────────────────────────────────────
  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const { mockEmail } = await import('@/lib/mock/email')

    const now = new Date()

    // 1. Session reminders — bookings accepted, session_date is within 24-28h
    for (const booking of Array.from(mockDb.bookings.values())) {
      if (booking.status !== 'accepted' || !booking.sessionDate) continue
      const sessionTime = new Date(booking.sessionDate).getTime()
      const hoursUntil = (sessionTime - now.getTime()) / (1000 * 60 * 60)
      if (hoursUntil >= 20 && hoursUntil <= 28) {
        const traveler = mockDb.getUserById(booking.travelerId)
        const host = mockDb.getUserById(booking.hostId)
        if (traveler && host) {
          mockEmail.sendSessionReminder(traveler.email, traveler.fullName, host.fullName, booking.sessionDate)
          mockEmail.sendSessionReminder(host.email, host.fullName, traveler.fullName, booking.sessionDate)
          results.sessionReminders += 2
        }
      }
    }

    // 2. Review requests — bookings completed, session was 2-6h ago
    for (const booking of Array.from(mockDb.bookings.values())) {
      if (booking.status !== 'completed' || !booking.sessionDate) continue
      const sessionTime = new Date(booking.sessionDate).getTime()
      const hoursAgo = (now.getTime() - sessionTime) / (1000 * 60 * 60)
      if (hoursAgo >= 2 && hoursAgo <= 6) {
        const traveler = mockDb.getUserById(booking.travelerId)
        const host = mockDb.getUserById(booking.hostId)
        if (traveler && host) {
          mockEmail.sendReviewRequest(traveler.email, traveler.fullName, host.fullName)
          mockEmail.sendReviewRequest(host.email, host.fullName, traveler.fullName)
          results.reviewRequests += 2
        }
      }
    }

    // 3. Subscription expiring — expires in 2-4 days (catch in the 3-day window)
    for (const sub of Array.from(mockDb.subscriptions.values())) {
      if (sub.status !== 'active') continue
      const endTime = new Date(sub.currentPeriodEnd).getTime()
      const daysUntil = (endTime - now.getTime()) / (1000 * 60 * 60 * 24)
      if (daysUntil >= 2 && daysUntil <= 4) {
        const user = mockDb.getUserById(sub.userId)
        if (user) {
          mockEmail.sendSubscriptionExpiring(user.email, user.fullName, sub.plan, sub.currentPeriodEnd)
          results.expiringWarnings++
        }
      }
    }

    return NextResponse.json({ success: true, data: results })
  }

  // ── Production mode ──────────────────────────────────────────────────────
  const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const {
    sendSessionReminderEmail,
    sendReviewRequestEmail,
    sendSubscriptionExpiringEmail,
  } = await import('@/lib/email')

  const admin = createSupabaseAdminClient()
  const now = new Date()

  // 1. Session reminders — accepted bookings with session in ~24h
  try {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStart = new Date(tomorrow)
    tomorrowStart.setHours(0, 0, 0, 0)
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const { data: upcomingBookings } = await admin
      .from('bookings')
      .select('id, traveler_id, host_id, session_date')
      .eq('status', 'accepted')
      .gte('session_date', tomorrowStart.toISOString())
      .lte('session_date', tomorrowEnd.toISOString())

    for (const booking of upcomingBookings ?? []) {
      const { data: traveler } = await admin.from('users').select('email, full_name').eq('id', booking.traveler_id).maybeSingle()
      const { data: host } = await admin.from('users').select('email, full_name').eq('id', booking.host_id).maybeSingle()

      if (traveler?.email && host?.email && booking.session_date) {
        await sendSessionReminderEmail({
          to: traveler.email,
          recipientName: traveler.full_name ?? 'Traveler',
          otherPersonName: host.full_name ?? 'Host',
          sessionDate: booking.session_date,
          role: 'traveler',
        }).catch(e => results.errors.push(`reminder-traveler-${booking.id}: ${e.message}`))

        await sendSessionReminderEmail({
          to: host.email,
          recipientName: host.full_name ?? 'Host',
          otherPersonName: traveler.full_name ?? 'Traveler',
          sessionDate: booking.session_date,
          role: 'host',
        }).catch(e => results.errors.push(`reminder-host-${booking.id}: ${e.message}`))

        results.sessionReminders += 2
      }
    }
  } catch (err) {
    results.errors.push(`session-reminders: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 2. Review requests — completed bookings where session was 2-6h ago
  try {
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    const { data: completedBookings } = await admin
      .from('bookings')
      .select('id, traveler_id, host_id, conversation_id, session_date')
      .eq('status', 'completed')
      .gte('session_date', sixHoursAgo.toISOString())
      .lte('session_date', twoHoursAgo.toISOString())

    for (const booking of completedBookings ?? []) {
      const { data: traveler } = await admin.from('users').select('email, full_name').eq('id', booking.traveler_id).maybeSingle()
      const { data: host } = await admin.from('users').select('email, full_name').eq('id', booking.host_id).maybeSingle()
      const conversationId = booking.conversation_id ?? booking.id

      if (traveler?.email) {
        await sendReviewRequestEmail({
          to: traveler.email,
          name: traveler.full_name ?? 'Traveler',
          otherPersonName: host?.full_name ?? 'Host',
          conversationId,
        }).catch(e => results.errors.push(`review-traveler-${booking.id}: ${e.message}`))
        results.reviewRequests++
      }

      if (host?.email) {
        await sendReviewRequestEmail({
          to: host.email,
          name: host.full_name ?? 'Host',
          otherPersonName: traveler?.full_name ?? 'Traveler',
          conversationId,
        }).catch(e => results.errors.push(`review-host-${booking.id}: ${e.message}`))
        results.reviewRequests++
      }
    }
  } catch (err) {
    results.errors.push(`review-requests: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 3. Subscription expiring — expires in 2-4 days
  try {
    const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const fourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

    const { data: expiringSubs } = await admin
      .from('subscriptions')
      .select('user_id, plan, current_period_end')
      .eq('status', 'active')
      .eq('cancel_at_period_end', true)
      .gte('current_period_end', twoDays.toISOString())
      .lte('current_period_end', fourDays.toISOString())

    for (const sub of expiringSubs ?? []) {
      const { data: user } = await admin.from('users').select('email, full_name').eq('id', sub.user_id).maybeSingle()
      if (user?.email) {
        const expiresAt = new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        await sendSubscriptionExpiringEmail({
          to: user.email,
          name: user.full_name ?? 'there',
          plan: (sub.plan ?? 'your').charAt(0).toUpperCase() + (sub.plan ?? 'your').slice(1),
          expiresAt,
        }).catch(e => results.errors.push(`expiring-${sub.user_id}: ${e.message}`))
        results.expiringWarnings++
      }
    }
  } catch (err) {
    results.errors.push(`expiring-warnings: ${err instanceof Error ? err.message : String(err)}`)
  }

  return NextResponse.json({ success: true, data: results })
}
