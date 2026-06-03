/**
 * POST /api/bookings/[id]/action
 * Body: { action: 'accept' | 'decline' | 'cancel' | 'report_no_show' | 'resolve_dispute', reason?: string }
 *
 * Centralised booking action handler. All state transitions go through here.
 * Uses the pure cancellation policy engine in src/lib/booking/cancellation.ts
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { calculateCancellation } from '@/lib/booking/cancellation'

const schema = z.object({
  action: z.enum(['accept', 'decline', 'cancel', 'report_no_show', 'resolve_dispute']),
  reason: z.string().max(500).optional(),
  resolveFor: z.enum(['traveler', 'host']).optional(), // for admin dispute resolution
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 422 }
      )
    }
    const { action, reason, resolveFor } = parsed.data
    const bookingId = params.id

    // ── Mock mode ─────────────────────────────────────────────────────────────
    if (process.env.MOCK_MODE === 'true') {
      const { mockGetUser } = await import('@/lib/mock/auth')
      const { mockDb } = await import('@/lib/mock/db')

      const token = cookies().get('offmap_mock_session')?.value
      const user = mockGetUser(token)
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
          { status: 401 }
        )
      }

      const booking = mockDb.bookings.get(bookingId)
      if (!booking) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } },
          { status: 404 }
        )
      }

      // Access check — only traveler or host on the booking can act
      const isTraveler = booking.travelerId === user.id
      const isHost = booking.hostId === user.id
      if (!isTraveler && !isHost) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Not your booking' } },
          { status: 403 }
        )
      }

      const now = new Date().toISOString()

      // ── ACCEPT ───────────────────────────────────────────────────────────────
      if (action === 'accept') {
        if (!isHost) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only host can accept' } }, { status: 403 })
        if (booking.status !== 'pending') return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: `Cannot accept a booking in status: ${booking.status}` } }, { status: 409 })
        const updated = mockDb.updateBooking(bookingId, { status: 'accepted' })
        return NextResponse.json({ success: true, data: { booking: updated } })
      }

      // ── DECLINE ──────────────────────────────────────────────────────────────
      if (action === 'decline') {
        if (!isHost) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only host can decline' } }, { status: 403 })
        if (booking.status !== 'pending') return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: `Cannot decline a booking in status: ${booking.status}` } }, { status: 409 })
        const updated = mockDb.updateBooking(bookingId, {
          status: 'declined',
          cancelledAt: now,
          cancelledBy: user.id,
          cancellationReason: reason ?? 'Host declined',
          cancellationType: 'host',
          refundPercent: 100,
          refundAmountCents: booking.travelerTotalCents, // full refund on decline
        })
        return NextResponse.json({ success: true, data: { booking: updated } })
      }

      // ── CANCEL ───────────────────────────────────────────────────────────────
      if (action === 'cancel') {
        if (!isTraveler && !isHost) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your booking' } }, { status: 403 })
        if (!['pending', 'accepted'].includes(booking.status)) {
          return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: `Cannot cancel a booking in status: ${booking.status}` } }, { status: 409 })
        }

        const actor = isTraveler ? 'traveler' : 'host'
        const result = calculateCancellation(
          actor,
          new Date(booking.createdAt),
          booking.sessionDate ? new Date(booking.sessionDate) : null,
          booking.travelerTotalCents,
        )

        const updated = mockDb.updateBooking(bookingId, {
          status: 'cancelled',
          cancelledAt: now,
          cancelledBy: user.id,
          cancellationReason: reason ?? result.reason,
          cancellationType: result.cancellationType,
          refundPercent: result.refundPercent,
          refundAmountCents: result.refundAmountCents,
          platformCreditCents: result.platformCreditCents,
        })

        // Apply host strikes if host cancelled
        if (actor === 'host' && result.strikesApplied > 0) {
          mockDb.applyStrikesToHost(user.id, result.strikesApplied, result.payoutFreezedays)
        }

        return NextResponse.json({
          success: true,
          data: {
            booking: updated,
            refundAmount: `€${(result.refundAmountCents / 100).toFixed(2)}`,
            platformCredit: result.platformCreditCents > 0 ? `€${(result.platformCreditCents / 100).toFixed(2)}` : null,
            strikesApplied: result.strikesApplied,
            message: result.reason,
          },
        })
      }

      // ── REPORT NO-SHOW ────────────────────────────────────────────────────────
      if (action === 'report_no_show') {
        if (!isTraveler) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only travelers can report a no-show' } }, { status: 403 })
        if (booking.status !== 'accepted') return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'Session must be accepted to report no-show' } }, { status: 409 })

        const result = calculateCancellation('host', new Date(booking.createdAt), booking.sessionDate ? new Date(booking.sessionDate) : null, booking.travelerTotalCents, true)

        const updated = mockDb.updateBooking(bookingId, {
          status: 'disputed',
          noShowReportedAt: now,
          noShowReportedBy: user.id,
          cancellationType: 'no_show_host',
          refundPercent: 100,
          refundAmountCents: booking.travelerTotalCents,
          platformCreditCents: result.platformCreditCents,
        })

        return NextResponse.json({
          success: true,
          data: {
            booking: updated,
            message: 'No-show reported. Host has 24 hours to respond. You will receive a full refund if they do not.',
          },
        })
      }

      // ── RESOLVE DISPUTE (admin/test only) ─────────────────────────────────────
      if (action === 'resolve_dispute') {
        if (booking.status !== 'disputed') return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: 'No active dispute on this booking' } }, { status: 409 })

        const travelerWins = resolveFor === 'traveler'
        if (travelerWins) {
          mockDb.updateBooking(bookingId, { status: 'refunded', refundPercent: 100, refundAmountCents: booking.travelerTotalCents })
          mockDb.applyStrikesToHost(booking.hostId, 2, 14)
        } else {
          // Host wins — payment captured, host gets paid
          mockDb.updateBooking(bookingId, { status: 'completed', refundPercent: 0, refundAmountCents: 0 })
        }

        return NextResponse.json({ success: true, data: { resolved: true, winner: resolveFor } })
      }

      return NextResponse.json({ success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action' } }, { status: 400 })
    }

    // ── Production mode ───────────────────────────────────────────────────────
    const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    }

    const admin = createSupabaseAdminClient()
    const { data: booking, error: fetchErr } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle()

    if (fetchErr || !booking) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    }

    const isTraveler = booking.traveler_id === authUser.id
    const isHost = booking.host_id === authUser.id
    if (!isTraveler && !isHost) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your booking' } }, { status: 403 })
    }

    const now = new Date().toISOString()

    if (action === 'accept') {
      if (!isHost) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only host can accept' } }, { status: 403 })
      await admin.from('bookings').update({ status: 'accepted' }).eq('id', bookingId)
      return NextResponse.json({ success: true, data: { status: 'accepted' } })
    }

    if (action === 'decline') {
      if (!isHost) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only host can decline' } }, { status: 403 })
      await admin.from('bookings').update({
        status: 'declined',
        cancelled_at: now,
        cancelled_by: authUser.id,
        cancellation_type: 'host',
        refund_percent: 100,
        refund_amount_cents: booking.traveler_total_cents,
      }).eq('id', bookingId)
      return NextResponse.json({ success: true, data: { status: 'declined' } })
    }

    if (action === 'cancel') {
      const actor = isTraveler ? 'traveler' : 'host'
      const result = calculateCancellation(
        actor,
        new Date(booking.created_at),
        booking.session_date ? new Date(booking.session_date) : null,
        booking.traveler_total_cents,
      )

      await admin.from('bookings').update({
        status: 'cancelled',
        cancelled_at: now,
        cancelled_by: authUser.id,
        cancellation_reason: reason ?? result.reason,
        cancellation_type: result.cancellationType,
        refund_percent: result.refundPercent,
        refund_amount_cents: result.refundAmountCents,
        platform_credit_cents: result.platformCreditCents,
      }).eq('id', bookingId)

      // Apply host strikes if host cancelled
      if (actor === 'host' && result.strikesApplied > 0) {
        const freezeUntil = result.payoutFreezedays > 0
          ? new Date(Date.now() + result.payoutFreezedays * 86400000).toISOString()
          : null
        await admin.from('host_profiles').update({
          strike_count: (booking.strike_count ?? 0) + result.strikesApplied,
          cancellation_count: (booking.cancellation_count ?? 0) + 1,
          ...(freezeUntil ? { payout_frozen_until: freezeUntil } : {}),
        }).eq('user_id', authUser.id)
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'cancelled',
          refundAmount: `€${(result.refundAmountCents / 100).toFixed(2)}`,
          platformCredit: result.platformCreditCents > 0 ? `€${(result.platformCreditCents / 100).toFixed(2)}` : null,
          message: result.reason,
        },
      })
    }

    if (action === 'report_no_show') {
      await admin.from('bookings').update({
        status: 'disputed',
        no_show_reported_at: now,
        no_show_reported_by: authUser.id,
        cancellation_type: 'no_show_host',
        refund_percent: 100,
        refund_amount_cents: booking.traveler_total_cents,
        platform_credit_cents: 2500,
      }).eq('id', bookingId)

      return NextResponse.json({
        success: true,
        data: { message: 'No-show reported. Host has 24 hours to respond.' },
      })
    }

    return NextResponse.json({ success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action' } }, { status: 400 })

  } catch (err) {
    console.error('[bookings/action] error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' } },
      { status: 500 }
    )
  }
}
