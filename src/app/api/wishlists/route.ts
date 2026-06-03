import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ hostId: z.string().min(1) })

export async function GET(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const userWishlists = Array.from(mockDb.wishlists.values()).filter(w => w.userId === user.id)
    const hosts = userWishlists.map(w => {
      const profile = mockDb.hostProfiles.get(w.hostId)
      if (!profile) return null
      const hostUser = mockDb.getUserById(profile.userId)
      const city = mockDb.cities.get(profile.cityId)
      return {
        hostId: profile.id,
        userId: profile.userId,
        fullName: hostUser?.fullName ?? 'Host',
        headline: profile.headline,
        primaryPhotoUrl: profile.primaryPhotoUrl,
        cityName: city?.name ?? '',
        flagEmoji: city?.flagEmoji ?? '',
        avgRating: profile.avgRating,
        reviewCount: profile.reviewCount,
        hourlyRateCents: profile.hourlyRateCents,
        languages: profile.languages,
        categories: profile.categories,
        neighborhood: profile.neighborhood,
      }
    }).filter(Boolean)

    return NextResponse.json({ success: true, data: { hosts } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { wishlists, hostProfiles, users, cities } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const rows = await db.select({
    hostId: hostProfiles.id,
    userId: hostProfiles.userId,
    fullName: users.fullName,
    headline: hostProfiles.headline,
    cityName: cities.name,
    flagEmoji: cities.flagEmoji,
    avgRating: hostProfiles.avgRating,
    reviewCount: hostProfiles.reviewCount,
    hourlyRateCents: hostProfiles.hourlyRateCents,
    languages: hostProfiles.languages,
    categories: hostProfiles.categories,
    neighborhood: hostProfiles.neighborhood,
  })
    .from(wishlists)
    .innerJoin(hostProfiles, eq(wishlists.hostId, hostProfiles.id))
    .innerJoin(users, eq(hostProfiles.userId, users.id))
    .innerJoin(cities, eq(hostProfiles.cityId, cities.id))
    .where(eq(wishlists.userId, user.id))

  return NextResponse.json({ success: true, data: { hosts: rows } })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid host ID' } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const key = `${user.id}:${parsed.data.hostId}`
    mockDb.wishlists.set(key, { userId: user.id, hostId: parsed.data.hostId })
    return NextResponse.json({ success: true, data: { wishlisted: true } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { wishlists } = await import('@/lib/db/schema')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  await db.insert(wishlists).values({ userId: user.id, hostId: parsed.data.hostId }).onConflictDoNothing()
  return NextResponse.json({ success: true, data: { wishlisted: true } })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid host ID' } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const key = `${user.id}:${parsed.data.hostId}`
    mockDb.wishlists.delete(key)
    return NextResponse.json({ success: true, data: { wishlisted: false } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { wishlists } = await import('@/lib/db/schema')
  const { eq, and } = await import('drizzle-orm')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  await db.delete(wishlists).where(and(eq(wishlists.userId, user.id), eq(wishlists.hostId, parsed.data.hostId)))
  return NextResponse.json({ success: true, data: { wishlisted: false } })
}
