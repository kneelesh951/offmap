/**
 * POST /api/bookings  — create a booking request
 * GET  /api/bookings  — list bookings for the logged-in user (traveler or host)
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'

const SERVICE_FEE_PERCENT = 5
const PLATFORM_COMMISSION_PERCENT = 15

const createSchema = z.object({
  hostUserId:        z.string().min(1),
  sessionDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'sessionDate must be ISO datetime YYYY-MM-DDTHH:MM'),
  sessionRateCents:  z.number().int().min(500),
  durationHours:     z.number().int().min(1).max(8).default(1),
  noteFromTraveler:  z.string().max(300).optional(),
  meetingPoint:      z.string().max(200).optional(),
  conversationId:    z.string().optional(),
})

function calcFees(sessionRateCents: number, durationHours: number) {
  const baseAmount     = sessionRateCents * durationHours
  const serviceFee     = Math.round(baseAmount * SERVICE_FEE_PERCENT / 100)
  const commission     = Math.round(baseAmount * PLATFORM_COMMISSION_PERCENT / 100)
  const travelerTotal  = baseAmount + serviceFee
  const hostPayout     = baseAmount - commission
  const platformFee    = travelerTotal - hostPayout
  return { baseAmount, serviceFee, commission, travelerTotal, hostPayout, platformFee }
}

// ── POST — create booking ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 422 }
      )
    }
    const data = parsed.data

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
      if (user.role !== 'traveler') {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Only travelers can book sessions' } },
          { status: 403 }
        )
      }

      // Must have active subscription
      const sub = mockDb.getActiveSubscription(user.id)
      if (!sub) {
        return NextResponse.json(
          { success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Subscribe to book sessions.' } },
          { status: 403 }
        )
      }

      // Can't book yourself
      if (data.hostUserId === user.id) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'You cannot book yourself.' } },
          { status: 422 }
        )
      }

      // ── Slot validation ────────────────────────────────────────────────────
      const host = Array.from(mockDb.hostProfiles.values()).find(h => h.userId === data.hostUserId)
      if (!host) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } },
          { status: 404 }
        )
      }

      const sessionStart = new Date(data.sessionDate)
      if (isNaN(sessionStart.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid sessionDate' } },
          { status: 422 }
        )
      }

      if (host.availability) {
        const dateStr = data.sessionDate.slice(0, 10) // YYYY-MM-DD
        const av = host.availability
        const dayOfWeek = sessionStart.getDay()
        const window = av.windows.find((w: { dayOfWeek: number }) => w.dayOfWeek === dayOfWeek)

        if (!window || av.blockedDates.includes(dateStr)) {
          return NextResponse.json(
            { success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'Host is not available on this date' } },
            { status: 409 }
          )
        }

        const noticeCutoff = new Date(Date.now() + av.minNoticeHours * 60 * 60 * 1000)
        if (sessionStart <= noticeCutoff) {
          return NextResponse.json(
            { success: false, error: { code: 'SLOT_UNAVAILABLE', message: `Host requires at least ${av.minNoticeHours}h notice` } },
            { status: 409 }
          )
        }

        if (data.durationHours > av.maxSessionHours) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: `Maximum session length is ${av.maxSessionHours}h` } },
            { status: 422 }
          )
        }

        // Overlap check — reject if any pending/accepted booking overlaps this window
        const sessionEnd = new Date(sessionStart.getTime() + data.durationHours * 60 * 60 * 1000)
        const existing = Array.from(mockDb.bookings.values()).filter(b =>
          b.hostId === data.hostUserId &&
          ['pending', 'accepted'].includes(b.status) &&
          b.sessionDate
        )

        const overlap = existing.some(b => {
          const bStart = new Date(b.sessionDate!)
          const bEnd = new Date(bStart.getTime() + b.durationHours * 60 * 60 * 1000)
          return !(sessionEnd <= bStart || sessionStart >= bEnd)
        })

        if (overlap) {
          return NextResponse.json(
            { success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'This time slot is already taken' } },
            { status: 409 }
          )
        }
      }

      // ── Dynamic response deadline ─────────────────────────────────────────
      const now = Date.now()
      const msUntilSession = sessionStart.getTime() - now
      const hrsUntilSession = msUntilSession / (60 * 60 * 1000)

      let responseWindowHrs: number
      if (hrsUntilSession > 72) responseWindowHrs = 24
      else if (hrsUntilSession > 24) responseWindowHrs = 8
      else if (hrsUntilSession > 12) responseWindowHrs = 4
      else {
        return NextResponse.json(
          { success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'Cannot book less than 12 hours before session time' } },
          { status: 409 }
        )
      }

      const hostMustRespondBy = new Date(now + responseWindowHrs * 60 * 60 * 1000).toISOString()
      const mockPaymentIntentId = `mock_pi_${Date.now()}`

      const fees = calcFees(data.sessionRateCents, data.durationHours)

      const booking = mockDb.createBooking({
        travelerId: user.id,
        hostId: data.hostUserId,
        conversationId: data.conversationId ?? null,
        sessionDate: sessionStart.toISOString(),
        durationHours: data.durationHours,
        noteFromTraveler: data.noteFromTraveler ?? null,
        meetingPoint: data.meetingPoint ?? null,
        interests: null,
        sessionRateCents: data.sessionRateCents,
        serviceFeePercent: SERVICE_FEE_PERCENT,
        platformCommissionPercent: PLATFORM_COMMISSION_PERCENT,
        travelerTotalCents: fees.travelerTotal,
        hostPayoutCents: fees.hostPayout,
        platformFeeCents: fees.platformFee,
        status: 'pending',
        paymentStatus: 'authorized',
        mockPaymentIntentId,
        hostMustRespondBy,
        cancellationType: null,
        cancellationReason: null,
        cancelledBy: null,
        cancelledAt: null,
        refundPercent: null,
        refundAmountCents: null,
        platformCreditCents: 0,
        rescheduleCount: 0,
        originalSessionDate: null,
        noShowReportedAt: null,
        noShowReportedBy: null,
        acceptedAt: null,
        declinedAt: null,
        completedAt: null,
        travelerAcknowledgedAt: new Date().toISOString(),
        hostAcknowledgedAt: null,
      })

      // Send booking request email to host
      const { mockEmail } = await import('@/lib/mock/email')
      const hostUser = mockDb.getUserById(data.hostUserId)
      if (hostUser) {
        mockEmail.sendBookingRequested(hostUser.email, hostUser.fullName, user.fullName, fees.travelerTotal)
      }

      return NextResponse.json({ success: true, data: { booking } }, { status: 201 })
    }

    // ── Production mode ───────────────────────────────────────────────────────
    const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const admin = createSupabaseAdminClient()

    // Check subscription
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .maybeSingle()

    if (!sub) {
      return NextResponse.json(
        { success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Subscribe to book sessions.' } },
        { status: 403 }
      )
    }

    const fees = calcFees(data.sessionRateCents, data.durationHours)

    const { data: booking, error } = await admin
      .from('bookings')
      .insert({
        traveler_id: authUser.id,
        host_id: data.hostUserId,
        conversation_id: data.conversationId ?? null,
        duration_hours: data.durationHours,
        note_from_traveler: data.noteFromTraveler ?? null,
        session_rate_cents: data.sessionRateCents,
        service_fee_percent: SERVICE_FEE_PERCENT,
        platform_commission_percent: PLATFORM_COMMISSION_PERCENT,
        traveler_total_cents: fees.travelerTotal,
        host_payout_cents: fees.hostPayout,
        platform_fee_cents: fees.platformFee,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    // Send booking request email to host
    const { sendBookingRequestedEmail } = await import('@/lib/email')
    const { data: hostUser } = await admin.from('users').select('email, full_name').eq('id', data.hostUserId).maybeSingle()
    if (hostUser?.email && booking) {
      sendBookingRequestedEmail({
        to: hostUser.email,
        hostName: hostUser.full_name ?? 'Host',
        travelerName: (await admin.from('users').select('full_name').eq('id', authUser.id).maybeSingle()).data?.full_name ?? 'Traveler',
        sessionDate: null,
        amountCents: fees.travelerTotal,
        hostPayoutCents: fees.hostPayout,
        bookingId: booking.id,
      }).catch(console.error)
    }

    return NextResponse.json({ success: true, data: { booking } }, { status: 201 })

  } catch (err) {
    console.error('[bookings] POST error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' } },
      { status: 500 }
    )
  }
}

// ── GET — list bookings ───────────────────────────────────────────────────────
export async function GET() {
  try {
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

      const bookings = user.role === 'host'
        ? mockDb.getBookingsByHost(user.id).map(b => ({
            ...b,
            travelerName: mockDb.getUserById(b.travelerId)?.fullName ?? 'Traveler',
          }))
        : mockDb.getBookingsByTraveler(user.id).map(b => ({
            ...b,
            hostName: mockDb.getUserById(b.hostId)?.fullName ?? 'Host',
          }))

      return NextResponse.json({ success: true, data: { bookings } })
    }

    // ── Production mode ───────────────────────────────────────────────────────
    const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const admin = createSupabaseAdminClient()
    const { data: userRow } = await admin.from('users').select('role').eq('id', authUser.id).maybeSingle()
    const isHost = userRow?.role === 'host'

    const query = isHost
      ? admin.from('bookings').select('*, traveler:users!bookings_traveler_id_fkey(full_name)').eq('host_id', authUser.id).order('created_at', { ascending: false })
      : admin.from('bookings').select('*, host:users!bookings_host_id_fkey(full_name)').eq('traveler_id', authUser.id).order('created_at', { ascending: false })

    const { data: bookings, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: { bookings: bookings ?? [] } })

  } catch (err) {
    console.error('[bookings] GET error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' } },
      { status: 500 }
    )
  }
}
