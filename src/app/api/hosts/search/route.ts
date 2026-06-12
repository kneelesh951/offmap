import { NextRequest, NextResponse } from 'next/server'
import { searchHostsSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams)
  const parsed = searchHostsSchema.safeParse(params)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid params' } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const { hosts, total } = mockDb.searchHosts(parsed.data)
    return NextResponse.json({ success: true, data: hosts, meta: { page: parsed.data.page, limit: parsed.data.limit, total } })
  }

  // Production DB query
  const { db } = await import('@/lib/db')
  const { hostProfiles, hostPhotos, users, cities } = await import('@/lib/db/schema')
  const { eq, and, sql, desc, asc, gte, lte, arrayContains, inArray } = await import('drizzle-orm')
  const { cityId, categories, languages, hostType, minRateCents, maxRateCents, minRating, page, limit, sort } = parsed.data
  const offset = (page - 1) * limit
  const conditions: any[] = [eq(hostProfiles.isActive, true), eq(hostProfiles.moderationStatus, 'approved')]
  if (cityId) conditions.push(eq(hostProfiles.cityId, cityId))
  if (hostType && hostType !== 'any') conditions.push(eq(hostProfiles.hostType, hostType as any))
  if (categories?.length) conditions.push(arrayContains(hostProfiles.categories, categories))
  if (languages?.length) conditions.push(arrayContains(hostProfiles.languages, languages))
  if (minRateCents != null) conditions.push(gte(hostProfiles.hourlyRateCents, minRateCents))
  if (maxRateCents != null) conditions.push(lte(hostProfiles.hourlyRateCents, maxRateCents))
  if (minRating != null) conditions.push(gte(sql`${hostProfiles.avgRating}::numeric`, minRating))
  const orderBy = sort === 'newest' ? [desc(hostProfiles.createdAt)]
    : sort === 'rating' ? [desc(hostProfiles.avgRating)]
    : sort === 'price_asc' ? [asc(hostProfiles.hourlyRateCents)]
    : sort === 'price_desc' ? [desc(hostProfiles.hourlyRateCents)]
    : [desc(hostProfiles.isFeatured), desc(hostProfiles.avgRating)]
  const [results, countResult] = await Promise.all([
    db.select({ id: hostProfiles.id, userId: hostProfiles.userId, cityId: hostProfiles.cityId, cityName: cities.name, flagEmoji: cities.flagEmoji, headline: hostProfiles.headline, bio: hostProfiles.bio, languages: hostProfiles.languages, categories: hostProfiles.categories, hostType: hostProfiles.hostType, hourlyRateCents: hostProfiles.hourlyRateCents, neighborhood: hostProfiles.neighborhood, avgRating: hostProfiles.avgRating, reviewCount: hostProfiles.reviewCount, responseRate: hostProfiles.responseRate, isPremium: hostProfiles.isPremium, isFeatured: hostProfiles.isFeatured, idVerificationStatus: hostProfiles.idVerificationStatus, fullName: users.fullName, avatarUrl: users.avatarUrl })
      .from(hostProfiles).leftJoin(users, eq(hostProfiles.userId, users.id)).leftJoin(cities, eq(hostProfiles.cityId, cities.id))
      .where(and(...conditions)).orderBy(...orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(hostProfiles).where(and(...conditions)),
  ])
  const hostIds = results.map(r => r.id)
  const photos = hostIds.length ? await db.select({ hostId: hostPhotos.hostId, publicUrl: hostPhotos.publicUrl }).from(hostPhotos).where(and(eq(hostPhotos.isPrimary, true), inArray(hostPhotos.hostId, hostIds))) : []
  const photoMap = Object.fromEntries(photos.map(p => [p.hostId, p.publicUrl]))
  return NextResponse.json({ success: true, data: results.map(h => ({ ...h, primaryPhotoUrl: photoMap[h.id] ?? null })), meta: { page, limit, total: countResult[0]?.count ?? 0 } })
}
