import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { WishlistGrid } from './WishlistGrid'

const GREEN = '#0F3D22'

export default async function WishlistsPage() {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser: any = null
  let hosts: any[] = []

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect('/auth/login?redirect=/wishlists')

    sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }

    const userWishlists = Array.from(mockDb.wishlists.values()).filter(w => w.userId === user.id)
    hosts = userWishlists.map(w => {
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
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/auth/login?redirect=/wishlists')

    sessionUser = { id: authUser.id, email: authUser.email!, role: (authUser.user_metadata?.role ?? 'traveler') as any, fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }

    try {
      const { db } = await import('@/lib/db')
      const { wishlists, hostProfiles, users, cities } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')

      hosts = await db.select({
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
        .where(eq(wishlists.userId, authUser.id))
    } catch (err) {
      console.warn('[Wishlists] DB unavailable:', (err as Error).message)
    }
  }

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px]" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="max-w-5xl mx-auto px-5 md:px-11 py-10">
          <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Saved hosts</h1>
          <p className="text-sm font-medium mb-8" style={{ color: '#4A7A5C' }}>
            Hosts you have saved for later. Click to view their profile.
          </p>

          {hosts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl" style={{ border: '1px solid rgba(15,61,34,0.10)' }}>
              <div className="text-5xl mb-4">❤️</div>
              <h3 className="font-serif text-xl font-bold mb-2" style={{ color: GREEN }}>No saved hosts yet</h3>
              <p className="text-sm font-medium mb-6" style={{ color: '#2D6B3F' }}>
                Browse hosts and tap the heart icon to save them here
              </p>
              <Link href="/search" className="inline-block px-6 py-3 rounded-full text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)' }}>
                Find a local host →
              </Link>
            </div>
          ) : (
            <WishlistGrid hosts={hosts} />
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
