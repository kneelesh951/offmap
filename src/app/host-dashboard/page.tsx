import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HostTripFeed } from '@/components/trip/HostTripFeed'
import { BookingCard } from '@/components/booking/BookingCard'
import { HostPhotoCarousel } from '@/components/hosts/HostPhotoCarousel'
import Link from 'next/link'

const GREEN = '#084E4E'
const TERRA = '#E8621A'

export default async function HostDashboard() {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser: any = null
  let profile: any = null
  let convCount = 0
  let reviewCount = 0
  let tripCount = 0
  let recentBookings: any[] = []
  let totalEarningsCents = 0
  let hostPhotos: { id: string; publicUrl: string; isPrimary: boolean }[] = []

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
    hostPhotos = mockDb.getHostPhotos(profile.id).map(p => ({ id: p.id, publicUrl: p.publicUrl, isPrimary: p.isPrimary }))
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

      const { hostPhotos: hostPhotosTable } = await import('@/lib/db/schema')
      const { asc } = await import('drizzle-orm')
      const photos = await db.select({ id: hostPhotosTable.id, publicUrl: hostPhotosTable.publicUrl, isPrimary: hostPhotosTable.isPrimary })
        .from(hostPhotosTable).where(eq(hostPhotosTable.hostId, p.id)).orderBy(asc(hostPhotosTable.displayOrder))
      hostPhotos = photos.filter(ph => ph.publicUrl).map(ph => ({ id: ph.id, publicUrl: ph.publicUrl!, isPrimary: ph.isPrimary }))
    } catch (err) {
      console.warn('[HostDashboard] DB unavailable:', (err as Error).message)
      if (!profile) redirect('/host-onboarding')
    }
  }

  const firstName = sessionUser?.fullName?.split(' ')[0] ?? 'Host'

  const statusConfig: Record<string, { icon: string; label: string; bg: string; border: string; text: string; glow: string }> = {
    pending:  { icon: '⏳', label: 'Profile under review — we approve all hosts within 24 hrs', bg: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: 'rgba(245,158,11,0.35)', text: '#92400E', glow: 'rgba(245,158,11,0.12)' },
    approved: { icon: '✓', label: 'Profile live — travelers can find and message you', bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: 'rgba(8,78,78,0.20)', text: GREEN, glow: 'rgba(8,78,78,0.08)' },
    rejected: { icon: '✗', label: 'Profile needs changes — check your email for details', bg: 'linear-gradient(135deg,#FEF2F2,#FECACA)', border: 'rgba(220,38,38,0.25)', text: '#DC2626', glow: 'rgba(220,38,38,0.08)' },
    flagged:  { icon: '⚠', label: 'Profile flagged — contact support@offmap.com', bg: 'linear-gradient(135deg,#FEF2F2,#FECACA)', border: 'rgba(220,38,38,0.25)', text: '#DC2626', glow: 'rgba(220,38,38,0.08)' },
  }
  const status = statusConfig[profile.moderationStatus as string] ?? statusConfig.pending

  const pendingBookings = recentBookings.filter((b: any) => b.status === 'pending')

  const ACTION_CARDS = [
    { icon: '✏️', href: '/host-dashboard/profile/create', title: 'Edit your profile', desc: 'Update your bio, rate, languages and availability', cardBg: 'linear-gradient(135deg,#0C3520,#1E6B40)' },
    { icon: '💬', href: '/conversations', title: 'Traveler messages', desc: 'Respond quickly to keep your response rate high', cardBg: 'linear-gradient(135deg,#134E4A,#0D9488)', badge: convCount > 0 ? `${convCount}` : null },
    { icon: '👁️', href: `/hosts/${sessionUser.id}`, title: 'View public profile', desc: 'See exactly what travelers see when they find you', cardBg: 'linear-gradient(135deg,#1E3A5F,#2D6A9F)' },
    { icon: '📋', href: '/host-guidelines', title: 'Host guidelines', desc: 'Community standards and safety requirements', cardBg: 'linear-gradient(135deg,#3D4A1A,#6B7C2A)' },
  ]

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px]" style={{ backgroundColor: '#EDE6DA' }}>

        {/* ── Immersive hero header ───────────────────── */}
        <div className="relative overflow-hidden" style={{ minHeight: '280px' }}>
          {/* Background photo */}
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.25 }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg,#084E4E 0%,#0a5e5e 40%,#1C3A5E 100%)' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(8,40,40,0.70) 100%)' }} />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          {/* Orange glow */}
          <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(232,98,26,0.25) 0%,transparent 65%)', transform: 'translate(20%,-30%)' }} />

          <div className="relative max-w-5xl mx-auto px-5 md:px-11 py-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'rgba(245,166,35,0.90)' }}>
              Host dashboard
            </p>
            <h1 className="font-serif text-5xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-[14px] font-medium mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {sessionUser.email}
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-3">
              <Link href={`/hosts/${sessionUser.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.45)' }}>
                👁️ View my profile
              </Link>
              <Link href="/conversations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(8px)' }}>
                💬 Messages {convCount > 0 && `(${convCount})`}
              </Link>
              <Link href="/host-dashboard/profile/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(8px)' }}>
                ✏️ Edit profile
              </Link>
            </div>
          </div>
        </div>

        {/* ── Two-column layout: sidebar + main ─── */}
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex gap-8">

          {/* ── LEFT SIDEBAR — teal with image + tips ── */}
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="sticky top-[84px] space-y-5">

              {/* Host photo carousel */}
              <HostPhotoCarousel
                photos={hostPhotos}
                hostName={sessionUser.fullName}
                headline={profile.headline}
              />

              {/* Pro tips card */}
              <div className="rounded-2xl overflow-hidden relative"
                style={{ background: 'linear-gradient(180deg, #084E4E 0%, #0a5e5e 40%, #0C6B5E 100%)', boxShadow: '0 8px 32px rgba(8,78,78,0.25)' }}>
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.05]"
                  style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                {/* Orange glow */}
                <div className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none"
                  style={{ background: 'radial-gradient(circle,rgba(232,98,26,0.18) 0%,transparent 70%)' }} />

                <div className="relative p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: '#F5A623' }}>Pro tips</p>
                  <h3 className="font-serif text-[16px] font-bold text-white mb-4">Get more bookings</h3>

                  <div className="space-y-3">
                    {[
                      { icon: '📸', tip: 'Add a great photo', desc: '3× more connections' },
                      { icon: '⚡', tip: 'Reply within 2 hrs', desc: 'Boosts your ranking' },
                      { icon: '📝', tip: 'Be specific in bio', desc: 'Real places, real stories' },
                      { icon: '🎥', tip: 'Record an intro video', desc: 'Stand out from others' },
                      { icon: '🌟', tip: 'Earn 5-star reviews', desc: 'Get featured on home' },
                    ].map(t => (
                      <div key={t.tip} className="flex items-start gap-3 rounded-xl px-3.5 py-3"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <span className="text-lg flex-shrink-0 mt-0.5">{t.icon}</span>
                        <div>
                          <div className="text-[12.5px] font-semibold text-white">{t.tip}</div>
                          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{t.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick stats mini card */}
              <div className="rounded-2xl p-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0C3520, #1E6B40)', boxShadow: '0 4px 20px rgba(12,53,32,0.25)' }}>
                <div className="absolute inset-0 opacity-[0.04]"
                  style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: '#6EE7B7' }}>Host level</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(110,231,183,0.40)' }}>
                      🌱
                    </div>
                    <div>
                      <div className="font-serif text-[18px] font-bold text-white">New host</div>
                      <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>Complete sessions to level up</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <div className="h-full rounded-full" style={{ width: '15%', background: 'linear-gradient(90deg,#6EE7B7,#34D399)', transition: 'width 0.6s ease' }} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>0 / 5 sessions</span>
                    <span className="text-[10px] font-semibold" style={{ color: '#6EE7B7' }}>Rising host</span>
                  </div>
                </div>
              </div>

              {/* Guidelines link */}
              <Link href="/host-guidelines"
                className="flex items-center gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 group"
                style={{ background: 'rgba(255,255,255,0.70)', border: '1.5px solid rgba(8,78,78,0.12)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(8,78,78,0.06)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '1px solid #FCD34D' }}>
                  📋
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold group-hover:text-terra transition-colors" style={{ color: GREEN }}>Host guidelines</div>
                  <div className="text-[11px]" style={{ color: '#6B8F7A' }}>Safety &amp; community standards</div>
                </div>
                <span className="text-sm font-bold opacity-30 group-hover:opacity-80 group-hover:translate-x-1 transition-all" style={{ color: GREEN }}>›</span>
              </Link>
            </div>
          </aside>

          {/* ── RIGHT MAIN CONTENT ──────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* ── Status banner ──────────────────────────── */}
            <div className="rounded-2xl px-6 py-5 mb-8 flex items-center gap-4"
              style={{ background: status.bg, border: `1.5px solid ${status.border}`, boxShadow: `0 4px 16px ${status.glow}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${status.text}15`, border: `1.5px solid ${status.text}30` }}>
                {status.icon}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: status.text }}>Profile status</div>
                <div className="text-[14px] font-semibold" style={{ color: status.text }}>{status.label}</div>
              </div>
            </div>

            {/* ── Stats row ──────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Trip requests', value: tripCount, href: '#trip-requests', icon: '✈️',
                  bg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', border: '#93C5FD', shadow: 'rgba(59,130,246,0.15)', accent: '#1E40AF' },
                { label: 'Messages', value: convCount, href: '/conversations', icon: '💬',
                  bg: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', border: '#6EE7B7', shadow: 'rgba(16,185,129,0.15)', accent: '#065F46' },
                { label: 'Reviews', value: reviewCount, href: `/hosts/${sessionUser.id}`, icon: '⭐',
                  bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '#FCD34D', shadow: 'rgba(245,158,11,0.15)', accent: '#92400E' },
                { label: 'Earnings', value: totalEarningsCents > 0 ? `€${(totalEarningsCents/100).toFixed(0)}` : '€0', href: '#bookings', icon: '💰',
                  bg: 'linear-gradient(135deg, #FFEDD5, #FDBA74)', border: '#FB923C', shadow: 'rgba(249,115,22,0.15)', accent: '#9A3412' },
              ].map(s => (
                <Link key={s.label} href={s.href}
                  className="rounded-2xl p-4 text-center transition-all hover:-translate-y-1 group"
                  style={{ background: s.bg, border: `1.5px solid ${s.border}`, boxShadow: `0 4px 20px ${s.shadow}, inset 0 1px 0 rgba(255,255,255,0.60)` }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="font-serif text-3xl font-bold" style={{ color: s.accent, letterSpacing: '-0.03em' }}>{s.value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: `${s.accent}99` }}>{s.label}</div>
                </Link>
              ))}
            </div>

            {/* ── Booking requests ──────────────────────── */}
            <div id="bookings" className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold" style={{ color: GREEN, letterSpacing: '-0.02em' }}>Session booking requests</h2>
                {pendingBookings.length > 0 && (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full animate-pulse"
                    style={{ background: 'linear-gradient(135deg,#FEF0E8,#FFEDD5)', color: TERRA, border: '1px solid rgba(232,98,26,0.25)' }}>
                    {pendingBookings.length} pending
                  </span>
                )}
              </div>
              {recentBookings.length === 0 ? (
                <div className="rounded-2xl p-10 text-center relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.80), rgba(255,255,255,0.50))', border: '2px dashed rgba(8,78,78,0.15)', backdropFilter: 'blur(8px)' }}>
                  <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle, #084E4E 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                      style={{ background: 'linear-gradient(135deg,#DBEAFE,#BFDBFE)', border: '1.5px solid #93C5FD' }}>
                      📭
                    </div>
                    <p className="font-serif text-lg font-bold mb-1" style={{ color: GREEN }}>No booking requests yet</p>
                    <p className="text-[13px] font-medium" style={{ color: '#6B8F7A' }}>When travelers book a session with you, they&apos;ll appear here</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((b: any) => (
                    <BookingCard key={b.id} booking={b} role="host" />
                  ))}
                </div>
              )}
            </div>

            {/* ── Trip Requests Feed ──────────────────────── */}
            <div id="trip-requests" className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold" style={{ color: GREEN, letterSpacing: '-0.02em' }}>
                  Trip requests in your city
                </h2>
                {tripCount > 0 && (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                    style={{ background: 'linear-gradient(135deg,#FEF0E8,#FFEDD5)', color: TERRA, border: '1px solid rgba(232,98,26,0.25)' }}>
                    {tripCount} open
                  </span>
                )}
              </div>
              <HostTripFeed hostCityId={profile.cityId} />
            </div>

            {/* ── Manage your hosting — gradient cards ─── */}
            <h2 className="font-serif text-xl font-bold mb-4" style={{ color: GREEN, letterSpacing: '-0.02em' }}>Manage your hosting</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {ACTION_CARDS.map(a => (
                <Link key={a.title} href={a.href}
                  className="rounded-2xl p-5 flex gap-4 transition-all hover:-translate-y-1 hover:brightness-110 group"
                  style={{ background: a.cardBg, boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-[15px] text-white">{a.title}</span>
                      {a.badge && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.30)' }}>
                          {a.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>{a.desc}</p>
                  </div>
                  <div className="flex-shrink-0 self-center text-xl font-bold text-white opacity-40 group-hover:opacity-90 group-hover:translate-x-1 transition-all">›</div>
                </Link>
              ))}
            </div>

            {/* ── Mobile-only tips (hidden on desktop where sidebar shows them) ── */}
            <div className="lg:hidden rounded-2xl p-7 overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #0C3520 0%, #084E4E 50%, #1C3A5E 100%)', boxShadow: '0 8px 32px rgba(8,78,78,0.28)' }}>
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <div className="absolute right-0 top-0 w-64 h-64 pointer-events-none"
                style={{ background: 'radial-gradient(circle,rgba(232,98,26,0.20) 0%,transparent 65%)', transform: 'translate(20%,-30%)' }} />
              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'rgba(245,166,35,0.80)' }}>Pro tips</p>
                <h3 className="font-serif text-lg font-bold text-white mb-5">Get more travelers to book you</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { icon: '📸', tip: 'Add a profile photo', desc: 'Hosts with photos get 3× more connections', color: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.25)' },
                    { icon: '⚡', tip: 'Reply within 2 hours', desc: 'Fast replies boost your search ranking', color: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)' },
                    { icon: '📝', tip: 'Be specific in your bio', desc: 'Mention real places, real stories', color: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.25)' },
                  ].map(t => (
                    <div key={t.tip} className="rounded-xl p-4" style={{ background: t.color, border: `1px solid ${t.border}` }}>
                      <div className="text-xl mb-2">{t.icon}</div>
                      <div className="text-white text-[13px] font-semibold mb-1">{t.tip}</div>
                      <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
