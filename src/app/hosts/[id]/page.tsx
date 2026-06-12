import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Star, Globe, Clock, MessageCircle, MapPin, Shield, ChevronRight, Users, Calendar, Compass, Coffee, Palette, Music, Landmark, TreePine, Utensils, ShoppingBag } from 'lucide-react'
import { BookSessionButton } from '@/components/booking/BookSessionButton'
import { formatCents, formatRating, getInitials } from '@/lib/utils'
import Link from 'next/link'

const TEAL = '#0C7B7B'
const TEAL_DARK = '#084E4E'
const TEAL_DEEP = '#063B3B'

/* Map category slugs to icons and friendly labels */
const CATEGORY_META: Record<string, { icon: any; label: string; description: string }> = {
  'food-drink': { icon: Utensils, label: 'Food & Drink', description: 'Local restaurants, street food, hidden bars' },
  'art-culture': { icon: Palette, label: 'Art & Culture', description: 'Galleries, street art, cultural gems' },
  'nightlife': { icon: Music, label: 'Nightlife', description: 'Best bars, clubs, live music scenes' },
  'history': { icon: Landmark, label: 'History', description: 'Stories behind the streets and landmarks' },
  'nature': { icon: TreePine, label: 'Nature', description: 'Parks, hikes, outdoor escapes nearby' },
  'shopping': { icon: ShoppingBag, label: 'Shopping', description: 'Local boutiques, markets, vintage finds' },
  'adventure': { icon: Compass, label: 'Adventure', description: 'Off-the-beaten-path experiences' },
  'coffee': { icon: Coffee, label: 'Coffee & Cafes', description: 'Best coffee spots and cozy cafes' },
}

/* Map host type to a friendly description */
function hostTypeLabel(type: string): string {
  switch (type) {
    case 'female': return 'Female host'
    case 'male': return 'Male host'
    case 'couple': return 'Couple'
    case 'family': return 'Family'
    case 'group': return 'Group of friends'
    default: return 'Open to all travelers'
  }
}

