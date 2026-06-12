import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Check } from 'lucide-react'
import { PricingCards } from './PricingCards'

const FEATURES = [
  'Unlimited host connections in any city',
  'Direct messaging with any verified host',
  'Hosts set their own rates — no commission',
  'Browse all profiles for free, forever',
  'Cancel anytime — 14-day EU withdrawal right',
  'GDPR compliant — data stays in the EU',
]

const GREEN = '#084E4E'

export default async function PricingPage() {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser = null as any

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (user) sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) sessionUser = { id: user.id, email: user.email!, role: 'traveler' as any, fullName: user.user_metadata?.full_name ?? null, avatarUrl: null }
  }

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px] bg-cream">

        {/* ── Hero ──────────────────────────────────────── */}
        <div className="relative bg-ink overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/95 to-[#0a5e5e]" />
          <div className="absolute inset-0 bg-gradient-to-b from-terra/5 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto px-5 md:px-11 pt-14 pb-14 text-center">
            <p className="overline text-terra mb-4 fade-up">Pricing</p>
            <h1 className="font-serif text-4xl md:text-6xl text-white mb-4 fade-up fade-up-delay-1" style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Simple,{' '}
              <span className="italic text-gradient-sunrise">
                honest pricing.
              </span>
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-lg mx-auto fade-up fade-up-delay-2" style={{ lineHeight: 1.6 }}>
              Browse host profiles for free, forever. Subscribe only when you want to connect.
              Hosts keep 100% of what you pay them directly.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-11 py-14">

          {/* Plans */}
          <PricingCards isLoggedIn={!!sessionUser} />

          {/* Features */}
          <div className="card p-8 mb-10">
            <h2 className="font-serif text-xl font-bold mb-6" style={{ color: GREEN }}>Every plan includes</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {FEATURES.map(f => (
                <div key={f} className="flex items-start gap-3 text-[13px]" style={{ color: '#4A8E8E' }}>
                  <Check size={14} style={{ color: '#E8621A', flexShrink: 0, marginTop: 2 }} />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {[
              ['🔒', 'Stripe-secured payments'],
              ['🇪🇺', 'GDPR — data stays in the EU'],
              ['↩️', '14-day EU withdrawal right'],
            ].map(([icon, label]) => (
              <div key={label as string} className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: '#4A8E8E' }}>
                <span className="text-base">{icon}</span>{label}
              </div>
            ))}
          </div>

          {/* Legal */}
          <p className="text-center text-[11px]" style={{ color: '#9CAD9E' }}>
            Offmap GmbH · Invalidenstraße 115, 10115 Berlin, Germany · VAT DE 312 456 789<br />
            All payments are processed securely via Stripe. As required by EU law (Directive 2011/83/EU), you have a 14-day right of withdrawal.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
