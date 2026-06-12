import { cookies } from 'next/headers'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HomeClient } from '@/components/home/HomeClient'

const GREEN = '#009B4D'

export default async function HomePage() {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser = null as any
  let featuredHosts: any[] = []

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (user) sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }
    const { hosts } = mockDb.searchHosts({ sort: 'featured', limit: 6, page: 1 })
    featuredHosts = hosts
  } else {
    try {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server')
      const supabase = createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) sessionUser = { id: user.id, email: user.email!, role: (user.user_metadata?.role ?? 'traveler') as any, fullName: user.user_metadata?.full_name ?? null, avatarUrl: null }
    } catch { /* no session */ }

    try {
      const { db } = await import('@/lib/db')
      const { hostProfiles, users, cities, hostPhotos } = await import('@/lib/db/schema')
      const { eq, and, desc, inArray } = await import('drizzle-orm')
      const rows = await db
        .select({
          id: hostProfiles.id,
          fullName: users.fullName,
          cityName: cities.name,
          flagEmoji: cities.flagEmoji,
          languages: hostProfiles.languages,
          categories: hostProfiles.categories,
          hourlyRateCents: hostProfiles.hourlyRateCents,
          avgRating: hostProfiles.avgRating,
          reviewCount: hostProfiles.reviewCount,
          isFeatured: hostProfiles.isFeatured,
        })
        .from(hostProfiles)
        .leftJoin(users, eq(hostProfiles.userId, users.id))
        .leftJoin(cities, eq(hostProfiles.cityId, cities.id))
        .where(and(eq(hostProfiles.isActive, true), eq(hostProfiles.moderationStatus, 'approved')))
        .orderBy(desc(hostProfiles.isFeatured), desc(hostProfiles.avgRating))
        .limit(6)
      const hostIds: string[] = rows.map(r => r.id)
      const photos = hostIds.length
        ? await db.select({ hostId: hostPhotos.hostId, publicUrl: hostPhotos.publicUrl })
            .from(hostPhotos)
            .where(and(eq(hostPhotos.isPrimary, true), inArray(hostPhotos.hostId, hostIds)))
        : []
      const photoMap: Record<string, string | null> = Object.fromEntries(photos.map(p => [p.hostId, p.publicUrl ?? null]))
      featuredHosts = rows.map(h => ({ ...h, primaryPhotoUrl: photoMap[h.id] ?? null }))
    } catch { /* fail silently — carousel uses hardcoded fallback */ }
  }

  return (
    <>
      <Navbar user={sessionUser} />
      <HomeClient sessionUser={sessionUser} featuredHosts={featuredHosts} />
      <Footer />
    </>
  )
}