/* Full language name lookup */
const LANG_NAMES: Record<string, string> = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', pt: 'Portuguese',
  it: 'Italian', nl: 'Dutch', ar: 'Arabic', tr: 'Turkish', ru: 'Russian',
  ja: 'Japanese', zh: 'Chinese', ko: 'Korean', sv: 'Swedish', pl: 'Polish',
  cs: 'Czech', el: 'Greek', hi: 'Hindi', he: 'Hebrew', th: 'Thai',
}

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

    const profile = mockDb.hostProfiles.get(params.id)
      ?? mockDb.getHostProfileByUserId(params.id)
    if (!profile || !profile.isActive) notFound()

    const city = mockDb.cities.get(profile.cityId)
    const hostUser = mockDb.getUserById(profile.userId)
    host = { ...profile, cityName: city?.name ?? '', flagEmoji: city?.flagEmoji ?? '', fullName: hostUser?.fullName ?? '', avatarUrl: profile.primaryPhotoUrl, idVerificationStatus: profile.idVerificationStatus, introVideoUrl: profile.introVideoUrl }

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
      const [row] = await db.select({ id: hostProfiles.id, userId: hostProfiles.userId, cityId: hostProfiles.cityId, headline: hostProfiles.headline, bio: hostProfiles.bio, languages: hostProfiles.languages, categories: hostProfiles.categories, hostType: hostProfiles.hostType, hourlyRateCents: hostProfiles.hourlyRateCents, neighborhood: hostProfiles.neighborhood, avgRating: hostProfiles.avgRating, reviewCount: hostProfiles.reviewCount, responseRate: hostProfiles.responseRate, isPremium: hostProfiles.isPremium, idVerificationStatus: hostProfiles.idVerificationStatus, introVideoUrl: hostProfiles.introVideoUrl, cityName: cities.name, flagEmoji: cities.flagEmoji, fullName: users.fullName, avatarUrl: users.avatarUrl })
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

  const firstName = host.fullName?.split(' ')[0] ?? 'Host'
  const heroPhoto = host.avatarUrl ?? host.primaryPhotoUrl ?? null

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen bg-cream pt-[66px]">
        {/* ═══════ HERO SECTION ═══════ */}
        <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
          {/* Background — large host photo or city gradient */}
          {heroPhoto ? (
            <img
              src={heroPhoto.replace('w=400', 'w=1400').replace('h=300', 'h=600')}
              alt={host.fullName}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${TEAL_DEEP} 0%, ${TEAL} 50%, ${TEAL_DARK} 100%)` }} />
          )}
          {/* Overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,45,45,0.3) 0%, rgba(4,45,45,0.55) 50%, rgba(4,45,45,0.85) 100%)' }} />
          {/* Glossy sheen */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%)' }} />

          {/* Hero content */}
          <div className="relative max-w-5xl mx-auto px-5 md:px-11 pt-16 pb-10 flex flex-col md:flex-row items-end md:items-end gap-6" style={{ minHeight: '420px' }}>
            {/* Profile photo */}
            <div className="flex-shrink-0 -mb-14 md:-mb-16 z-10">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-white shadow-xl" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                {heroPhoto ? (
                  <img src={heroPhoto} alt={host.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif text-4xl font-bold text-white" style={{ background: `linear-gradient(135deg, #E8621A, #F5A623)` }}>
                    {getInitials(host.fullName)}
                  </div>
                )}
              </div>
            </div>

            {/* Name & headline overlay */}
            <div className="flex-1 pb-2">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-1" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                {host.fullName}
              </h1>
              <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                <MapPin size={14} />
                <span>{host.flagEmoji} {host.cityName}{host.neighborhood ? ` · ${host.neighborhood}` : ''}</span>
              </div>
              {host.headline && (
                <p className="text-white/85 text-base md:text-lg font-medium max-w-xl" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  {host.headline}
                </p>
              )}
            </div>

            {/* Price badge */}
            {host.hourlyRateCents && (
              <div className="flex-shrink-0 text-right pb-2">
                <div className="inline-flex items-baseline gap-1 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.20)' }}>
                  <span className="text-2xl font-bold text-white">{formatCents(host.hourlyRateCents)}</span>
                  <span className="text-white/60 text-sm">/hr</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ MAIN CONTENT ═══════ */}
        <div className="max-w-5xl mx-auto px-5 md:px-11 pt-20 md:pt-24 pb-20">

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {host.avgRating && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ background: '#FFF8E1', border: '1px solid rgba(245,166,35,0.25)' }}>
                <Star size={15} className="fill-amber-400 stroke-amber-400" />
                <span className="font-bold text-sm" style={{ color: TEAL_DARK }}>{formatRating(host.avgRating)}</span>
                <span className="text-xs" style={{ color: 'rgba(8,78,78,0.5)' }}>({host.reviewCount} reviews)</span>
              </div>
            )}
            {host.responseRate && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ background: '#E0F2F2', border: '1px solid rgba(12,123,123,0.15)' }}>
                <Clock size={14} style={{ color: TEAL }} />
                <span className="text-sm font-semibold" style={{ color: TEAL_DARK }}>{host.responseRate}% response</span>
              </div>
            )}
            {(host.idVerificationStatus === 'verified' || host.isPremium) && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ background: '#FEF9E7', border: '1px solid rgba(212,175,55,0.30)' }}>
                <Shield size={14} style={{ color: '#B8860B' }} />
                <span className="text-sm font-semibold" style={{ color: '#8B6914' }}>ID Verified</span>
              </div>
            )}
            {host.languages && (
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-full" style={{ background: '#E0F2F2', border: '1px solid rgba(12,123,123,0.15)' }}>
                <Globe size={14} style={{ color: TEAL }} />
                <span className="text-sm font-semibold" style={{ color: TEAL_DARK }}>{host.languages.map((l: string) => l.toUpperCase()).join(' · ')}</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* ── LEFT COLUMN (2/3) ── */}
            <div className="md:col-span-2 space-y-8">
              {/* Intro Video */}
              {host.introVideoUrl && !host.introVideoUrl.startsWith('mock://') && (
                <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                  <video
                    src={host.introVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[400px] object-cover"
                    style={{ background: '#000' }}
                  />
                  <div className="px-5 py-3">
                    <p className="text-[13px] font-semibold" style={{ color: TEAL_DARK }}>📹 {firstName}&apos;s intro</p>
                  </div>
                </div>
              )}

              {/* About */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-7" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                <h2 className="font-serif text-xl font-bold mb-4" style={{ color: TEAL_DARK }}>About {firstName}</h2>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(8,78,78,0.7)' }}>{host.bio}</p>
              </div>

              {/* What I can show you — derived from categories */}
              {host.categories?.length > 0 && (
                <div className="bg-white rounded-2xl border border-black/[0.06] p-7" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                  <h2 className="font-serif text-xl font-bold mb-5" style={{ color: TEAL_DARK }}>What {firstName} can show you</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {host.categories.map((cat: string) => {
                      const meta = CATEGORY_META[cat] ?? { icon: Compass, label: cat.replace('-', ' '), description: 'Local experiences' }
                      const Icon = meta.icon
                      return (
                        <div key={cat} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#F0FAFA', border: '1px solid rgba(12,123,123,0.10)' }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(12,123,123,0.12)' }}>
                            <Icon size={20} style={{ color: TEAL }} />
                          </div>
                          <div>
                            <div className="text-sm font-bold capitalize" style={{ color: TEAL_DARK }}>{meta.label}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'rgba(8,78,78,0.5)' }}>{meta.description}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quick facts — all from host registration data */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-7" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                <h2 className="font-serif text-xl font-bold mb-5" style={{ color: TEAL_DARK }}>Quick facts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Location */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFF8E1' }}>
                      <MapPin size={18} style={{ color: '#D97706' }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(8,78,78,0.4)' }}>Based in</div>
                      <div className="text-sm font-bold" style={{ color: TEAL_DARK }}>{host.flagEmoji} {host.cityName}{host.neighborhood ? `, ${host.neighborhood}` : ''}</div>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#E0F2F2' }}>
                      <Globe size={18} style={{ color: TEAL }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(8,78,78,0.4)' }}>Speaks</div>
                      <div className="text-sm font-bold" style={{ color: TEAL_DARK }}>
                        {host.languages.map((l: string) => LANG_NAMES[l] ?? l.toUpperCase()).join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Host type */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F0FAFA' }}>
                      <Users size={18} style={{ color: TEAL }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(8,78,78,0.4)' }}>Host type</div>
                      <div className="text-sm font-bold" style={{ color: TEAL_DARK }}>{hostTypeLabel(host.hostType)}</div>
                    </div>
                  </div>

                  {/* Member since */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFF0E8' }}>
                      <Calendar size={18} style={{ color: '#E8621A' }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(8,78,78,0.4)' }}>Member since</div>
                      <div className="text-sm font-bold" style={{ color: TEAL_DARK }}>
                        {new Date(host.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Response rate */}
                  {host.responseRate && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#E8F5E9' }}>
                        <Clock size={18} style={{ color: '#2E7D32' }} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(8,78,78,0.4)' }}>Response rate</div>
                        <div className="text-sm font-bold" style={{ color: TEAL_DARK }}>{host.responseRate}%</div>
                      </div>
                    </div>
                  )}

                  {/* Hourly rate */}
                  {host.hourlyRateCents && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFF8E1' }}>
                        <span className="text-base font-bold" style={{ color: '#D97706' }}>€</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(8,78,78,0.4)' }}>Session rate</div>
                        <div className="text-sm font-bold" style={{ color: TEAL_DARK }}>{formatCents(host.hourlyRateCents)} per hour</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo gallery — shown only when host uploads real photos (production) */}
              {photos.length > 0 && (
                <div className="bg-white rounded-2xl border border-black/[0.06] p-7" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                  <h2 className="font-serif text-xl font-bold mb-4" style={{ color: TEAL_DARK }}>Photos</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.slice(0, 6).map((p) => p.publicUrl && (
                      <div key={p.id} className="rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(8,78,78,0.08)' }}>
                        <img src={p.publicUrl} alt="" className="w-full aspect-[4/3] object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {recentReviews.length > 0 && (
                <div className="bg-white rounded-2xl border border-black/[0.06] p-7" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                  <h2 className="font-serif text-xl font-bold mb-5" style={{ color: TEAL_DARK }}>What travelers say</h2>
                  <div className="space-y-5">
                    {recentReviews.map((r) => (
                      <div key={r.id} className="pb-5 last:pb-0" style={{ borderBottom: '1px solid rgba(8,78,78,0.06)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})` }}>
                              {(r.reviewerName ?? 'T')[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold" style={{ color: TEAL_DARK }}>{r.reviewerName ?? 'Traveler'}</span>
                          </div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={13} className="fill-amber-400 stroke-amber-400" />)}
                          </div>
                        </div>
                        {r.body && <p className="text-sm leading-relaxed" style={{ color: 'rgba(8,78,78,0.65)' }}>{r.body}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN (1/3) — Sticky sidebar ── */}
            <div className="space-y-5">
              {/* Action card */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-6 sticky top-[90px]" style={{ boxShadow: '0 4px 20px rgba(8,78,78,0.08)' }}>
                {host.hourlyRateCents && (
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold" style={{ color: TEAL_DARK }}>{formatCents(host.hourlyRateCents)}</span>
                    <span className="text-sm" style={{ color: 'rgba(8,78,78,0.45)' }}>per hour</span>
                  </div>
                )}
                <div className="flex flex-col gap-2.5 mb-5">
                  {sessionUser ? (
                    <>
                      <Link
                        href={`/conversations/new?hostId=${host.userId}`}
                        className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:-translate-y-0.5"
                        style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, boxShadow: `0 4px 16px rgba(12,123,123,0.35)` }}
                      >
                        <MessageCircle size={16} />
                        Message {firstName}
                      </Link>
                      {host.hourlyRateCents && (
                        <BookSessionButton
                          hostUserId={host.userId}
                          hostName={firstName}
                          sessionRateCents={host.hourlyRateCents}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/auth/login?redirect=/hosts/${params.id}`}
                        className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:-translate-y-0.5"
                        style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, boxShadow: `0 4px 16px rgba(12,123,123,0.35)` }}
                      >
                        <MessageCircle size={16} />
                        Message {firstName}
                      </Link>
                      <Link
                        href={`/auth/login?redirect=/hosts/${params.id}`}
                        className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, #E8621A, #F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.35)' }}
                      >
                        Book a session
                        <ChevronRight size={15} />
                      </Link>
                      <p className="text-center text-xs" style={{ color: 'rgba(8,78,78,0.4)' }}>
                        Log in to message or book — subscribe from €6
                      </p>
                    </>
                  )}
                </div>

                {/* Quick info */}
                <div className="pt-4" style={{ borderTop: '1px solid rgba(8,78,78,0.08)' }}>
                  <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'rgba(8,78,78,0.55)' }}>
                    <Shield size={13} />
                    <span>Safety verified meeting spots</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(8,78,78,0.55)' }}>
                    <Clock size={13} />
                    <span>Usually responds within 2 hours</span>
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-6" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: TEAL }}>Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {host.categories.map((c: string) => (
                    <span key={c} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#E0F2F2', color: TEAL_DARK, border: '1px solid rgba(12,123,123,0.12)' }}>
                      {c.replace('-', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Host type */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-6" style={{ boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: TEAL }}>Host type</h3>
                <p className="text-sm font-medium capitalize" style={{ color: TEAL_DARK }}>{host.hostType === 'any' ? 'Open to all travelers' : host.hostType}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
