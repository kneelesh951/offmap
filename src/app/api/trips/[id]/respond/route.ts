import { NextRequest, NextResponse } from 'next/server'
import { createTripHostResponseSchema } from '@/lib/validators'

// POST /api/trips/[id]/respond — host sends a response to a trip request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id
  const body = await request.json()
  const parsed = createTripHostResponseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid data', fields: parsed.error.flatten().fieldErrors } }, { status: 422 })
  }

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
    if (user.role !== 'host') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only hosts can respond to trips' } }, { status: 403 })

    const trip = mockDb.tripRequests.get(tripId)
    if (!trip) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } }, { status: 404 })
    if (trip.status !== 'open') return NextResponse.json({ success: false, error: { code: 'TRIP_CLOSED', message: 'This trip is no longer accepting responses' } }, { status: 409 })

    const alreadyResponded = Array.from(mockDb.tripHostResponses.values()).find(r => r.tripId === tripId && r.hostId === user.id)
    if (alreadyResponded) return NextResponse.json({ success: false, error: { code: 'ALREADY_RESPONDED', message: 'You have already responded to this trip' } }, { status: 409 })

    const response = mockDb.createTripHostResponse(user.id, { tripId, ...parsed.data })
    return NextResponse.json({ success: true, data: response }, { status: 201 })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { db } = await import('@/lib/db')
  const { tripRequests, tripHostResponses, users } = await import('@/lib/db/schema')
  const { eq, and } = await import('drizzle-orm')

  const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
  if (dbUser?.role !== 'host') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only hosts can respond to trips' } }, { status: 403 })

  const [trip] = await db.select({ id: tripRequests.id, status: tripRequests.status }).from(tripRequests).where(eq(tripRequests.id, tripId)).limit(1)
  if (!trip) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
  if (trip.status !== 'open') return NextResponse.json({ success: false, error: { code: 'TRIP_CLOSED' } }, { status: 409 })

  const [existing] = await db.select({ id: tripHostResponses.id }).from(tripHostResponses).where(and(eq(tripHostResponses.tripId, tripId), eq(tripHostResponses.hostId, user.id))).limit(1)
  if (existing) return NextResponse.json({ success: false, error: { code: 'ALREADY_RESPONDED' } }, { status: 409 })

  const [response] = await db.insert(tripHostResponses).values({
    tripId,
    hostId: user.id,
    message: parsed.data.message,
  }).returning()

  return NextResponse.json({ success: true, data: response }, { status: 201 })
}
