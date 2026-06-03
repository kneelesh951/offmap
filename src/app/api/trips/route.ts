import { NextRequest, NextResponse } from 'next/server'
import { createTripRequestSchema } from '@/lib/validators'

// GET /api/trips — list open trip requests (hosts browse by city)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cityId = searchParams.get('cityId') ?? undefined
  const status = searchParams.get('status') ?? 'open'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))

  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    let trips = Array.from(mockDb.tripRequests.values())
    if (cityId) trips = trips.filter(t => t.cityId === cityId)
    if (status) trips = trips.filter(t => t.status === status)
    trips.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const total = trips.length
    const paginated = trips.slice((page - 1) * limit, page * limit)

    const result = paginated.map(t => {
      const traveler = mockDb.getUserById(t.travelerId)
      const city = mockDb.cities.get(t.cityId)
      return { ...t, travelerName: traveler?.fullName ?? null, cityName: city?.name ?? '', flagEmoji: city?.flagEmoji ?? '' }
    })
    return NextResponse.json({ success: true, data: { trips: result, total, page, limit } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { db } = await import('@/lib/db')
  const { tripRequests, users, cities } = await import('@/lib/db/schema')
  const { eq, and, desc } = await import('drizzle-orm')

  const conditions = [eq(tripRequests.status, status as 'open' | 'matched' | 'expired' | 'cancelled')]
  if (cityId) conditions.push(eq(tripRequests.cityId, cityId))

  const rows = await db
    .select({
      trip: tripRequests,
      travelerName: users.fullName,
      cityName: cities.name,
      flagEmoji: cities.flagEmoji,
    })
    .from(tripRequests)
    .leftJoin(users, eq(tripRequests.travelerId, users.id))
    .leftJoin(cities, eq(tripRequests.cityId, cities.id))
    .where(and(...conditions))
    .orderBy(desc(tripRequests.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return NextResponse.json({ success: true, data: { trips: rows.map(r => ({ ...r.trip, travelerName: r.travelerName, cityName: r.cityName, flagEmoji: r.flagEmoji })), page, limit } })
}

// POST /api/trips — traveler creates a trip request
export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = createTripRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid data', fields: parsed.error.flatten().fieldErrors } }, { status: 422 })
  }

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
    if (user.role !== 'traveler') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only travelers can post trips' } }, { status: 403 })

    const trip = mockDb.createTripRequest(user.id, parsed.data)

    // Mock notification: log matching hosts
    const city = mockDb.cities.get(parsed.data.cityId)
    const matchingHosts = Array.from(mockDb.hostProfiles.values()).filter(h => h.cityId === parsed.data.cityId && h.isActive)
    console.log(`📬 Trip posted to ${city?.name ?? parsed.data.cityId} — notifying ${matchingHosts.length} host(s):`)
    matchingHosts.forEach(h => {
      const hostUser = mockDb.getUserById(h.userId)
      console.log(`   → ${hostUser?.fullName ?? h.userId} (${h.headline})`)
    })

    return NextResponse.json({ success: true, data: trip }, { status: 201 })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { db } = await import('@/lib/db')
  const { tripRequests, users } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
  if (dbUser?.role !== 'traveler') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only travelers can post trips' } }, { status: 403 })

  const { arrivalDate, departureDate, ...rest } = parsed.data
  const [trip] = await db.insert(tripRequests).values({
    travelerId: user.id,
    ...rest,
    arrivalDate: new Date(arrivalDate),
    departureDate: new Date(departureDate),
    expiresAt: new Date(arrivalDate),
  }).returning()

  return NextResponse.json({ success: true, data: trip }, { status: 201 })
}
