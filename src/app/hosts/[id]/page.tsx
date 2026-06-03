import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Star, Globe, Clock, MessageCircle } from 'lucide-react'
import { BookSessionButton } from '@/components/booking/BookSessionButton'
import { formatCents, formatRating, getInitials } from '@/lib/utils'
import Link from 'next/link'

interface Props { params: { id: string } }

export default async function HostProfilePage({ params }: Props) {
  const isMock = process.env.MOCK_MODE === 'true'
  let host: any = null
  let photos: any[] = []
  let recentReviews: any[] = []
  let sessionUser: any = null

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const me = mockGetUser(token)
    if (me) sessionUser = { id: me.id, email: me.email, role: me.role as any, fullName: me.fullName, avatarUrl: null }

    // params.id can be either a host profile id (host-1) or a userId (user-host-1)
    const profile = mockDb.hostProfiles.get(params.id)
      ?? mockDb.getHostProfileByUserId(params.id)
    if (!profile || !profile.isActive) notFound()

    const city = mockDb.cities.get(profile.cityId)
    const hostUser = mockDb.getUserById(profile.userId)
    host = { ...profile, cityName: city?.name ?? '', flagEmoji: city?.flagEmoji ?? '', fullName: hostUser?.fullName ?? '', avatarUrl: profile.primaryPhotoUrl }

    recentReviews = Array.from(mockDb.reviews.values())
      .filter(r => r.revieweeId === profile.userId)
      .slice(0, 6)
      .map(r => ({ ...r, reviewerName: mockDb.getUserById(r.reviewerId)?.fullName ?? 'Traveler' }))
  } else {
    const { db } = await import('@/lib/db')
    const { hostProfiles, hostPhotos, users, cities, reviews } = await import('@/lib/db/schema')
    const { eq, and, desc } = await import('drizzle-orm')

    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) sessionUser = { id: authUser.id, email: authUser.email!, role: authUser.user_metadata?.role ?? 'traveler', fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }

    try {
      const [row] = await db.select({ id: hostProfiles.id, userId: hostProfiles.userId, cityId: hostProfiles.cityId, headline: hostProfiles.headline, bio: hostProfiles.bio, languages: hostProfiles.languages, categories: hostProfiles.categories, hostType: hostProfiles.hostType, hourlyRateCents: hostProfiles.hourlyRateCents, neighborhood: hostProfiles.neighborhood, avgRating: hostProfiles.avgRating, reviewCount: hostProfiles.reviewCount, responseRate: hostProfiles.responseRate, isPremium: hostProfiles.isPremium, cityName: cities.name, flagEmoji: cities.flagEmoji, fullName: users.fullName, avatarUrl: users.avatarUrl })
        .from(hostProfiles).leftJoin(users, eq(hostProfiles.userId, users.id)).leftJoin(cities, eq(hostProfiles.cityId, cities.id))
        .where(and(eq(hostProfiles.userId, params.id), eq(hostProfiles.isActive, true), eq(hostProfiles.moderationStatus, 'approved'))).limit(1)
      if (!row) notFound()
      host = row

      const [ph, rv] = await Promise.all([
        db.select().from(hostPhotos).where(eq(hostPhotos.hostId, host.id)).orderBy(hostPhotos.displayOrder),
        db.select({ id: reviews.id, rating: reviews.rating, body: reviews.body, createdAt: reviews.createdAt, reviewerName: users.fullName })
          .from(reviews).leftJoin(users, eq(reviews.reviewerId, users.id))
          .where(and(eq(reviews.revieweeId, host.userId), eq(reviews.isVisible, true))).orderBy(desc(reviews.createdAt)).limit(6),
      ])
      photos = ph
      recentReviews = rv
    } catch (err) {
      console.warn('[HostProfile] DB unavailable:', (err as Error).message)
      notFound()
    }
  }

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen bg-cream pt-[66px]">
        {/* Cover */}
        <div className="h-56 md:h-72 bg-gradient-to-br from-terra/70 via-terra to-amber-700 relative overflow-hidden">
          {photos[0]?.publicUrl && (
            <img src={photos[0].publicUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-11 -mt-16 relative z-10 pb-20">
          <div className="bg-white rounded-2xl shadow-lg border border-black/[0.08] p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center font-serif text-3xl font-bold text-white flex-shrink-0 -mt-16 md:mt-0 self-start">
                {photos[0]?.publicUrl ? (
                  <img src={photos[0].publicUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                ) : getInitials(host.fullName)}
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink">{host.fullName}</h1>
                    <p className="text-ink-muted text-sm mt-1">{host.flagEmoji} {host.cityName}{host.neighborhood ? ` · ${host.neighborhood}` : ''}</p>
                    {host.headline && <p className="text-ink-mid text-base mt-2">{host.headline}</p>}
                  </div>

                  {/* CTA */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    {sessionUser ? (
                      <>
                        <Link
                          href={`/conversations/new?hostId=${host.userId}`}
                          className="flex items-center gap-2 bg-terra text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-terra-dark transition-colors shadow-[0_2px_12px_rgba(197,90,40,0.28)]"
                        >
                          <MessageCircle size={16} />
                          Message {host.fullName?.split(' ')[0]}
                        </Link>
                        {host.hourlyRateCents && (
                          <BookSessionButton
                            hostUserId={host.userId}
                            hostName={host.fullName?.split(' ')[0] ?? 'Host'}
                            sessionRateCents={host.hourlyRateCents}
                          />
                        )}
                      </>
                    ) : (
                      <Link href="/auth/login" className="flex items-center gap-2 bg-terra text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-terra-dark transition-colors">
                        <MessageCircle size={16} /> Connect — subscribe from €6
                      </Link>
                    )}
                    {host.hourlyRateCents && sessionUser && (
                      <p className="text-center text-xs text-ink-muted">{formatCents(host.hourlyRateCents)}/hr</p>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-black/[0.07]">
                  {host.avgRating && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Star size={14} className="fill-amber-400 stroke-amber-400" />
                      <span className="font-semibold">{formatRating(host.avgRating)}</span>
                      <span className="text-ink-muted">({host.reviewCount} reviews)</span>
                    </div>
                  )}
                  {host.responseRate && (
                    <div className="flex items-center gap-1.5 text-sm text-ink-mid">
                      <Clock size={14} />
                      <span>{host.responseRate}% response rate</span>
                    </div>
                  )}
                  {host.isPremium && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                      ✓ Verified host
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left — bio + languages */}
            <div className="md:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                <h2 className="font-serif text-lg font-semibold mb-3">About {host.fullName?.split(' ')[0]}</h2>
                <p className="text-ink-soft text-sm leading-relaxed whitespace-pre-wrap">{host.bio}</p>
              </div>

              {/* Photos grid */}
              {photos.length > 1 && (
                <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                  <h2 className="font-serif text-lg font-semibold mb-3">Photos</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.slice(1, 7).map((p) => p.publicUrl && (
                      <img key={p.id} src={p.publicUrl} alt="" className="w-full aspect-square object-cover rounded-xl" />
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {recentReviews.length > 0 && (
                <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                  <h2 className="font-serif text-lg font-semibold mb-4">Reviews</h2>
                  <div className="space-y-4">
                    {recentReviews.map((r) => (
                      <div key={r.id} className="border-b border-black/[0.06] pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex">{Array.from({length:r.rating}).map((_,i)=><Star key={i} size={12} className="fill-amber-400 stroke-amber-400"/>)}</div>
                          <span className="text-sm font-medium text-ink">{r.reviewerName ?? 'Traveler'}</span>
                        </div>
                        {r.body && <p className="text-sm text-ink-soft leading-relaxed">{r.body}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — details sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-black/[0.08] p-5">
                <h3 className="text-xs font-semibold text-terra uppercase tracking-widest mb-3">Languages</h3>
                <div className="flex flex-wrap gap-1.5">
                  {host.languages.map((l: string) => (
                    <span key={l} className="px-3 py-1 rounded-full bg-sand text-xs font-medium text-ink-mid">{l.toUpperCase()}</span>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.08] p-5">
                <h3 className="text-xs font-semibold text-terra uppercase tracking-widest mb-3">Interests</h3>
                <div className="flex flex-wrap gap-1.5">
                  {host.categories.map((c: string) => (
                    <span key={c} className="px-3 py-1 rounded-full bg-terra-pale text-xs font-medium text-terra">{c.replace('-',' ')}</span>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.08] p-5">
                <h3 className="text-xs font-semibold text-terra uppercase tracking-widest mb-3">Host type</h3>
                <p className="text-sm text-ink-mid capitalize">{host.hostType === 'any' ? 'Open to all travelers' : host.hostType}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
