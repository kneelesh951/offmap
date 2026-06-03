import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'

const GREEN = '#0F3D22'

const TRAVELER_FEATURES = [
  {
    icon: '🔍',
    title: 'Find a local host',
    desc: 'Browse 1,300+ verified locals across Berlin, Lisbon, Amsterdam and 5 more cities.',
    href: '/search',
    cta: 'Browse hosts',
  },
  {
    icon: '💳',
    title: 'Subscribe to connect',
    desc: 'From just €6/day. Subscribe once, message unlimited hosts in any city.',
    href: '/pricing',
    cta: 'See plans',
  },
  {
    icon: '💬',
    title: 'Message hosts directly',
    desc: 'Once subscribed, unlock direct messaging with any host. No middleman.',
    href: '/conversations',
    cta: 'My conversations',
  },
  {
    icon: '❤️',
    title: 'Save hosts to wishlist',
    desc: 'Bookmark locals you love for your next trip. Revisit anytime.',
    href: '/search',
    cta: 'Start exploring',
  },
]

const HOST_FEATURES = [
  {
    icon: '✏️',
    title: 'Set up your profile',
    desc: 'Write your story, set your rate, and go live within 24 hours after review.',
    href: '/host-dashboard/profile/create',
    cta: 'Create profile',
    highlight: true,
  },
  {
    icon: '📊',
    title: 'Host dashboard',
    desc: 'Track your messages, reviews, and profile status all in one place.',
    href: '/host-dashboard',
    cta: 'Go to dashboard',
  },
  {
    icon: '💬',
    title: 'Messages from travelers',
    desc: 'Subscribed travelers will reach out directly. Reply quickly to keep your rating high.',
    href: '/conversations',
    cta: 'View messages',
  },
  {
    icon: '⭐',
    title: 'Build your reputation',
    desc: 'Every great experience earns a review. Top-rated hosts get featured placement.',
    href: '/host-dashboard',
    cta: 'View reviews',
  },
]

export default async function WelcomePage() {
  const isMock = process.env.MOCK_MODE === 'true'

  let userName = 'there'
  let userRole: 'traveler' | 'host' = 'traveler'
  let sessionUser = null as any

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect('/auth/login')
    userName = user.fullName?.split(' ')[0] ?? 'there'
    userRole = user.role as 'traveler' | 'host'
    sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    userName = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'
    userRole = user.user_metadata?.role ?? 'traveler'
    sessionUser = { id: user.id, email: user.email!, role: userRole as any, fullName: user.user_metadata?.full_name ?? null, avatarUrl: null }
  }

  const isHost = userRole === 'host'
  const features: Array<{ icon: string; title: string; desc: string; href: string; cta: string; highlight?: boolean }> = isHost ? HOST_FEATURES : TRAVELER_FEATURES

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px] bg-cream">

        {/* ── Hero band ──────────────────────────────── */}
        <div className="relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #1a4a2e 100%)` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-terra/10 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")" }} />
          <div className="relative max-w-4xl mx-auto px-5 md:px-11 py-16 text-center">
            <div className="text-4xl mb-5">🎉</div>
            <p className="overline mb-4 fade-up" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {isHost ? 'Host account' : 'Traveler account'}
            </p>
            <h1 className="font-serif text-4xl md:text-6xl text-white mb-5 fade-up fade-up-delay-1"
              style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Welcome,{' '}
              <span className="italic text-gradient-sunrise">{userName}.</span>
            </h1>
            <p className="text-[15px] mb-8 mx-auto fade-up fade-up-delay-2"
              style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 480, lineHeight: 1.65 }}>
              {isHost
                ? 'Your host account is ready. Set up your profile to start connecting with travelers from around the world.'
                : 'Your account is ready. Start exploring locals in any of our 8 European cities.'}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold fade-up fade-up-delay-3"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <span className="text-white/70">{isHost ? '🏙️ Host account · verified' : '✈️ Traveler account · active'}</span>
            </div>
          </div>
        </div>

        {/* ── What you can do ────────────────────────── */}
        <div className="py-16 px-5 md:px-11">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="overline text-terra mb-3">Get started</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold" style={{ color: GREEN, letterSpacing: '-0.03em' }}>
                Here&apos;s what you can do.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {features.map(f => (
                <div key={f.title}
                  className="bg-white rounded-2xl p-7 card-hover"
                  style={{
                    border: f.highlight ? `2px solid ${GREEN}` : '1px solid rgba(15,61,34,0.09)',
                    boxShadow: f.highlight ? '0 4px 24px rgba(15,61,34,0.14)' : '0 2px 8px rgba(15,61,34,0.06)',
                  }}>
                  {f.highlight && (
                    <div className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full text-white mb-4"
                      style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 2px 10px rgba(232,98,26,0.40)' }}>
                      Start here
                    </div>
                  )}
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="font-serif text-lg font-bold mb-2" style={{ color: GREEN }}>{f.title}</h3>
                  <p className="text-[13px] leading-relaxed mb-5" style={{ color: '#4A7A5C' }}>{f.desc}</p>
                  <Link href={f.href}
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold transition-all hover:gap-3"
                    style={{ color: '#E8621A' }}>
                    {f.cta} →
                  </Link>
                </div>
              ))}
            </div>

            {/* Primary CTA */}
            <div className="mt-12 text-center">
              <Link href={isHost ? '/host-dashboard/profile/create' : '/search'}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 6px 28px rgba(232,98,26,0.45)' }}>
                {isHost ? 'Set up my host profile' : 'Start exploring hosts'} →
              </Link>
              <div className="mt-4">
                <Link href={isHost ? '/host-dashboard' : '/dashboard'}
                  className="text-[13px] font-semibold hover:underline" style={{ color: '#6EA880' }}>
                  Go to my dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick links ────────────────────────────── */}
        <div className="py-16 px-5 md:px-11 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #1a4a2e 100%)` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
          <div className="relative max-w-4xl mx-auto">
            <h2 className="font-serif text-2xl font-bold text-white mb-8 text-center"
              style={{ letterSpacing: '-0.025em' }}>
              Your account at a glance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(isHost ? [
                { label: 'Edit profile', href: '/host-dashboard/profile/create', icon: '✏️', note: 'Set up' },
                { label: 'Dashboard', href: '/host-dashboard', icon: '📊', note: 'Overview' },
                { label: 'Messages', href: '/conversations', icon: '💬', note: 'Inbox' },
                { label: 'Public profile', href: '/search', icon: '👁️', note: 'Preview' },
              ] : [
                { label: 'Search hosts', href: '/search', icon: '🔍', note: 'Explore' },
                { label: 'Pricing', href: '/pricing', icon: '💳', note: 'Subscribe' },
                { label: 'Conversations', href: '/conversations', icon: '💬', note: 'Messages' },
                { label: 'Dashboard', href: '/dashboard', icon: '📊', note: 'Account' },
              ]).map(item => (
                <Link key={item.label} href={item.href}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl text-center transition-all hover:-translate-y-0.5 hover:bg-white/15"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="text-3xl">{item.icon}</span>
                  <span className="text-white font-semibold text-[13px]">{item.label}</span>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.note}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </main>
    </>
  )
}
