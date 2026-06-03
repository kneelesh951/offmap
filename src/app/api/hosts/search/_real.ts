import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hostProfiles, hostPhotos, users, cities } from '@/lib/db/schema'
import { searchHostsSchema } from '@/lib/validators'
import { eq, and, sql, desc, arrayContains } from 'drizzle-orm'

export default async function handler(request: NextRequest) {
  try {
    const url    = new URL(request.url)
    const params = Object.fromEntries(url.searchParams)
    const parsed = searchHostsSchema.safeParse(params)
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid params' } }, { status: 422 })

    const { cityId, categories, languages, hostType, page, limit, sort } = parsed.data
    const offset = (page - 1) * limit

    const conditions = [eq(hostProfiles.isActive, true), eq(hostProfiles.moderationStatus, 'approved')]
    if (cityId)   conditions.push(eq(hostProfiles.cityId, cityId))
    if (hostType && hostType !== 'any') conditions.push(eq(hostProfiles.hostType, hostType as any))
    if (categories?.length) conditions.push(arrayContains(hostProfiles.categories, categories))
    if (languages?.length)  conditions.push(arrayContains(hostProfiles.languages,  languages))

    const orderBy = sort === 'newest' ? [desc(hostProfiles.createdAt)] : sort === 'rating' ? [desc(hostProfiles.avgRating)] : [desc(hostProfiles.isFeatured), desc(hostProfiles.avgRating)]

    const [results, countResult] = await Promise.all([
      db.select({ id: hostProfiles.id, userId: hostProfiles.userId, cityId: hostProfiles.cityId, cityName: cities.name, cityCountry: cities.country, flagEmoji: cities.flagEmoji, headline: hostProfiles.headline, bio: hostProfiles.bio, languages: hostProfiles.languages, categories: hostProfiles.categories, hostType: hostProfiles.hostType, hourlyRateCents: hostProfiles.hourlyRateCents, neighborhood: hostProfiles.neighborhood, avgRating: hostProfiles.avgRating, reviewCount: hostProfiles.reviewCount, responseRate: hostProfiles.responseRate, isPremium: hostProfiles.isPremium, isFeatured: hostProfiles.isFeatured, fullName: users.fullName, avatarUrl: users.avatarUrl })
        .from(hostProfiles).leftJoin(users, eq(hostProfiles.userId, users.id)).leftJoin(cities, eq(hostProfiles.cityId, cities.id))
        .where(and(...conditions)).orderBy(...orderBy).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(hostProfiles).where(and(...conditions)),
    ])

    const photos = results.length ? await db.select({ hostId: hostPhotos.hostId, publicUrl: hostPhotos.publicUrl }).from(hostPhotos).where(and(eq(hostPhotos.isPrimary, true), sql`${hostPhotos.hostId} = ANY(${results.map(r => r.id)})`)) : []
    const photoMap = Object.fromEntries(photos.map(p => [p.hostId, p.publicUrl]))
    return NextResponse.json({ success: true, data: results.map(h => ({ ...h, primaryPhotoUrl: photoMap[h.id] ?? null })), meta: { page, limit, total: countResult[0]?.count ?? 0 } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong' } }, { status: 500 })
  }
}
