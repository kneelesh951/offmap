import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GREEN = '#0F3D22'

const TEAM = [
  { name: 'Neelesh', role: 'Founder & CEO', city: 'Frankfurt', bio: 'Visionary entrepreneur and the driving force behind Offmap. Passionate about authentic travel experiences and connecting people across cultures, Neelesh built Offmap to reimagine how travelers discover and experience cities — through the eyes of the people who live there.' },
]

const VALUES = [
  { icon: '🤝', title: 'Authentic connection', body: 'We believe the best travel experiences happen between real people — not through packaged tours or algorithm-curated content.' },
  { icon: '🔒', title: 'Safety first', body: 'Every host is ID-verified. Every traveler is reviewed. We maintain strict community standards and a zero-tolerance policy for harassment.' },
  { icon: '🌍', title: 'Local economy', body: 'We take zero commission from host earnings. Our flat subscription model means locals keep 100% of what they negotiate.' },
  { icon: '🇪🇺', title: 'Privacy by design', body: 'Built from day one for GDPR compliance. Your data is stored in the EU, never sold, and you can request full deletion at any time.' },
]

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>About Offmap</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px', lineHeight: 1.05 }}>
                We believe every city has<br />a story worth sharing.
              </h1>
              <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>
                Offmap connects curious travelers with verified locals across Europe — not tour guides, not influencers, but real people who know and love their city.
              </p>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#E8621A' }}>Our Story</p>
            <h2 className="font-serif text-4xl font-bold mb-8" style={{ color: GREEN, letterSpacing: '-1px' }}>Started with a bold idea. Now live across 8 European cities.</h2>
            <div className="space-y-5 text-base leading-relaxed" style={{ color: '#3D8055' }}>
              <p>In 2023, Neelesh had a frustration shared by millions of travelers: tourists were paying €80 for scripted group bus tours while locals — people with real stories, deep knowledge, and genuine passion for their cities — had no platform to share it.</p>
              <p>He built the first version of Offmap and launched it quietly with 12 hosts, and watched something remarkable happen: travelers were writing reviews saying it was the best experience of their entire trip. Not the best tour. The best part of their trip.</p>
              <p>Today Offmap operates in 8 cities across Europe with over 1,300 verified hosts. Every host sets their own rate. Every traveler subscribes once and connects with as many locals as they like. The platform takes no commission on host earnings — ever.</p>
              <p>We are registered as Offmap GmbH in Frankfurt, Germany, and operate under German and EU law. Our servers and data are hosted entirely within the European Union, in compliance with GDPR.</p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="py-20 px-5 md:px-11" style={{ backgroundColor: '#F7FAF8' }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#E8621A' }}>What we stand for</p>
            <h2 className="font-serif text-4xl font-bold mb-12 text-center" style={{ color: GREEN, letterSpacing: '-1px' }}>Our values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {VALUES.map(v => (
                <div key={v.title} className="bg-white rounded-2xl p-8 border" style={{ borderColor: 'rgba(15,61,34,0.10)' }}>
                  <div className="text-3xl mb-4">{v.icon}</div>
                  <h3 className="font-serif text-xl font-bold mb-3" style={{ color: GREEN }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4A7A5C' }}>{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#E8621A' }}>The team</p>
            <h2 className="font-serif text-4xl font-bold mb-12 text-center" style={{ color: GREEN, letterSpacing: '-1px' }}>People behind Offmap</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {TEAM.map(m => (
                <div key={m.name} className="flex gap-5 p-6 rounded-2xl border" style={{ borderColor: 'rgba(15,61,34,0.10)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-serif text-xl font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: GREEN }}>
                    {m.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-base" style={{ color: GREEN }}>{m.name}</div>
                    <div className="text-sm font-medium mb-2" style={{ color: '#E8621A' }}>{m.role} · {m.city}</div>
                    <p className="text-sm leading-relaxed" style={{ color: '#4A7A5C' }}>{m.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Company info */}
        <div className="py-16 px-5 md:px-11" style={{ backgroundColor: GREEN }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl font-bold text-white mb-8" style={{ letterSpacing: '-0.5px' }}>Company information</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              {[
                ['Legal name', 'Offmap GmbH'],
                ['Registered office', 'Taunusanlage 8, 60329 Frankfurt am Main, Germany'],
                ['Registration court', 'Amtsgericht Frankfurt am Main'],
                ['Registration number', 'HRB 124783'],
                ['VAT ID', 'DE 312 456 789'],
                ['Founder & CEO', 'Neelesh'],
                ['Founded', '2023'],
                ['Contact', 'hello@offmap.com'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
                  <div className="text-sm font-medium text-white">{value}</div>
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
