import { NextRequest, NextResponse } from 'next/server'
import { searchHostsSchema } from '@/lib/validators'
import { cacheGet, cacheSet } from '@/lib/cache'
import { createHash } from 'crypto'

// Cache search results for 2 minutes.
// Invalidated when a host profile is updated (see /api/host/profile PATCH).
const SEARCH_TTL = 120

function searchCacheKey(params: object): string {
  const hash = createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16)
  return `search:${hash}`
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  // Object.fromEntries loses duplicate keys (e.g. languages=en&languages=de → only 'de').
  // Build the params object manually so array params become real arrays.
  const rawParams: Record<string, string | string[]> = {}
  const seenKeys = new Set<string>()
  url.searchParams.forEach((_, key) => {
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    const values = url.searchParams.getAll(key)
    rawParams[key] = values.length === 1 ? values[0] : values
  })
  const parsed = searchHostsSchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid params' } },
      { status: 422 }
    )
  }

  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const { hosts, total } = mockDb.searchHosts(parsed.data)
    return NextResponse.json({
      success: true,
      data: hosts,
      meta: { page: parsed.data.page, limit: parsed.data.limit, total },
    })
  }

  // ── Redis cache check ──────────────────────────────────────────────────────
  const cacheKey = searchCacheKey(parsed.data)
  const cached = await cacheGet(cacheKey)
  if (cached) {
    return NextResponse.json(JSON.parse(cached), {
      headers: { 'X-Cache': 'HIT' },
    })
  }

  // ── Production DB query ────────────────────────────────────────────────────
  const { db } = await import('@/lib/db')
  const { hostProfiles, hostPhotos, users, cities } = await import('@/lib/db/schema')
  const { eq, and, sql, desc, asc, gte, lte, inArray } = await import('drizzle-orm')

  const { cityId, categories, languages, hostType, minRateCents, maxRateCents, minRating, page, limit, sort, q } = parsed.data
  const offset = (page - 1) * limit

  const conditions: ReturnType<typeof eq>[] = [
    eq(hostProfiles.isActive, true),
    eq(hostProfiles.moderationStatus, 'approved'),
  ]
  if (cityId)                       conditions.push(eq(hostProfiles.cityId, cityId))
  if (hostType && hostType !== 'any') conditions.push(eq(hostProfiles.hostType, hostType as never))
  // Use && (overlap) so a host matching ANY selected category/language is returned, not ALL.
  if (categories?.length)           conditions.push(sql`${hostProfiles.categories} && ARRAY[${sql.join(categories.map(c => sql`${c}::text`), sql`, `)}]`)
  if (languages?.length)            conditions.push(sql`${hostProfiles.languages} && ARRAY[${sql.join(languages.map(l => sql`${l}::text`), sql`, `)}]`)
  if (minRateCents != null)         conditions.push(gte(hostProfiles.hourlyRateCents, minRateCents))
  if (maxRateCents != null)         conditions.push(lte(hostProfiles.hourlyRateCents, maxRateCents))
  if (minRating != null)            conditions.push(gte(sql`${hostProfiles.avgRating}::numeric`, minRating))
  if (q) conditions.push(sql`(${hostProfiles.bio} ILIKE ${'%' + q + '%'} OR ${hostProfiles.headline} ILIKE ${'%' + q + '%'})`)

  const orderBy =
    sort === 'newest'     ? [desc(hostProfiles.createdAt)]
    : sort === 'rating'   ? [desc(hostProfiles.avgRating)]
    : sort === 'price_asc'  ? [asc(hostProfiles.hourlyRateCents)]
    : sort === 'price_desc' ? [desc(hostProfiles.hourlyRateCents)]
    : [desc(hostProfiles.isFeatured), desc(hostProfiles.avgRating)]

  const [results, countResult] = await Promise.all([
    db.select({
      id: hostProfiles.id,
      userId: hostProfiles.userId,
      cityId: hostProfiles.cityId,
      cityName: cities.name,
      flagEmoji: cities.flagEmoji,
      headline: hostProfiles.headline,
      bio: hostProfiles.bio,
      languages: hostProfiles.languages,
      categories: hostProfiles.categories,
      hostType: hostProfiles.hostType,
      hourlyRateCents: hostProfiles.hourlyRateCents,
      neighborhood: hostProfiles.neighborhood,
      avgRating: hostProfiles.avgRating,
      reviewCount: hostProfiles.reviewCount,
      responseRate: hostProfiles.responseRate,
      isPremium: hostProfiles.isPremium,
      isFeatured: hostProfiles.isFeatured,
      idVerificationStatus: hostProfiles.idVerificationStatus,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
      .from(hostProfiles)
      .leftJoin(users, eq(hostProfiles.userId, users.id))
      .leftJoin(cities, eq(hostProfiles.cityId, cities.id))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(hostProfiles).where(and(...conditions)),
  ])

  const hostIds = results.map(r => r.id)
  const photos = hostIds.length
    ? await db
        .select({ hostId: hostPhotos.hostId, publicUrl: hostPhotos.publicUrl })
        .from(hostPhotos)
        .where(and(eq(hostPhotos.isPrimary, true), inArray(hostPhotos.hostId, hostIds)))
    : []
  const photoMap = Object.fromEntries(photos.map(p => [p.hostId, p.publicUrl]))

  const payload = {
    success: true,
    data: results.map(h => ({ ...h, primaryPhotoUrl: photoMap[h.id] ?? null })),
    meta: { page, limit, total: countResult[0]?.count ?? 0 },
  }

  // Write to cache (fire-and-forget — don't await, don't block response)
  cacheSet(cacheKey, JSON.stringify(payload), SEARCH_TTL).catch(() => {})

  return NextResponse.json(payload, { headers: { 'X-Cache': 'MISS' } })
}
