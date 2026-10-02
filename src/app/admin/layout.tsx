import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { mockGetUser } from '@/lib/mock/auth'
import Link from 'next/link'

export const metadata = {
  title: 'Admin — Offmap',
  robots: 'noindex, nofollow',
}

const NAV = [
  { href: '/admin',         label: 'Dashboard',  icon: <GridIcon /> },
  { href: '/admin/hosts',   label: 'Host Queue', icon: <HostIcon /> },
  { href: '/admin/reports', label: 'Reports',    icon: <FlagIcon /> },
  { href: '/admin/users',   label: 'Users',      icon: <UsersIcon /> },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isMock = process.env.MOCK_MODE === 'true'
  if (isMock) {
    const token = (await cookies()).get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user || user.role !== 'admin') redirect('/auth/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: 240, flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0,
        background: '#0F172A',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#EA580C,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>O</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.2px' }}>Offmap</div>
              <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>Admin Console</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px' }}>
          <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 8px 6px' }}>Main</div>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
              borderRadius: 7, color: '#94A3B8', textDecoration: 'none', fontSize: 13,
              fontWeight: 500, marginBottom: 2, transition: 'background 0.12s, color 0.12s',
            }}>
              <span style={{ opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', textDecoration: 'none', fontSize: 12 }}>
            <span style={{ fontSize: 10 }}>←</span> Back to site
          </Link>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────── */}
      <div style={{ flex: 1, marginLeft: 240, background: '#F8FAFC', minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  )
}

/* ── Inline SVG icons ───────────────────────────────────────────────── */
function GridIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function HostIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function FlagIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}
function UsersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
