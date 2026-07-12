import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GREEN = '#084E4E'

const EXPERIENCES = [
  { emoji: '🍜', category: 'Food & Drink', title: 'Street food deep-dive', city: 'Berlin', flag: '🇩🇪', host: 'Amira K.', duration: '3–4 hrs', price: '€25/hr', rating: '4.98', reviews: 143, desc: 'Skip the tourist döner and discover the hidden gems of Neukölln with a local who\'s eaten her way through every stall. Turkish markets, Vietnamese soup kitchens, and a rooftop bar not on any map.' },
  { emoji: '🎵', category: 'Nightlife', title: 'Underground Berlin music scene', city: 'Berlin', flag: '🇩🇪', host: 'Jonas K.', duration: '4–5 hrs', price: '€20/hr', rating: '4.91', reviews: 44, desc: 'A Berlin jazz musician takes you through Monday jam sessions, Thursday vinyl listening parties, and the warehouse shows that don\'t appear on any poster. The Berlin music scene that Berliners actually attend.' },
  { emoji: '🏛️', category: 'History', title: 'Berlin divided — living history walk', city: 'Berlin', flag: '🇩🇪', host: 'Klaus R.', duration: '3 hrs', price: '€35/hr', rating: '4.99', reviews: 54, desc: 'Klaus grew up in East Berlin. He was 15 when the Wall fell. Walk the city\'s divided past through the eyes of someone who lived it — the GDR buildings, the checkpoint stories, the overnight change.' },
  { emoji: '🚲', category: 'Nature & Outdoors', title: 'Amsterdam by bicycle — the local network', city: 'Amsterdam', flag: '🇳🇱', host: 'Yuki T.', duration: '4 hrs', price: '€22/hr', rating: '5.00', reviews: 211, desc: 'Yuki cycles 40km a day. She knows canal houses not in any guide, markets locals actually shop at, and a brown café open since 1786. Bicycle provided or bring your own.' },
  { emoji: '🎸', category: 'Art & Culture', title: 'Vienna after dark — jazz, wine and hidden concerts', city: 'Vienna', flag: '🇦🇹', host: 'Felix W.', duration: '3–4 hrs', price: '€32/hr', rating: '4.95', reviews: 67, desc: 'A Vienna musician gets you into the concerts not listed anywhere, the Heuriger winery open since 1683, and the jazz club where world-class musicians play for €12 a ticket.' },
  { emoji: '🍷', category: 'Food & Drink', title: 'Alfama food walk with a Fado family', city: 'Lisbon', flag: '🇵🇹', host: 'Marco V.', duration: '3 hrs', price: '€30/hr', rating: '4.96', reviews: 98, desc: 'Marco\'s grandfather was a Fado singer in Alfama. He\'ll take you to the tascas his family has eaten at for decades, the viewpoints locals actually use, and the wine bar in a medieval cellar.' },
]

const CATEGORIES = ['All', 'Food & Drink', 'History', 'Art & Culture', 'Nightlife', 'Nature & Outdoors', 'Family']

export default function ExperiencesPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Discover</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px', lineHeight: 1.05 }}>Experiences, not tours.</h1>
              <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>
                Every experience on Offmap is designed by a local who lives it — not a guide who memorised a script. Subscribe and unlock direct messaging with any host.
              </p>
              <div className="mt-8">
                <Link href="/auth/register"
                  className="inline-block px-8 py-3.5 rounded-full text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 20px rgba(232,98,26,0.40)' }}>
                  Browse all hosts →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Preview notice */}
        <div className="py-5 px-5 md:px-11 text-center border-b" style={{ backgroundColor: '#FFF9F5', borderColor: 'rgba(232,98,26,0.20)' }}>
          <p className="text-sm" style={{ color: '#4A8E8E' }}>
            🚧 <strong style={{ color: '#E8621A' }}>Preview — bookable experiences launch in 2027.</strong> The cards below are sample experiences. For now, message any host directly from{' '}
            <Link href="/search" className="font-semibold underline" style={{ color: '#E8621A' }}>Search →</Link>
          </p>
        </div>

        {/* Category pills */}
        <div className="px-5 md:px-11 py-6 bg-white border-b" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
          <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto">
            {CATEGORIES.map(c => (
              <button key={c} className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all"
                style={{ borderColor: 'rgba(8,78,78,0.15)', backgroundColor: c === 'All' ? GREEN : 'transparent', color: c === 'All' ? '#fff' : GREEN }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Experience cards */}
        <div className="py-16 px-5 md:px-11 bg-white">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXPERIENCES.map(e => (
              <div key={e.title} className="rounded-2xl overflow-hidden border group cursor-pointer hover:-translate-y-1 transition-all duration-300"
                style={{ borderColor: 'rgba(8,78,78,0.10)', boxShadow: '0 2px 8px rgba(8,78,78,0.08)' }}>
                {/* Cover */}
                <div className="h-44 flex items-center justify-center text-7xl" style={{ backgroundColor: '#F7FAF8' }}>
                  {e.emoji}
                </div>
                {/* Body */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#E5F2F2', color: GREEN }}>{e.category}</span>
                    <span className="text-xs" style={{ color: '#6EA880' }}>{e.flag} {e.city}</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-1" style={{ color: GREEN, letterSpacing: '-0.3px' }}>{e.title}</h3>
                  <p className="text-xs mb-3" style={{ color: '#4A8E8E' }}>With {e.host}</p>
                  <p className="text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: '#3D8055' }}>{e.desc}</p>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                    <div>
                      <span className="font-bold text-sm" style={{ color: '#E8621A' }}>{e.price}</span>
                      <span className="text-xs ml-1" style={{ color: '#6EA880' }}>· {e.duration}</span>
                    </div>
                    <div className="text-xs" style={{ color: '#6EA880' }}>⭐ {e.rating} ({e.reviews})</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="max-w-6xl mx-auto mt-10 text-center">
            <Link href="/search"
              className="inline-block px-8 py-3.5 rounded-full font-bold text-sm text-white"
              style={{ backgroundColor: GREEN }}>
              See all 1,300+ hosts →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
