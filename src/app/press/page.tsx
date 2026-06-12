import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GREEN = '#084E4E'

const RELEASES = [
  { date: 'March 2025', title: 'Offmap expands to Rome and Vienna, reaching 8 European cities', tag: 'Expansion' },
  { date: 'January 2025', title: 'Offmap surpasses 1,000 verified hosts and €500K in traveler bookings', tag: 'Milestone' },
  { date: 'November 2024', title: 'Offmap raises €1.2M pre-seed from Berlin-based travel tech investors', tag: 'Funding' },
  { date: 'September 2024', title: 'Offmap launches in Lisbon and Amsterdam, doubling active host network', tag: 'Expansion' },
  { date: 'June 2024', title: 'Offmap opens host onboarding to the public in Berlin', tag: 'Launch' },
]

const FACTS = [
  ['Founded', '2023, Berlin, Germany'],
  ['Legal form', 'GmbH (Gesellschaft mit beschränkter Haftung)'],
  ['Headquarters', 'Invalidenstraße 115, 10115 Berlin'],
  ['Active cities', '8 across Europe'],
  ['Verified hosts', '1,300+'],
  ['Avg host rating', '4.97 / 5.00'],
  ['Subscription plans', 'Day (€6) · Week (€12) · Month (€18) · Annual (€49)'],
  ['Commission on host earnings', '0% — hosts keep 100%'],
  ['Data residency', 'EU only (Frankfurt, Germany)'],
]

export default function PressPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Media & Press</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px' }}>Press room</h1>
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.70)' }}>News, facts, and media resources for journalists and researchers.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="mailto:press@offmap.com"
                  className="px-6 py-3 rounded-full text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)' }}>
                  Press enquiries →
                </a>
                <a href="#kit"
                  className="px-6 py-3 rounded-full font-semibold text-sm"
                  style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}>
                  Download media kit
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Press releases */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-10" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Press releases</h2>
            <div className="space-y-4">
              {RELEASES.map(r => (
                <div key={r.title} className="flex gap-5 p-6 rounded-2xl cursor-pointer group" style={{ border: '1px solid rgba(8,78,78,0.10)', backgroundColor: '#F7FAF8' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: GREEN }}>{r.tag}</span>
                      <span className="text-xs" style={{ color: '#6EA880' }}>{r.date}</span>
                    </div>
                    <h3 className="font-semibold text-base group-hover:underline" style={{ color: GREEN }}>{r.title}</h3>
                  </div>
                  <span className="text-2xl mt-1">→</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Company facts */}
        <div className="py-20 px-5 md:px-11" style={{ backgroundColor: '#F7FAF8' }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-10" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Company facts</h2>
            <div className="divide-y rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid rgba(8,78,78,0.10)' }}>
              {FACTS.map(([label, value]) => (
                <div key={label} className="flex gap-8 px-6 py-4">
                  <div className="w-48 flex-shrink-0 text-sm font-semibold" style={{ color: '#6EA880' }}>{label}</div>
                  <div className="text-sm" style={{ color: GREEN }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Media kit */}
        <div className="py-20 px-5 md:px-11 bg-white" id="kit">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-4" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Media kit</h2>
            <p className="text-sm mb-8" style={{ color: '#4A8E8E' }}>Download assets for editorial use. Please credit "Offmap GmbH" when publishing.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: '🎨', label: 'Brand guidelines', desc: 'Colors, typography, logo usage rules' },
                { icon: '🖼️', label: 'Logo pack', desc: 'SVG + PNG in all variants and sizes' },
                { icon: '📸', label: 'Photography', desc: 'High-res editorial images of hosts and cities' },
              ].map(item => (
                <div key={item.label} className="p-6 rounded-2xl text-center cursor-pointer" style={{ border: '1px solid rgba(8,78,78,0.10)', backgroundColor: '#F7FAF8' }}>
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="font-bold text-sm mb-1" style={{ color: GREEN }}>{item.label}</div>
                  <div className="text-xs" style={{ color: '#6EA880' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="py-16 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl font-bold mb-4">Press contact</h2>
            <p className="mb-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>For interviews, fact-checking, and media enquiries:</p>
            <p className="text-white font-medium">press@offmap.com · +49 30 123 456 78</p>
            <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.45)' }}>Response within one business day · Embargo requests honoured · On-record only unless agreed otherwise</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
