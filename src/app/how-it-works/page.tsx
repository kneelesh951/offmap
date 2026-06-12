import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GREEN = '#084E4E'

const TRAVELER_STEPS = [
  {
    step: '01',
    icon: '🔍',
    title: 'Browse local hosts',
    description: 'Search by city, language, or interest. Every host is ID-verified and reviewed by real travelers. Read their stories, check their ratings, and find someone who matches your vibe.',
  },
  {
    step: '02',
    icon: '🔓',
    title: 'Subscribe & connect',
    description: 'Pick a plan that fits your trip — from a single day to a full year. Once subscribed, message any host directly. No per-host fees, no hidden charges.',
  },
  {
    step: '03',
    icon: '🤝',
    title: 'Meet & explore',
    description: 'Arrange a meetup at a public place. Your host shows you their city the way locals experience it — hidden cafés, real neighborhoods, authentic food spots. No scripts, no tour buses.',
  },
]

const HOST_STEPS = [
  {
    step: '01',
    icon: '📝',
    title: 'Create your profile',
    description: 'Tell travelers what makes your city special through your eyes. Add photos, set your languages, pick your specialties — food, nightlife, history, art, whatever you love most.',
  },
  {
    step: '02',
    icon: '✅',
    title: 'Get verified',
    description: 'Complete our ID verification process. We manually review every host to keep the community safe and trustworthy. Once approved, your profile goes live.',
  },
  {
    step: '03',
    icon: '💰',
    title: 'Set your rate & earn',
    description: 'You decide your hourly rate. Travelers who subscribe can message you directly. Meet on your schedule, share your city, and earn doing what you love.',
  },
]

const TRUST_POINTS = [
  {
    icon: '🛡️',
    title: 'Every host is verified',
    description: 'ID verification, manual review, and community ratings. We don\'t let just anyone list — quality over quantity.',
  },
  {
    icon: '📍',
    title: 'Always meet in public',
    description: 'Our safety guidelines require first meetings in public places. We remind both sides before every meetup.',
  },
  {
    icon: '⭐',
    title: 'Two-way reviews',
    description: 'After every meetup, both travelers and hosts leave honest reviews. Bad actors get flagged and removed.',
  },
  {
    icon: '🇪🇺',
    title: 'EU data protection',
    description: 'Your data stays in the EU (Frankfurt servers). Full GDPR compliance. You can request deletion at any time.',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>How It Works</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px', lineHeight: 1.05 }}>
                Skip the tourist traps.<br />Meet the real city.
              </h1>
              <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>
                Offmap connects you with verified locals who share their city on their own terms. No scripts, no buses, no crowds — just real people showing you the places they actually love.
              </p>
            </div>
          </div>
        </div>

        {/* Traveler flow */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#E8621A' }}>For Travelers</p>
            <h2 className="font-serif text-4xl font-bold mb-4 text-center" style={{ color: GREEN, letterSpacing: '-1px' }}>
              Three steps to an authentic experience
            </h2>
            <p className="text-base text-center mb-14 max-w-2xl mx-auto" style={{ color: '#4A8E8E' }}>
              From browsing to meeting a local — it takes less than 5 minutes to get started.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {TRAVELER_STEPS.map((s, i) => (
                <div key={s.step} className="relative">
                  {i < TRAVELER_STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px]"
                      style={{ background: 'linear-gradient(90deg, rgba(8,78,78,0.15), rgba(8,78,78,0.05))' }} />
                  )}
                  <div className="bg-white rounded-2xl p-8 border text-center relative" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                    <div className="text-4xl mb-4">{s.icon}</div>
                    <div className="text-[11px] font-bold tracking-widest mb-2" style={{ color: '#E8621A' }}>STEP {s.step}</div>
                    <h3 className="font-serif text-xl font-bold mb-3" style={{ color: GREEN }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#4A8E8E' }}>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/search"
                className="inline-flex items-center px-8 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: GREEN }}>
                Browse Hosts →
              </Link>
            </div>
          </div>
        </div>

        {/* Host flow */}
        <div className="py-20 px-5 md:px-11" style={{ backgroundColor: '#F7FAF8' }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#E8621A' }}>For Hosts</p>
            <h2 className="font-serif text-4xl font-bold mb-4 text-center" style={{ color: GREEN, letterSpacing: '-1px' }}>
              Share your city. Earn on your terms.
            </h2>
            <p className="text-base text-center mb-14 max-w-2xl mx-auto" style={{ color: '#4A8E8E' }}>
              You set the rate, you pick the schedule, you decide who to meet. Offmap handles the rest.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {HOST_STEPS.map((s, i) => (
                <div key={s.step} className="relative">
                  {i < HOST_STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px]"
                      style={{ background: 'linear-gradient(90deg, rgba(8,78,78,0.15), rgba(8,78,78,0.05))' }} />
                  )}
                  <div className="bg-white rounded-2xl p-8 border text-center relative" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                    <div className="text-4xl mb-4">{s.icon}</div>
                    <div className="text-[11px] font-bold tracking-widest mb-2" style={{ color: '#E8621A' }}>STEP {s.step}</div>
                    <h3 className="font-serif text-xl font-bold mb-3" style={{ color: GREEN }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#4A8E8E' }}>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/become-a-host"
                className="inline-flex items-center px-8 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#E8621A' }}>
                Become a Host →
              </Link>
            </div>
          </div>
        </div>

        {/* Trust & Safety */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#E8621A' }}>Trust & Safety</p>
            <h2 className="font-serif text-4xl font-bold mb-12 text-center" style={{ color: GREEN, letterSpacing: '-1px' }}>
              Built for safety from day one
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {TRUST_POINTS.map(t => (
                <div key={t.title} className="bg-white rounded-2xl p-8 border" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                  <div className="text-3xl mb-4">{t.icon}</div>
                  <h3 className="font-serif text-xl font-bold mb-3" style={{ color: GREEN }}>{t.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4A8E8E' }}>{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing teaser */}
        <div className="py-16 px-5 md:px-11" style={{ backgroundColor: GREEN }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl font-bold text-white mb-4" style={{ letterSpacing: '-0.5px' }}>
              Simple, transparent pricing
            </h2>
            <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>
              One subscription unlocks every host on the platform. No per-host fees, no booking charges, no surprises. Starting from just €6 for a day pass.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#E8621A', color: '#fff' }}>
                View Pricing →
              </Link>
              <Link href="/search"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', color: '#fff' }}>
                Browse Hosts
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
