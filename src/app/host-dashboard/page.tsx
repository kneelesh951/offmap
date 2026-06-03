import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HostTripFeed } from '@/components/trip/HostTripFeed'
import { BookingCard } from '@/components/booking/BookingCard'
import Link from 'next/link'

const GREEN = '#0F3D22'

export default async function HostDashboard() {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser: any = null
  let profile: any = null
  let convCount = 0
  let reviewCount = 0
  let tripCount = 0
  let recentBookings: any[] = []
  let totalEarningsCents = 0

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect('/auth/login?redirect=/host-dashboard')
    if (user.role !== 'host') redirect('/dashboard')

    profile = mockDb.getHostProfileByUserId(user.id)
    if (!profile) redirect('/host-onboarding')

    convCount = Array.from(mockDb.conversations.values()).filter(c => c.hostId === user.id).length
    reviewCount = Array.from(mockDb.reviews.values()).filter(r => r.revieweeId === user.id).length
    tripCount = Array.from(mockDb.tripRequests.values()).filter(t => t.cityId === profile.cityId && t.status === 'open').length
    recentBookings = mockDb.getBookingsByHost(user.id).slice(0, 5).map(b => ({
      ...b,
      travelerName: mockDb.getUserById(b.travelerId)?.fullName ?? 'Traveler',
    }))
    totalEarningsCents = recentBookings
      .filter((b: any) => b.status === 'completed' || b.status === 'accepted')
      .reduce((sum: number, b: any) => sum + b.hostPayoutCents, 0)
    sessionUser = { id: user.id, email: user.email, role: 'host' as any, fullName: user.fullName, avatarUrl: null }
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/auth/login?redirect=/host-dashboard')

    sessionUser = { id: authUser.id, email: authUser.email!, role: 'host' as any, fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }

    try {
      const { db } = await import('@/lib/db')
      const { hostProfiles, conversations, reviews, tripRequests } = await import('@/lib/db/schema')
      const { eq, and, sql } = await import('drizzle-orm')

      const [p] = await db.select().from(hostProfiles).where(eq(hostProfiles.userId, authUser.id)).limit(1)
      if (!p) redirect('/host-onboarding')
      profile = p

      const [convRow] = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(eq(conversations.hostId, authUser.id))
      const [revRow] = await db.select({ count: sql<number>`count(*)` }).from(reviews).where(eq(reviews.revieweeId, authUser.id))
      const [tripRow] = await db.select({ count: sql<number>`count(*)` }).from(tripRequests).where(and(eq(tripRequests.cityId, p.cityId), eq(tripRequests.status, 'open')))
      convCount = convRow?.count ?? 0
      reviewCount = revRow?.count ?? 0
      tripCount = tripRow?.count ?? 0
    } catch (err) {
      console.warn('[HostDashboard] DB unavailable:', (err as Error).message)
      if (!profile) redirect('/host-onboarding')
    }
  }

  const statusStyle = {
    pending:  { bg: '#FFFBEB', border: 'rgba(245,158,11,0.3)',  text: '#92400E', msg: '⏳ Profile under review — we approve all hosts within 24 hrs' },
    approved: { bg: '#EAF5EE', border: 'rgba(15,61,34,0.2)',    text: GREEN,     msg: '✓ Profile live — travelers can find and message you' },
    rejected: { bg: '#FEF2F2', border: 'rgba(220,38,38,0.2)',   text: '#DC2626', msg: '✗ Profile needs changes — check your email for details' },
    flagged:  { bg: '#FEF2F2', border: 'rgba(220,38,38,0.2)',   text: '#DC2626', msg: '⚠ Profile flagged — contact support@offmap.com' },
  }[profile.moderationStatus as string] ?? { bg: '#FAF7F2', border: 'rgba(15,61,34,0.1)', text: GREEN, msg: '' }

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px] bg-cream">

        {/* ── Page header band ──────────────────────────── */}
        <div className="bg-white border-b border-black/[0.07]" style={{ boxShadow: '0 1px 0 rgba(15,61,34,0.05)' }}>
          <div className="max-w-4xl mx-auto px-5 md:px-11 py-8">
            <p className="overline text-terra mb-2">Host dashboard</p>
            <h1 className="font-serif text-3xl font-bold" style={{ color: GREEN, letterSpacing: '-0.03em' }}>
              Your hosting hub
            </h1>
            <p className="text-[13px] text-ink-muted mt-1">{sessionUser.email}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-11 py-8">

          {/* Status banner */}
          <div className="rounded-2xl px-6 py-4 mb-8 text-[13px] font-semibold"
            style={{ backgroundColor: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.text, boxShadow: '0 2px 8px rgba(15,61,34,0.05)' }}>
            {statusStyle.msg}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Trip requests', value: tripCount, href: '#trip-requests', icon: '✈️' },
              { label: 'Traveler messages', value: convCount, href: '/conversations', icon: '💬' },
              { label: 'Reviews received', value: reviewCount, href: `/hosts/${sessionUser.id}`, icon: '⭐' },
              { label: 'Session earnings', value: totalEarningsCents > 0 ? `€${(totalEarningsCents/100).toFixed(0)}` : '€0', href: '#bookings', icon: '💰' },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className="bg-white rounded-2xl p-5 text-center card-hover"
                style={{ border: '1px solid rgba(15,61,34,0.09)', boxShadow: '0 2px 8px rgba(15,61,34,0.06)' }}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="font-serif text-3xl font-bold text-gradient-terra">{s.value}</div>
                <div className="text-[11px] font-semibold mt-1 text-ink-muted">{s.label}</div>
              </Link>
            ))}
          </div>

          {/* Booking requests */}
          <div id="bookings" className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold" style={{ color: GREEN }}>Session booking requests</h2>
              {recentBookings.filter((b: any) => b.status === 'pending').length > 0 && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#FEF0E8', color: '#E8621A' }}>
                  {recentBookings.filter((b: any) => b.status === 'pending').length} pending
                </span>
              )}
            </div>
            {recentBookings.length === 0 ? (
              <div className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(255,255,255,0.70)', border: '2px solid rgba(15,61,34,0.10)' }}>
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm font-medium" style={{ color: '#4A7A5C' }}>No booking requests yet</p>
                <p className="text-xs text-gray-400 mt-1">When travelers book a session with you, they'll appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b: any) => (
                  <BookingCard key={b.id} booking={b} role="host" />
                ))}
              </div>
            )}
          </div>

          {/* Trip Requests Feed */}
          <div id="trip-requests" className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold" style={{ color: GREEN }}>
                Trip requests in your city
              </h2>
              {tripCount > 0 && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#FEF0E8', color: '#E8621A' }}>
                  {tripCount} open
                </span>
              )}
            </div>
            <HostTripFeed hostCityId={profile.cityId} />
          </div>

          {/* Actions */}
          <h2 className="font-serif text-xl font-bold mb-4" style={{ color: GREEN }}>Manage your hosting</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: '✏️', href: '/host-dashboard/profile/create', title: 'Edit your profile', desc: 'Update your bio, rate, languages and availability' },
              { icon: '💬', href: '/conversations', title: 'Messages from travelers', desc: 'Respond quickly to keep your response rate high' },
              { icon: '👁️', href: `/hosts/${sessionUser.id}`, title: 'View your public profile', desc: 'See exactly what travelers see when they find you' },
              { icon: '📋', href: '/host-guidelines', title: 'Host guidelines', desc: 'Community standards and safety requirements' },
            ].map(a => (
              <Link key={a.title} href={a.href}
                className="bg-white rounded-2xl p-6 card-hover group"
                style={{ border: '1px solid rgba(15,61,34,0.09)', boxShadow: '0 2px 8px rgba(15,61,34,0.05)' }}>
                <div className="text-2xl mb-3">{a.icon}</div>
                <div className="font-bold text-[13px] mb-1 group-hover:text-terra transition-colors" style={{ color: GREEN }}>{a.title}</div>
                <div className="text-[12px]" style={{ color: '#4A7A5C' }}>{a.desc}</div>
              </Link>
            ))}
          </div>

          {/* Host tips */}
          <div className="mt-8 rounded-2xl p-7 overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #1a4a2e 100%)`, boxShadow: '0 4px 24px rgba(15,61,34,0.22)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <h3 className="relative font-serif text-lg font-bold text-white mb-4">Tips to get more travelers</h3>
            <div className="relative grid sm:grid-cols-3 gap-3">
              {[
                ['📸', 'Add a profile photo', 'Hosts with photos get 3× more connections'],
                ['⚡', 'Reply within 2 hours', 'Fast replies boost your search ranking'],
                ['📝', 'Be specific in your bio', 'Mention real places, real stories'],
              ].map(([icon, tip, desc]) => (
                <div key={tip} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)' }}>
                  <div className="text-xl mb-2">{icon}</div>
                  <div className="text-white text-[13px] font-semibold mb-1">{tip}</div>
                  <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.68)' }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
