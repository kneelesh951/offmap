import { NextRequest, NextResponse } from 'next/server'

// GET /api/trips/[id] — single trip request with host responses
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const trip = mockDb.tripRequests.get(tripId)
    if (!trip) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } }, { status: 404 })

    if (user.role === 'traveler' && trip.travelerId !== user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 })
    }

    const city = mockDb.cities.get(trip.cityId)
    const responses = Array.from(mockDb.tripHostResponses.values())
      .filter(r => r.tripId === tripId)
      .map(r => {
        const host = mockDb.getUserById(r.hostId)
        const hostProfile = mockDb.getHostProfileByUserId(r.hostId)
        return { ...r, hostName: host?.fullName ?? null, hostProfile: hostProfile ?? null }
      })

    return NextResponse.json({
      success: true,
      data: { ...trip, cityName: city?.name ?? '', flagEmoji: city?.flagEmoji ?? '', responses },
    })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { db } = await import('@/lib/db')
  const { tripRequests, tripHostResponses, users, cities } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const [row] = await db
    .select({ trip: tripRequests, cityName: cities.name, flagEmoji: cities.flagEmoji })
    .from(tripRequests)
    .leftJoin(cities, eq(tripRequests.cityId, cities.id))
    .where(eq(tripRequests.id, tripId))
    .limit(1)

  if (!row) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } }, { status: 404 })

  const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
  if (dbUser?.role === 'traveler' && row.trip.travelerId !== user.id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 })
  }

  const responses = await db
    .select({ response: tripHostResponses, hostName: users.fullName })
    .from(tripHostResponses)
    .leftJoin(users, eq(tripHostResponses.hostId, users.id))
    .where(eq(tripHostResponses.tripId, tripId))

  return NextResponse.json({
    success: true,
    data: {
      ...row.trip,
      cityName: row.cityName,
      flagEmoji: row.flagEmoji,
      responses: responses.map(r => ({ ...r.response, hostName: r.hostName })),
    },
  })
}
