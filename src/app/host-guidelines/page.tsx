import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CheckCircle2, XCircle } from 'lucide-react'

const GREEN = '#0F3D22'

const RULES = [
  {
    title: 'Respond within 24 hours',
    body: 'When a traveler messages you, reply within 24 hours — even if just to say you are unavailable. Your response rate is shown publicly on your profile and affects your search ranking.',
  },
  {
    title: 'Be honest in your profile',
    body: 'Your bio, photos, categories, and rate must accurately represent what you offer. Misleading profiles are removed immediately and may result in a permanent ban.',
  },
  {
    title: 'Respect agreed meeting terms',
    body: 'If you agree to meet a traveler at a specific time and place, show up. Late cancellations (under 24 hours) must be communicated and offered a reschedule.',
  },
  {
    title: 'Maintain professional conduct',
    body: 'Treat every traveler with respect regardless of nationality, religion, gender, age, disability, or sexual orientation. Discrimination of any kind results in immediate removal.',
  },
  {
    title: 'Keep communication on-platform',
    body: 'Initial contact must happen through Offmap messaging. Sharing contact details is fine once a meeting is agreed, but soliciting traveler payments outside the platform to avoid the subscription system is prohibited.',
  },
  {
    title: 'Agree on rates before meeting',
    body: 'Your hourly rate or session price must be clearly communicated and agreed upon before the meeting takes place. Surprise charges after the fact violate our guidelines.',
  },
]

const PROHIBITED = [
  'Harassment, threats, or intimidation of travelers',
  'Requesting personal or financial information beyond what is needed to arrange a meeting',
  'Discrimination on any protected characteristic',
  'Creating fake profiles or misrepresenting your identity',
  'Soliciting tips, donations, or additional payments not agreed in advance',
  'Sharing traveler personal data with third parties',
  'Operating under multiple accounts',
  'Conducting activities that are illegal under German or EU law',
]

const SAFETY = [
  { icon: '🆔', title: 'ID verification required', body: 'All hosts must complete ID verification (passport or EU national ID) before going live. This protects travelers and builds community trust.' },
  { icon: '📍', title: 'Share your meeting point', body: 'Always agree on a specific, public meeting location. Never ask travelers to meet at a private residence for a first meeting.' },
  { icon: '📞', title: 'Emergency contact', body: 'For safety incidents during a meeting, call the German emergency number 110 (police) or 112 (fire/medical). Report any incident to Offmap within 24 hours at safety@offmap.com.' },
  { icon: '🛡️', title: 'Insurance', body: 'Offmap does not provide host liability insurance. We recommend hosts check their existing household or personal liability insurance (Haftpflichtversicherung) for coverage during hosted experiences.' },
]

export default function HostGuidelinesPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>For hosts</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px', lineHeight: 1.05 }}>Host community guidelines</h1>
              <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                These guidelines exist to protect travelers, hosts, and the quality of the Offmap community. They are a condition of your host account.
              </p>
              <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Last updated: January 2025 · Applies to all hosts in all Offmap operating territories</p>
            </div>
          </div>
        </div>

        {/* Core rules */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-10" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Core standards</h2>
            <div className="space-y-6">
              {RULES.map((r, i) => (
                <div key={r.title} className="flex gap-5 p-6 rounded-2xl" style={{ backgroundColor: '#F7FAF8', border: '1px solid rgba(15,61,34,0.08)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ backgroundColor: GREEN }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1.5" style={{ color: GREEN }}>{r.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#4A7A5C' }}>{r.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prohibited */}
        <div className="py-20 px-5 md:px-11" style={{ backgroundColor: '#FFF5F0' }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-4" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Strictly prohibited</h2>
            <p className="text-sm mb-8" style={{ color: '#4A7A5C' }}>The following result in immediate account suspension and may be reported to law enforcement authorities.</p>
            <div className="space-y-3">
              {PROHIBITED.map(item => (
                <div key={item} className="flex items-start gap-3 p-4 bg-white rounded-xl" style={{ border: '1px solid rgba(232,98,26,0.15)' }}>
                  <XCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#E8621A' }} />
                  <span className="text-sm" style={{ color: GREEN }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Safety */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl font-bold mb-10" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Safety & liability</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {SAFETY.map(s => (
                <div key={s.title} className="p-6 rounded-2xl" style={{ backgroundColor: '#F7FAF8', border: '1px solid rgba(15,61,34,0.08)' }}>
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <h3 className="font-bold text-base mb-2" style={{ color: GREEN }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4A7A5C' }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enforcement */}
        <div className="py-16 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl font-bold mb-6">Enforcement</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[['Warning', 'First violation of minor guidelines. Written notice sent via email.'],
                ['Suspension', '7-30 day account suspension for repeated or moderate violations.'],
                ['Permanent ban', 'Immediate removal for serious violations including discrimination or harassment.']
              ].map(([title, desc]) => (
                <div key={title} className="p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="font-bold text-sm mb-1 text-white">{title}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{desc}</div>
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.60)' }}>
              To report a violation: <a href="mailto:safety@offmap.com" className="underline text-white">safety@offmap.com</a> · All reports are handled confidentially within 48 hours.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
