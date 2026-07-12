import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { en } from '@/content/en'

const GREEN = '#084E4E'

// All the text for this page now comes from one central file (src/content/en.ts).
// This page only describes layout & styling — no hardcoded copy.
const t = en.about

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>{t.hero.eyebrow}</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px', lineHeight: 1.05 }}>
                {t.hero.titleLine1}<br />{t.hero.titleLine2}
              </h1>
              <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>
                {t.hero.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#E8621A' }}>{t.story.eyebrow}</p>
            <h2 className="font-serif text-4xl font-bold mb-8" style={{ color: GREEN, letterSpacing: '-1px' }}>{t.story.title}</h2>
            <div className="space-y-5 text-base leading-relaxed" style={{ color: '#3D8055' }}>
              {t.story.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="py-20 px-5 md:px-11" style={{ backgroundColor: '#F7FAF8' }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#E8621A' }}>{t.values.eyebrow}</p>
            <h2 className="font-serif text-4xl font-bold mb-12 text-center" style={{ color: GREEN, letterSpacing: '-1px' }}>{t.values.title}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {t.values.items.map(v => (
                <div key={v.title} className="bg-white rounded-2xl p-8 border" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                  <div className="text-3xl mb-4">{v.icon}</div>
                  <h3 className="font-serif text-xl font-bold mb-3" style={{ color: GREEN }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4A8E8E' }}>{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="py-20 px-5 md:px-11 bg-white">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#E8621A' }}>{t.team.eyebrow}</p>
            <h2 className="font-serif text-4xl font-bold mb-12 text-center" style={{ color: GREEN, letterSpacing: '-1px' }}>{t.team.title}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {t.team.members.map(m => (
                <div key={m.name} className="flex gap-5 p-6 rounded-2xl border" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-serif text-xl font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: GREEN }}>
                    {m.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-base" style={{ color: GREEN }}>{m.name}</div>
                    <div className="text-sm font-medium mb-2" style={{ color: '#E8621A' }}>{m.role} · {m.city}</div>
                    <p className="text-sm leading-relaxed" style={{ color: '#4A8E8E' }}>{m.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Company info */}
        <div className="py-16 px-5 md:px-11" style={{ backgroundColor: GREEN }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl font-bold text-white mb-8" style={{ letterSpacing: '-0.5px' }}>{t.company.title}</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              {t.company.fields.map(([label, value]) => (
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
