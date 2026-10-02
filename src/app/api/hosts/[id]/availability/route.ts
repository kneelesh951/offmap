/**
 * GET /api/hosts/[id]/availability?month=YYYY-MM  — calendar view for travelers
 * PUT /api/hosts/[id]/availability                 — host saves their availability settings
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'

// ── Validation schemas ────────────────────────────────────────────────────────

const windowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
})

const availabilitySchema = z.object({
  windows:           z.array(windowSchema).max(14),
  minNoticeHours:    z.number().int().min(1).max(168),   // 1h–7 days
  maxSessionHours:   z.number().int().min(1).max(12),
  maxSessionsPerDay: z.number().int().min(1).max(5),
  blockedDates:      z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(365),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateStatus(
  dateStr: string,
  availability: { windows: { dayOfWeek: number; startTime: string; endTime: string }[]; minNoticeHours: number; maxSessionHours: number; maxSessionsPerDay: number; blockedDates: string[] } | null,
  bookings: { sessionDate: string | null; status: string }[]
): 'available' | 'pending' | 'booked' {
  if (!availability) return 'booked'

  const date = new Date(dateStr + 'T12:00:00') // noon to avoid DST issues
  const dayOfWeek = date.getDay()

  const window = availability.windows.find(w => w.dayOfWeek === dayOfWeek)
  if (!window) return 'booked'

  if (availability.blockedDates.includes(dateStr)) return 'booked'

  const windowStart = new Date(`${dateStr}T${window.startTime}:00`)
  const noticeDeadline = new Date(Date.now() + availability.minNoticeHours * 60 * 60 * 1000)
  if (windowStart <= noticeDeadline) return 'booked'

  const dayBookings = bookings.filter(b => {
    if (!b.sessionDate) return false
    return b.sessionDate.startsWith(dateStr) && ['pending', 'accepted'].includes(b.status)
  })

  if (dayBookings.length === 0) return 'available'
  if (dayBookings.length >= availability.maxSessionsPerDay) {
    return dayBookings.some(b => b.status === 'pending') ? 'pending' : 'booked'
  }
  return dayBookings.some(b => b.status === 'pending') ? 'pending' : 'available'
}

// ── GET — calendar view ───────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'month param required (YYYY-MM)' } },
        { status: 422 }
      )
    }

    const hostUserId = params.id

    if (process.env.MOCK_MODE === 'true') {
      const { mockDb } = await import('@/lib/mock/db')

      const host = Array.from(mockDb.hostProfiles.values()).find(h => h.userId === hostUserId)
      if (!host) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } },
          { status: 404 }
        )
      }

      const hostBookings = Array.from(mockDb.bookings.values()).filter(b => b.hostId === hostUserId)

      const [year, mon] = month.split('-').map(Number)
      const daysInMonth = new Date(year, mon, 0).getDate()
      const result: Record<string, string> = {}

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        result[dateStr] = getDateStatus(dateStr, host.availability ?? null, hostBookings)
      }

      return NextResponse.json({ success: true, data: result })
    }

    // ── Production (Drizzle) ──────────────────────────────────────────────
    const { db } = await import('@/lib/db')
    const { hostProfiles, bookings } = await import('@/lib/db/schema')
    const { eq, and, gte, lt, inArray } = await import('drizzle-orm')

    const [host] = await db
      .select({ availability: hostProfiles.availability })
      .from(hostProfiles)
      .where(eq(hostProfiles.userId, hostUserId))
      .limit(1)
    if (!host) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } },
        { status: 404 }
      )
    }

    const [year, mon] = month.split('-').map(Number)
    const monthStart = new Date(year, mon - 1, 1)
    const monthEnd = new Date(year, mon, 1)

    const existingBookings = await db
      .select({ sessionDate: bookings.sessionDate, status: bookings.status })
      .from(bookings)
      .where(
        and(
          eq(bookings.hostId, hostUserId),
          gte(bookings.sessionDate, monthStart),
          lt(bookings.sessionDate, monthEnd),
          inArray(bookings.status, ['pending', 'accepted'])
        )
      )

    const bookingList = existingBookings.map(b => ({
      sessionDate: b.sessionDate?.toISOString() ?? null,
      status: b.status,
    }))

    const daysInMonth = new Date(year, mon, 0).getDate()
    const result: Record<string, string> = {}
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      result[dateStr] = getDateStatus(dateStr, host.availability as any, bookingList)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[availability GET]', err)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load availability' } },
      { status: 500 }
    )
  }
}

// ── PUT — save host availability settings ─────────────────────────────────────

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const parsed = availabilitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 422 }
      )
    }
    const availability = parsed.data

    if (process.env.MOCK_MODE === 'true') {
      const { mockGetUser } = await import('@/lib/mock/auth')
      const { mockDb } = await import('@/lib/mock/db')

      const token = cookies().get('offmap_mock_session')?.value
      const user = mockGetUser(token)
      if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
      if (user.role !== 'host') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Hosts only' } }, { status: 403 })
      if (user.id !== params.id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own availability' } }, { status: 403 })

      const profile = Array.from(mockDb.hostProfiles.values()).find(h => h.userId === user.id)
      if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Host profile not found' } }, { status: 404 })

      mockDb.updateHostProfile(profile.id, { availability })
      return NextResponse.json({ success: true, data: { availability } })
    }

    // Production: Drizzle update
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    if (authUser.id !== params.id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own availability' } }, { status: 403 })

    const { db } = await import('@/lib/db')
    const { hostProfiles } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    await db.update(hostProfiles).set({ availability }).where(eq(hostProfiles.userId, authUser.id))
    return NextResponse.json({ success: true, data: { availability } })

  } catch (err) {
    console.error('[availability PUT]', err)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save availability' } },
      { status: 500 }
    )
  }
}
