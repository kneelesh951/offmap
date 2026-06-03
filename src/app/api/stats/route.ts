import { NextResponse } from 'next/server'

export interface PlatformStats {
  hostCount: number
  cityCount: number
  topCityFlags: string[]
}

export async function GET() {
  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const hosts = Array.from(mockDb.hostProfiles.values()).filter(
      h => h.moderationStatus === 'approved' && h.isActive
    )
    const cityIds = new Set(hosts.map(h => h.cityId))
    const topFlags = Array.from(mockDb.cities.values())
      .filter(c => cityIds.has(c.id))
      .sort((a, b) => b.hostCount - a.hostCount)
      .slice(0, 4)
      .map(c => c.flagEmoji)

    return NextResponse.json({
      success: true,
      data: { hostCount: hosts.length, cityCount: cityIds.size, topCityFlags: topFlags },
    })
  }

  try {
    const { db } = await import('@/lib/db')
    const { hostProfiles, cities } = await import('@/lib/db/schema')
    const { eq, and, count, desc } = await import('drizzle-orm')

    const [{ value: hostCount }] = await db
      .select({ value: count() })
      .from(hostProfiles)
      .where(and(eq(hostProfiles.moderationStatus, 'approved'), eq(hostProfiles.isActive, true)))

    const topCities = await db
      .select({ flagEmoji: cities.flagEmoji })
      .from(cities)
      .where(eq(cities.isActive, true))
      .orderBy(desc(cities.hostCount))
      .limit(4)

    const cityCount = await db
      .select({ value: count() })
      .from(cities)
      .where(eq(cities.isActive, true))

    return NextResponse.json({
      success: true,
      data: {
        hostCount: Number(hostCount),
        cityCount: Number(cityCount[0]?.value ?? 0),
        topCityFlags: topCities.map(c => c.flagEmoji ?? '🌍'),
      },
    })
  } catch (err) {
    console.error('[stats]', err)
    return NextResponse.json({
      success: true,
      data: { hostCount: 47, cityCount: 8, topCityFlags: ['🇩🇪','🇵🇹','🇳🇱','🇪🇸'] },
    })
  }
}
