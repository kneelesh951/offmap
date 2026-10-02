/**
 * PATCH /api/bookings/[id]  — host accepts or declines a pending booking
 * GET   /api/bookings/[id]  — get a single booking (traveler or host)
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'

const patchSchema = z.object({
  action: z.enum(['accept', 'decline']),
  reason: z.string().max(300).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.MOCK_MODE === 'true') {
      const { mockGetUser } = await import('@/lib/mock/auth')
      const { mockDb } = await import('@/lib/mock/db')

      const token = cookies().get('offmap_mock_session')?.value
      const user = mockGetUser(token)
      if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })

      const booking = mockDb.bookings.get(params.id)
      if (!booking) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })

      if (booking.travelerId !== user.id && booking.hostId !== user.id) {
        return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 })
      }

      return NextResponse.json({ success: true, data: booking })
    }

    // Production: add Drizzle query here
    return NextResponse.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Use mock mode' } }, { status: 501 })
  } catch (err) {
    console.error('[booking GET]', err)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Server error' } }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 422 }
      )
    }
    const { action, reason } = parsed.data

    if (process.env.MOCK_MODE === 'true') {
      const { mockGetUser } = await import('@/lib/mock/auth')
      const { mockDb } = await import('@/lib/mock/db')

      const token = cookies().get('offmap_mock_session')?.value
      const user = mockGetUser(token)
      if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
      if (user.role !== 'host') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only hosts can accept/decline bookings' } }, { status: 403 })

      const booking = mockDb.bookings.get(params.id)
      if (!booking) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
      if (booking.hostId !== user.id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'This is not your booking' } }, { status: 403 })
      if (booking.status !== 'pending') return NextResponse.json({ success: false, error: { code: 'CONFLICT', message: `Booking is already ${booking.status}` } }, { status: 409 })

      const now = new Date().toISOString()

      if (action === 'accept') {
        mockDb.updateBooking(params.id, {
          status: 'accepted',
          paymentStatus: 'captured',
          acceptedAt: now,
          hostMustRespondBy: null,
          hostAcknowledgedAt: now,
        })
        return NextResponse.json({ success: true, data: { status: 'accepted', message: 'Booking accepted — payment captured' } })
      }

      if (action === 'decline') {
        mockDb.updateBooking(params.id, {
          status: 'declined',
          paymentStatus: 'released',
          declinedAt: now,
          cancellationReason: reason ?? null,
          hostMustRespondBy: null,
        })
        return NextResponse.json({ success: true, data: { status: 'declined', message: 'Booking declined — payment authorisation released' } })
      }
    }

    // Production: Stripe capture/cancel + Drizzle update
    return NextResponse.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Use mock mode' } }, { status: 501 })
  } catch (err) {
    console.error('[booking PATCH]', err)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Server error' } }, { status: 500 })
  }
}
