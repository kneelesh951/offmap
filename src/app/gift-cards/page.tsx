import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GREEN = '#084E4E'

const AMOUNTS = [
  { label: 'Day pass', price: '€6', desc: 'Perfect for a single city trip', plan: 'day' },
  { label: 'Week pass', price: '€12', desc: 'Great for a short holiday', plan: 'week', popular: true },
  { label: 'Month pass', price: '€18', desc: 'For the longer explorer', plan: 'month' },
  { label: 'Annual pass', price: '€49', desc: 'Best value for regular travelers', plan: 'annual' },
]

export default function GiftCardsPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-3xl mx-auto text-center">
              <div className="text-6xl mb-6">🎁</div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Gift cards</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px' }}>Give someone a local experience.</h1>
              <p className="text-lg leading-relaxed max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>
                The perfect gift for the traveler in your life. A Offmap gift card gives them access to real locals in any city — no tourist traps included.
              </p>
            </div>
          </div>
        </div>

        {/* Coming soon notice */}
        <div className="py-6 px-5 md:px-11 text-center" style={{ backgroundColor: '#FFF9F5', borderBottom: '1px solid rgba(232,98,26,0.15)' }}>
          <p className="text-sm font-medium" style={{ color: '#E8621A' }}>
            🚀 Gift cards are launching in <strong>Q3 2025</strong>. Leave your email and we'll notify you the moment they're available.
          </p>
        </div>

        {/* Plans */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-3 text-center" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Choose a plan to gift</h2>
            <p className="text-center text-sm mb-10" style={{ color: '#4A8E8E' }}>Recipients redeem online and can use their subscription across all 8 Offmap cities.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {AMOUNTS.map(a => (
                <div key={a.plan} className="rounded-2xl p-6 text-center relative" style={{
                  border: a.popular ? `2px solid ${GREEN}` : '1px solid rgba(8,78,78,0.12)',
                  backgroundColor: a.popular ? '#F7FAF8' : '#fff',
                }}>
                  {a.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-bold" style={{ backgroundColor: GREEN }}>
                      Most popular
                    </div>
                  )}
                  <div className="font-serif text-4xl font-bold mb-1" style={{ color: GREEN }}>{a.price}</div>
                  <div className="font-bold text-sm mb-1" style={{ color: GREEN }}>{a.label}</div>
                  <div className="text-xs mb-6" style={{ color: '#6EA880' }}>{a.desc}</div>
                  <button className="w-full py-2.5 rounded-full text-sm font-bold transition-all opacity-60 cursor-not-allowed"
                    style={{ backgroundColor: GREEN, color: '#fff' }} disabled>
                    Coming Q3 2025
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="py-20 px-5 md:px-11" style={{ backgroundColor: '#F7FAF8' }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-10 text-center" style={{ color: GREEN, letterSpacing: '-0.5px' }}>How gift cards work</h2>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              {[
                { step: '1', icon: '🛒', title: 'You buy', desc: 'Select a plan and pay online. You receive a gift card code by email instantly.' },
                { step: '2', icon: '🎁', title: 'They receive', desc: 'Forward the code (or print the PDF) to the lucky recipient. Valid for 12 months.' },
                { step: '3', icon: '🌍', title: 'They explore', desc: 'They create a free account, enter the code, and unlock any host in any Offmap city.' },
              ].map(s => (
                <div key={s.step} className="bg-white p-6 rounded-2xl" style={{ border: '1px solid rgba(8,78,78,0.10)' }}>
                  <div className="text-4xl mb-3">{s.icon}</div>
                  <div className="font-bold text-sm mb-2" style={{ color: GREEN }}>{s.title}</div>
                  <div className="text-sm" style={{ color: '#4A8E8E' }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notify form */}
        <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
          <div className="max-w-lg mx-auto text-center">
            <h2 className="font-serif text-3xl font-bold mb-3" style={{ letterSpacing: '-0.5px' }}>Get notified at launch</h2>
            <p className="mb-8 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>No spam. One email when gift cards go live.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-full text-sm focus:outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }} />
              <button className="px-6 py-3 rounded-full font-bold text-sm text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)' }}>
                Notify me
              </button>
            </div>
            <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              By submitting your email you agree to our <Link href="/privacy" className="underline">Privacy Policy</Link>. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
