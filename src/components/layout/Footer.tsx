'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const GREEN = '#0F3D22'

const COLS = [
  {
    title: 'EXPLORE',
    links: [
      ['Browse Hosts',  '/search'],
      ['Experiences',   '/experiences'],
      ['Gift Cards',    '/gift-cards'],
      ['Pricing',       '/pricing'],
    ],
  },
  {
    title: 'HOSTS',
    links: [
      ['Become a Host',    '/become-a-host'],
      ['Guidelines',       '/host-guidelines'],
      ['Dashboard',        '/host-dashboard'],
      ['FAQ',              '/faq'],
      ['Community',        '/community'],
    ],
  },
  {
    title: 'COMPANY',
    links: [
      ['About Us',       '/about'],
      ['Press',          '/press'],
      ['Contact',        '/contact'],
      ['Privacy Policy', '/privacy'],
      ['Terms',          '/terms'],
      ['Impressum',      '/impressum'],
    ],
  },
]

const CITIES = [
  { flag: '🇩🇪', name: 'Berlin' },
  { flag: '🇩🇪', name: 'Hamburg' },
  { flag: '🇩🇪', name: 'Cologne' },
  { flag: '🇵🇹', name: 'Lisbon' },
  { flag: '🇳🇱', name: 'Amsterdam' },
  { flag: '🇪🇸', name: 'Barcelona' },
]

const SOCIAL = [
  { label: '𝕏',  href: '#' },
  { label: '◎',  href: '#' },
  { label: 'in', href: '#' },
  { label: '♪',  href: '#' },
]

export function Footer() {
  const [pulse, setPulse] = useState(true)
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t1 = setInterval(() => setPulse(p => !p), 700)
    const t2 = setInterval(() => setFrame(f => (f + 1) % 3), 400)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  return (
    <footer style={{ background: '#132d1c' }}>
      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-14 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Brand column */}
          <div>
            {/* Logo */}
            <Link href="/" className="inline-flex items-center mb-5 select-none group">
              <span className="font-serif font-extrabold text-white group-hover:opacity-90 transition-opacity"
                style={{ fontSize: '24px', letterSpacing: '-0.04em' }}>
                Off
              </span>
              <span className="font-serif font-extrabold group-hover:opacity-90 transition-opacity"
                style={{
                  fontSize: '24px',
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(135deg,#E8621A,#F5A623)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                map
              </span>
            </Link>

            <p className="text-[14px] leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '220px' }}>
              Go where the map ends. Real locals. Real cities. No tour buses, no scripts.
            </p>

            {/* Social icons */}
            <div className="flex gap-2.5">
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all hover:bg-white/15"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.11)', color: 'rgba(255,255,255,0.55)' }}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <h4 className="text-[11px] font-bold tracking-[0.12em] mb-6"
                style={{ color: 'rgba(255,255,255,0.38)' }}>
                {col.title}
              </h4>
              <ul className="space-y-4">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[14px] font-medium transition-colors"
                      style={{ color: 'rgba(255,255,255,0.70)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.70)')}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* App download column */}
          <div>
            <h4 className="text-[11px] font-bold tracking-[0.12em] mb-4"
              style={{ color: 'rgba(255,255,255,0.38)' }}>
              GET THE APP
            </h4>

            {/* Flashy Coming Soon badge */}
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full relative overflow-hidden"
              style={{
                background: pulse
                  ? 'linear-gradient(135deg, rgba(245,166,35,0.28), rgba(232,98,26,0.22))'
                  : 'linear-gradient(135deg, rgba(232,98,26,0.22), rgba(245,166,35,0.28))',
                border: `1.5px solid ${pulse ? 'rgba(245,166,35,0.70)' : 'rgba(232,98,26,0.55)'}`,
                boxShadow: pulse ? '0 0 14px rgba(245,166,35,0.45), inset 0 1px 0 rgba(255,255,255,0.12)' : '0 0 6px rgba(232,98,26,0.20)',
                transition: 'all 0.35s ease',
              }}>
              {/* Sweeping shimmer */}
              <span className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                  transform: `translateX(${(frame - 1) * 120}%)`,
                  transition: 'transform 0.4s linear',
                }} />
              {/* Pulsing dot */}
              <span className="relative w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: pulse ? '#F5A623' : '#E8621A',
                  boxShadow: pulse ? '0 0 0 3px rgba(245,166,35,0.30), 0 0 10px rgba(245,166,35,0.60)' : '0 0 0 2px rgba(232,98,26,0.20)',
                  transition: 'all 0.35s ease',
                }} />
              <span className="relative text-[11px] font-extrabold tracking-widest"
                style={{
                  color: pulse ? '#F5C842' : '#F5A623',
                  textShadow: pulse ? '0 0 8px rgba(245,200,66,0.70)' : 'none',
                  transition: 'all 0.35s ease',
                  letterSpacing: '0.10em',
                }}>
                COMING SOON
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* App Store */}
              <button disabled
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-not-allowed relative overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.06) 100%)',
                  border: '1.5px solid rgba(255,255,255,0.22)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}>
                <div className="absolute inset-0 rounded-xl opacity-0"
                  style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.06),transparent)' }} />
                <svg width="22" height="22" viewBox="0 0 24 24" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }} fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.50)' }}>Download on the</div>
                  <div className="text-[15px] font-bold text-white leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.30)' }}>App Store</div>
                </div>
              </button>

              {/* Google Play */}
              <button disabled
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-not-allowed relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.06) 100%)',
                  border: '1.5px solid rgba(255,255,255,0.22)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}>
                <svg width="22" height="22" viewBox="0 0 24 24" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}>
                  <path d="M3.18 23.76c.3.17.64.24.99.2L14.64 12 11 8.36 3.18 23.76z" fill="#EA4335"/>
                  <path d="M20.46 10.37l-2.6-1.49-3.7 3.7 3.7 3.7 2.63-1.51c.75-.43.75-1.47-.03-1.9z" fill="#FBBC04"/>
                  <path d="M2.01 1.05C1.84 1.28 1.75 1.57 1.75 1.9v20.2c0 .33.09.62.26.85L14.03 12 2.01 1.05z" fill="#4285F4"/>
                  <path d="M14.64 12l1.83-1.83-10.1-5.81L14.64 12z" fill="#34A853"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.50)' }}>Get it on</div>
                  <div className="text-[15px] font-bold text-white leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.30)' }}>Google Play</div>
                </div>
              </button>
            </div>

            <p className="text-[11px] mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>
              iPhone & Android apps launching soon.
            </p>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
            © {new Date().getFullYear()} Offmap GmbH · Registered in Frankfurt, Germany · All rights reserved
          </p>

          {/* City pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {CITIES.map(c => (
              <span key={c.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>
                {c.flag} {c.name}
              </span>
            ))}
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>
              +7 more
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
