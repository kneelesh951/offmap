import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { TripResponsesList } from './TripResponsesList'
import Link from 'next/link'

const GREEN = '#084E4E'

const CATEGORY_LABELS: Record<string, string> = {
  'food-drink': '🍴 Food & Drink', 'art-culture': '🎨 Art & Culture', 'nature': '🌿 Nature',
  'nightlife': '🌙 Nightlife', 'history': '🏛️ History', 'family': '👨‍👩‍👧 Family',
}

const HOST_TYPE_LABELS: Record<string, string> = {
  any: 'Any', male: 'Male', female: 'Female', couple: 'Couple', family: 'Family', group: 'Group',
}

interface Props { params: { id: string } }

export default async function TripDetailPage({ params }: Props) {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser: any = null
  let trip: any = null
  let responses: any[] = []
  let hasSubscription = false

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect(`/auth/login?redirect=/trips/${params.id}`)

    const t = mockDb.tripRequests.get(params.id)
    if (!t) notFound()

    // Travelers can only see their own trips
    if (user.role === 'traveler' && t.travelerId !== user.id) notFound()

    const city = mockDb.cities.get(t.cityId)
    trip = { ...t, cityName: city?.name ?? '', flagEmoji: city?.flagEmoji ?? '' }

    // Get host responses with profile data
    responses = Array.from(mockDb.tripHostResponses.values())
      .filter(r => r.tripId === params.id)
      .map(r => {
        const hostUser = mockDb.getUserById(r.hostId)
        const hostProfile = mockDb.getHostProfileByUserId(r.hostId)
        return {
          id: r.id,
          hostId: r.hostId,
          message: r.message,
          status: r.status,
          createdAt: r.createdAt,
          hostName: hostUser?.fullName ?? 'Host',
          hostHeadline: hostProfile?.headline ?? '',
          hostAvgRating: hostProfile?.avgRating ?? '0',
          hostReviewCount: hostProfile?.reviewCount ?? 0,
          hostCategories: hostProfile?.categories ?? [],
          hostNeighborhood: hostProfile?.neighborhood ?? '',
          hostLanguages: hostProfile?.languages ?? [],
        }
      })

    const activeSub = mockDb.getActiveSubscription(user.id)
    hasSubscription = !!activeSub

    sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const { db } = await import('@/lib/db')
    const { tripRequests, tripHostResponses, users, cities, hostProfiles, subscriptions } = await import('@/lib/db/schema')
    const { eq, and, gte } = await import('drizzle-orm')

    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect(`/auth/login?redirect=/trips/${params.id}`)

    const [row] = await db
      .select({ trip: tripRequests, cityName: cities.name, flagEmoji: cities.flagEmoji })
      .from(tripRequests)
      .leftJoin(cities, eq(tripRequests.cityId, cities.id))
      .where(eq(tripRequests.id, params.id))
      .limit(1)

    if (!row) notFound()

    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, authUser.id)).limit(1)
    if (dbUser?.role === 'traveler' && row.trip.travelerId !== authUser.id) notFound()

    trip = { ...row.trip, cityName: row.cityName, flagEmoji: row.flagEmoji }

    const respRows = await db
      .select({
        response: tripHostResponses,
        hostName: users.fullName,
        hostHeadline: hostProfiles.headline,
        hostAvgRating: hostProfiles.avgRating,
        hostReviewCount: hostProfiles.reviewCount,
        hostCategories: hostProfiles.categories,
        hostNeighborhood: hostProfiles.neighborhood,
        hostLanguages: hostProfiles.languages,
      })
      .from(tripHostResponses)
      .leftJoin(users, eq(tripHostResponses.hostId, users.id))
      .leftJoin(hostProfiles, eq(tripHostResponses.hostId, hostProfiles.userId))
      .where(eq(tripHostResponses.tripId, params.id))

    responses = respRows.map(r => ({
      id: r.response.id,
      hostId: r.response.hostId,
      message: r.response.message,
      status: r.response.status,
      createdAt: r.response.createdAt?.toISOString() ?? '',
      hostName: r.hostName ?? 'Host',
      hostHeadline: r.hostHeadline ?? '',
      hostAvgRating: r.hostAvgRating ?? '0',
      hostReviewCount: r.hostReviewCount ?? 0,
      hostCategories: r.hostCategories ?? [],
      hostNeighborhood: r.hostNeighborhood ?? '',
      hostLanguages: r.hostLanguages ?? [],
    }))

    const now = new Date()
    const [activeSub] = await db.select({ id: subscriptions.id }).from(subscriptions)
      .where(and(eq(subscriptions.userId, authUser.id), eq(subscriptions.status, 'active'), gte(subscriptions.currentPeriodEnd, now)))
      .limit(1)
    hasSubscription = !!activeSub

    sessionUser = { id: authUser.id, email: authUser.email!, role: (dbUser?.role ?? 'traveler') as any, fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const arrivalDate = typeof trip.arrivalDate === 'string' ? trip.arrivalDate : trip.arrivalDate?.toISOString?.() ?? ''
  const departureDate = typeof trip.departureDate === 'string' ? trip.departureDate : trip.departureDate?.toISOString?.() ?? ''

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px]" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="max-w-3xl mx-auto px-5 md:px-11 py-10">

          {/* Back link */}
          <Link href="/trips" className="text-sm font-semibold mb-6 inline-flex items-center gap-1.5" style={{ color: GREEN, textDecoration: 'none' }}>
            ← Back to My Trips
          </Link>

          {/* Trip header card */}
          <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid rgba(8,78,78,0.10)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{trip.flagEmoji}</span>
              <div>
                <h1 className="font-serif text-2xl font-bold" style={{ color: GREEN }}>{trip.cityName}</h1>
                <p className="text-sm" style={{ color: '#4A8E8E' }}>
                  {fmt(arrivalDate)} → {fmt(departureDate)} · {trip.numTravelers} traveler{trip.numTravelers > 1 ? 's' : ''}
                </p>
              </div>
              <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: trip.status === 'open' ? '#dcfce7' : '#f3f4f6', color: trip.status === 'open' ? '#15803d' : '#6b7280' }}>
                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
              </span>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(trip.categories as string[]).map((c: string) => (
                <span key={c} className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
                  {CATEGORY_LABELS[c] ?? c}
                </span>
              ))}
              {trip.hostTypePreference && trip.hostTypePreference !== 'any' && (
                <span className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                  Prefers: {HOST_TYPE_LABELS[trip.hostTypePreference as string] ?? trip.hostTypePreference}
                </span>
              )}
            </div>

            {/* Note */}
            {trip.noteToHosts && (
              <div className="rounded-xl p-4 text-sm leading-relaxed"
                style={{ backgroundColor: '#FAF7F2', borderLeft: '3px solid #E8621A', color: '#374151' }}>
                {trip.noteToHosts}
              </div>
            )}
          </div>

          {/* Responses section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold" style={{ color: GREEN }}>
              Host responses {responses.length > 0 && <span className="text-base font-normal" style={{ color: '#6EA880' }}>({responses.length})</span>}
            </h2>
          </div>

          {responses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl" style={{ border: '1px solid rgba(8,78,78,0.10)' }}>
              <div className="text-4xl mb-4">⏳</div>
              <h3 className="font-serif text-lg font-bold mb-2" style={{ color: GREEN }}>No responses yet</h3>
              <p className="text-sm" style={{ color: '#4A8E8E' }}>
                Verified hosts in {trip.cityName} will see your trip and reach out. This usually takes 24–48 hours.
              </p>
            </div>
          ) : (
            <TripResponsesList
              responses={responses}
              tripId={params.id}
              hasSubscription={hasSubscription}
            />
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}
