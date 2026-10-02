/**
 * GET /api/hosts/[id]/slots?date=YYYY-MM-DD
 * Returns available start-time slots for a specific date.
 * Used by the time slot picker after traveler selects a date.
 */
import { NextResponse } from 'next/server'

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minsToTime(m: number) {
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function getAvailableSlots(
  dateStr: string,
  availability: {
    windows: { dayOfWeek: number; startTime: string; endTime: string }[]
    minNoticeHours: number
    maxSessionHours: number
    maxSessionsPerDay: number
    blockedDates: string[]
  },
  existingBookings: { sessionDate: string | null; durationHours: number; status: string }[]
) {
  const date = new Date(dateStr + 'T12:00:00')
  const dayOfWeek = date.getDay()
  const window = availability.windows.find(w => w.dayOfWeek === dayOfWeek)

  if (!window || availability.blockedDates.includes(dateStr)) {
    return { window: null, slots: [], maxSessionHours: 0, bookedSlots: [] }
  }

  const dayBookings = existingBookings.filter(b => {
    if (!b.sessionDate || !['pending', 'accepted'].includes(b.status)) return false
    return b.sessionDate.startsWith(dateStr)
  })

  const bookedSlots = dayBookings.map(b => {
    if (!b.sessionDate) return null
    const d = new Date(b.sessionDate)
    return {
      start: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      end: minsToTime(d.getHours() * 60 + d.getMinutes() + b.durationHours * 60),
      status: b.status,
    }
  }).filter(Boolean)

  // If max sessions reached, no slots available
  if (dayBookings.length >= availability.maxSessionsPerDay) {
    return {
      window: { start: window.startTime, end: window.endTime },
      slots: [],
      maxSessionHours: availability.maxSessionHours,
      bookedSlots,
    }
  }

  const windowStart = timeToMins(window.startTime)
  const windowEnd = timeToMins(window.endTime > window.startTime ? window.endTime : '24:00') // handle midnight
  const maxDuration = availability.maxSessionHours * 60
  const now = new Date()

  const slots: string[] = []

  for (let t = windowStart; t + 60 <= windowEnd; t += 60) {
    // Slot must fit max duration within window
    if (t + maxDuration > windowEnd) {
      // Still allow if at least 1h fits
    }

    const slotDateTime = new Date(`${dateStr}T${minsToTime(t)}:00`)
    const noticeCutoff = new Date(now.getTime() + availability.minNoticeHours * 60 * 60 * 1000)
    if (slotDateTime <= noticeCutoff) continue

    // Check against existing bookings
    const conflicts = bookedSlots.some(b => {
      if (!b) return false
      const bStart = timeToMins(b.start)
      const bEnd = timeToMins(b.end)
      const slotEnd = t + maxDuration
      return !(slotEnd <= bStart || t >= bEnd)
    })

    if (!conflicts) slots.push(minsToTime(t))
  }

  return {
    window: { start: window.startTime, end: window.endTime },
    slots,
    maxSessionHours: availability.maxSessionHours,
    bookedSlots,
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') // YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'date param required (YYYY-MM-DD)' } },
        { status: 422 }
      )
    }

    const hostUserId = params.id

    if (process.env.MOCK_MODE === 'true') {
      const { mockDb } = await import('@/lib/mock/db')

      const host = Array.from(mockDb.hostProfiles.values()).find(h => h.userId === hostUserId)
      if (!host || !host.availability) {
        return NextResponse.json({ success: true, data: { window: null, slots: [], maxSessionHours: 4, bookedSlots: [] } })
      }

      const hostBookings = Array.from(mockDb.bookings.values())
        .filter(b => b.hostId === hostUserId)
        .map(b => ({ sessionDate: b.sessionDate, durationHours: b.durationHours, status: b.status }))

      const result = getAvailableSlots(date, host.availability, hostBookings)
      return NextResponse.json({ success: true, data: result })
    }

    // ── Production ────────────────────────────────────────────────────────
    const { db } = await import('@/lib/db')
    const { hostProfiles, bookings } = await import('@/lib/db/schema')
    const { eq, and, gte, lt, inArray } = await import('drizzle-orm')

    const [host] = await db
      .select({ availability: hostProfiles.availability })
      .from(hostProfiles)
      .where(eq(hostProfiles.userId, hostUserId))
      .limit(1)
    if (!host?.availability) {
      return NextResponse.json({ success: true, data: { window: null, slots: [], maxSessionHours: 4, bookedSlots: [] } })
    }

    const dayStart = new Date(date + 'T00:00:00')
    const dayEnd = new Date(date + 'T23:59:59')

    const existing = await db
      .select({ sessionDate: bookings.sessionDate, durationHours: bookings.durationHours, status: bookings.status })
      .from(bookings)
      .where(
        and(
          eq(bookings.hostId, hostUserId),
          gte(bookings.sessionDate, dayStart),
          lt(bookings.sessionDate, dayEnd),
          inArray(bookings.status, ['pending', 'accepted'])
        )
      )

    const bookingList = existing.map(b => ({
      sessionDate: b.sessionDate?.toISOString() ?? null,
      durationHours: b.durationHours,
      status: b.status,
    }))

    const result = getAvailableSlots(date, host.availability as any, bookingList)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[slots]', err)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load slots' } },
      { status: 500 }
    )
  }
}
