import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const profile = mockDb.hostProfiles.get(params.id)
      ?? mockDb.getHostProfileByUserId(params.id)
    if (!profile || !profile.isActive || profile.moderationStatus !== 'approved') {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } }, { status: 404 })
    }
    const city = mockDb.cities.get(profile.cityId)
    const hostUser = mockDb.getUserById(profile.userId)
    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        fullName: hostUser?.fullName ?? '',
        cityName: city?.name ?? '',
        flagEmoji: city?.flagEmoji ?? '',
      },
    })
  }

  const { db } = await import('@/lib/db')
  const { hostProfiles, users, cities } = await import('@/lib/db/schema')
  const { eq, and } = await import('drizzle-orm')

  const [host] = await db
    .select({ id: hostProfiles.id, userId: hostProfiles.userId, headline: hostProfiles.headline, bio: hostProfiles.bio, languages: hostProfiles.languages, categories: hostProfiles.categories, hostType: hostProfiles.hostType, hourlyRateCents: hostProfiles.hourlyRateCents, avgRating: hostProfiles.avgRating, reviewCount: hostProfiles.reviewCount, isPremium: hostProfiles.isPremium, fullName: users.fullName, cityName: cities.name, flagEmoji: cities.flagEmoji })
    .from(hostProfiles).leftJoin(users, eq(hostProfiles.userId, users.id)).leftJoin(cities, eq(hostProfiles.cityId, cities.id))
    .where(and(eq(hostProfiles.userId, params.id), eq(hostProfiles.isActive, true), eq(hostProfiles.moderationStatus, 'approved'))).limit(1)

  if (!host) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } }, { status: 404 })
  return NextResponse.json({ success: true, data: host })
}
