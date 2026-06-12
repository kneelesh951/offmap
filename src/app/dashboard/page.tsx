import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { BookingCard } from '@/components/booking/BookingCard'

const GREEN = '#084E4E'
const TERRA = '#E8621A'

export default async function TravelerDashboard() {
  const isMock = process.env.MOCK_MODE === 'true'

  let sessionUser: any = null
  let sub: { plan: string; expiresAt: string | null } | null = null
  let convCount = 0
  let wishCount = 0
  let tripCount = 0
  let recentBookings: any[] = []
  let hostCount = 47
  let cityCount = 8

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect('/auth/login?redirect=/dashboard')

    const activeSub = mockDb.getActiveSubscription(user.id)
    convCount = Array.from(mockDb.conversations.values()).filter(c => c.travelerId === user.id).length
    wishCount = Array.from(mockDb.wishlists.values()).filter(w => w.userId === user.id).length
    tripCount = Array.from(mockDb.tripRequests.values()).filter(t => t.travelerId === user.id).length
    recentBookings = mockDb.getBookingsByTraveler(user.id).slice(0, 5).map(b => ({
      ...b,
      hostName: mockDb.getUserById(b.hostId)?.fullName ?? 'Host',
    }))
    sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }
    sub = activeSub ? { plan: activeSub.plan, expiresAt: activeSub.currentPeriodEnd } : null

    hostCount = Array.from(mockDb.hostProfiles.values()).filter(h => h.moderationStatus === 'approved' && h.isActive).length
    cityCount = new Set(Array.from(mockDb.hostProfiles.values()).filter(h => h.moderationStatus === 'approved' && h.isActive).map(h => h.cityId)).size
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/auth/login?redirect=/dashboard')

    sessionUser = { id: authUser.id, email: authUser.email!, role: (authUser.user_metadata?.role ?? 'traveler') as any, fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }

    try {
      const { db } = await import('@/lib/db')
      const { subscriptions, conversations, wishlists, tripRequests } = await import('@/lib/db/schema')
      const { eq, and, gte, desc, sql } = await import('drizzle-orm')
      const now = new Date()

      const [activeSub] = await db.select().from(subscriptions)
        .where(and(eq(subscriptions.userId, authUser.id), eq(subscriptions.status, 'active'), gte(subscriptions.currentPeriodEnd, now)))
        .orderBy(desc(subscriptions.createdAt)).limit(1)

      const [convRow] = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.travelerId, authUser.id))
      const [wishRow] = await db.select({ count: sql<number>`count(*)` }).from(wishlists).where(eq(wishlists.userId, authUser.id))
      const [tripRow] = await db.select({ count: sql<number>`count(*)` }).from(tripRequests).where(eq(tripRequests.travelerId, authUser.id))

      sub = activeSub ? { plan: activeSub.plan, expiresAt: activeSub.currentPeriodEnd?.toISOString() ?? null } : null
      convCount = convRow?.count ?? 0
      wishCount = wishRow?.count ?? 0
      tripCount = tripRow?.count ?? 0

      const { hostProfiles, cities } = await import('@/lib/db/schema')
      const { count } = await import('drizzle-orm')
      const [hRow] = await db.select({ value: count() }).from(hostProfiles).where(and(eq(hostProfiles.moderationStatus, 'approved'), eq(hostProfiles.isActive, true)))
      const [cRow] = await db.select({ value: count() }).from(cities).where(eq(cities.isActive, true))
      hostCount = Number(hRow?.value ?? 47)
      cityCount = Number(cRow?.value ?? 8)
    } catch (err) {
      console.warn('[Dashboard] DB unavailable:', (err as Error).message)
    }
  }

  const firstName = sessionUser?.fullName?.split(' ')[0] ?? 'there'

  const ACTION_CARDS = [
    {
      icon: '✈️', title: 'My Trips', href: '/trips',
      desc: 'Post a trip and let local hosts reach out to you.',
      badge: tripCount > 0 ? `${tripCount} posted` : null,
      cardBg: 'linear-gradient(135deg,#C05621,#F07830)',   // terracotta orange
    },
    {
      icon: '🔍', title: 'Browse local hosts', href: '/search',
      desc: `Search ${hostCount}+ verified locals by city, language, and interest.`,
      badge: null,
      cardBg: 'linear-gradient(135deg,#0C3520,#1E6B40)',   // forest green
    },
    {
      icon: '💳', title: 'Subscription & billing', href: '/pricing',
      desc: 'Day pass · Week · Month · Annual — all under €50.',
      badge: sub ? sub.plan : null,
      cardBg: 'linear-gradient(135deg,#B8860B,#E6B800)',   // warm yellow gold
    },
    {
      icon: '🌍', title: 'Explore cities', href: '/search',
      desc: 'Berlin · Lisbon · Amsterdam · Barcelona · Rome and more.',
      badge: `${cityCount} cities`,
      cardBg: 'linear-gradient(135deg,#134E4A,#0D9488)',   // teal
    },
    {
      icon: '⭐', title: 'Experiences', href: '/experiences',
      desc: 'Browse curated experience types — food, history, nightlife and more.',
      badge: null,
      cardBg: 'linear-gradient(135deg,#3D4A1A,#6B7C2A)',   // olive
    },
    {
      icon: '👤', title: 'My Profile', href: '/settings/profile',
      desc: 'Add your photo, bio, home city and travel style.',
      badge: 'Edit',
      cardBg: 'linear-gradient(135deg,#1E3A5F,#2D6A9F)',   // slate blue
    },
  ]

  const STATS = [
    { label: 'Conversations', value: convCount, href: '/conversations', icon: '💬',
      accent: '#084E4E' },
    { label: 'Saved hosts', value: wishCount, href: '/wishlists', icon: '❤️',
      accent: '#084E4E' },
    { label: 'Cities live', value: cityCount, href: '/search', icon: '🌍',
      accent: '#084E4E' },
  ]

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px]" style={{ backgroundColor: '#EDE6DA' }}>

        {/* ── Immersive hero header ───────────────────── */}
        <div className="relative overflow-hidden" style={{ minHeight: '260px' }}>
          {/* Background travel photo */}
          <img
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.35 }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg,#0C3520 0%,#084E4E 50%,#1C3A5E 100%)' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,25,15,0.60) 100%)' }} />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          {/* Orange glow */}
          <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(232,98,26,0.22) 0%,transparent 65%)', transform: 'translate(20%,-30%)' }} />

          <div className="relative max-w-5xl mx-auto px-5 md:px-11 py-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'rgba(245,166,35,0.90)' }}>
              My dashboard
            </p>
            <h1 className="font-serif text-5xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Hello, {firstName} 👋
            </h1>
            <p className="text-[14px] font-medium mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {sessionUser.email}
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-3">
              <Link href="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.45)' }}>
                🔍 Find a host
              </Link>
              <Link href="/trips/post"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(8px)' }}>
                ✈️ Post a trip
              </Link>
              <Link href="/conversations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(8px)' }}>
                💬 Messages {convCount > 0 && `(${convCount})`}
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-5 md:px-11 py-8">

          {/* ── Subscription banner ─────────────────────── */}
          {sub ? (
            <div className="rounded-2xl px-6 py-5 mb-8 flex items-center justify-between flex-wrap gap-4"
              style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1.5px solid rgba(8,78,78,0.15)', boxShadow: '0 2px 12px rgba(8,78,78,0.08)' }}>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: GREEN }}>✓ Active subscription</div>
                <div className="font-serif text-2xl font-bold capitalize" style={{ color: GREEN }}>{sub.plan} pass</div>
                {sub.expiresAt && (
                  <div className="text-[13px] mt-0.5 font-medium" style={{ color: '#4A8E8E' }}>
                    Valid until {new Date(sub.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
              <Link href="/pricing"
                className="px-6 py-3 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5"
                style={{ border: '1.5px solid rgba(8,78,78,0.22)', backgroundColor: '#fff', color: GREEN, boxShadow: '0 2px 8px rgba(8,78,78,0.08)' }}>
                Manage plan
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl px-6 py-5 mb-8 flex items-center justify-between flex-wrap gap-4"
              style={{ background: 'linear-gradient(135deg,#FFF7ED,#FFEDD5)', border: '1.5px solid rgba(232,98,26,0.22)', boxShadow: '0 2px 12px rgba(232,98,26,0.10)' }}>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: TERRA }}>○ No active subscription</div>
                <div className="font-serif text-2xl font-bold" style={{ color: GREEN }}>Subscribe to connect with hosts</div>
                <div className="text-[13px] mt-0.5 font-medium" style={{ color: '#92400E' }}>Day pass from €6 · Cancel anytime</div>
              </div>
              <Link href="/pricing"
                className="px-7 py-3.5 rounded-full text-[14px] font-bold text-white flex-shrink-0 transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.35)' }}>
                Subscribe now →
              </Link>
            </div>
          )}

          {/* ── Stats row ───────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {STATS.map(s => (
              <Link key={s.label} href={s.href}
                className="rounded-2xl p-6 text-center transition-all hover:-translate-y-1 group"
                style={{
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255,255,255,0.70)',
                  boxShadow: '0 4px 24px rgba(8,78,78,0.08), inset 0 1px 0 rgba(255,255,255,0.80)',
                }}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="font-serif text-5xl font-bold mb-1" style={{ color: s.accent, letterSpacing: '-0.03em' }}>{s.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(8,78,78,0.45)' }}>{s.label}</div>
              </Link>
            ))}
          </div>

          {/* ── Action cards ─────────────────────────────── */}
          <h2 className="font-serif text-xl font-bold mb-4" style={{ color: GREEN, letterSpacing: '-0.02em' }}>Everything in your account</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {ACTION_CARDS.map(f => (
              <Link key={f.title} href={f.href}
                className="rounded-2xl p-5 flex gap-4 transition-all hover:-translate-y-1 hover:brightness-110 group"
                style={{ background: f.cardBg, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-bold text-[15px] text-white">{f.title}</span>
                    {f.badge && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.30)' }}>
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>{f.desc}</p>
                </div>
                <div className="flex-shrink-0 self-center text-xl font-bold text-white opacity-40 group-hover:opacity-90 group-hover:translate-x-1 transition-all">›</div>
              </Link>
            ))}
          </div>

          {/* ── Recent bookings ──────────────────────────── */}
          {recentBookings.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-xl font-bold mb-4" style={{ color: GREEN, letterSpacing: '-0.02em' }}>Recent session bookings</h2>
              <div className="space-y-3">
                {recentBookings.map((b: any) => (
                  <BookingCard key={b.id} booking={b} role="traveler" />
                ))}
              </div>
            </div>
          )}

          {/* ── Become a host CTA ─────────────────────────── */}
          <div className="mt-8 rounded-2xl p-7 flex items-center justify-between gap-4 flex-wrap overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg,#0C3520 0%,#084E4E 60%,#0a5e5e 100%)', boxShadow: '0 8px 32px rgba(8,78,78,0.28)' }}>
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="absolute right-0 top-0 w-64 h-64 pointer-events-none"
              style={{ background: 'radial-gradient(circle,rgba(232,98,26,0.20) 0%,transparent 65%)', transform: 'translate(20%,-30%)' }} />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'rgba(245,166,35,0.80)' }}>For locals</p>
              <div className="font-serif text-xl font-bold text-white mb-1">Know your city inside out?</div>
              <div className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>List as a host — free to join, 0% commission on earnings.</div>
            </div>
            <Link href="/become-a-host"
              className="relative px-6 py-3 rounded-full text-[13px] font-bold flex-shrink-0 transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', color: '#fff', boxShadow: '0 4px 20px rgba(232,98,26,0.50)' }}>
              Become a host →
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
