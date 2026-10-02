import { mockDb } from '@/lib/mock/db'
import Link from 'next/link'

function fmt(cents: number) {
  return '€' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const KPI = [
  {
    label: 'Pending Approval',
    sub: 'Host applications',
    icon: '⏳',
    bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
    border: '#F59E0B',
    iconBg: '#F59E0B',
    iconColor: '#fff',
    labelColor: '#92400E',
    valueColor: '#451A03',
    subColor: '#B45309',
    href: '/admin/hosts?filter=pending',
  },
  {
    label: 'Approved Hosts',
    sub: 'Live on platform',
    icon: '✓',
    bg: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)',
    border: '#10B981',
    iconBg: '#10B981',
    iconColor: '#fff',
    labelColor: '#065F46',
    valueColor: '#022C22',
    subColor: '#047857',
    href: '/admin/hosts?filter=approved',
  },
  {
    label: 'Open Reports',
    sub: 'Require action',
    icon: '!',
    bg: 'linear-gradient(135deg,#FFE4E6,#FECDD3)',
    border: '#F43F5E',
    iconBg: '#F43F5E',
    iconColor: '#fff',
    labelColor: '#9F1239',
    valueColor: '#4C0519',
    subColor: '#BE123C',
    href: '/admin/reports',
  },
  {
    label: 'Total Users',
    sub: 'Travelers + hosts',
    icon: '◉',
    bg: 'linear-gradient(135deg,#DBEAFE,#BFDBFE)',
    border: '#3B82F6',
    iconBg: '#3B82F6',
    iconColor: '#fff',
    labelColor: '#1E3A8A',
    valueColor: '#0C1B4D',
    subColor: '#1D4ED8',
    href: '/admin/users',
  },
  {
    label: 'Subscriptions',
    sub: 'Active paid plans',
    icon: '◈',
    bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)',
    border: '#7C3AED',
    iconBg: '#7C3AED',
    iconColor: '#fff',
    labelColor: '#4C1D95',
    valueColor: '#2E1065',
    subColor: '#6D28D9',
    href: '/admin/users',
  },
  {
    label: 'Revenue',
    sub: 'Platform commission',
    icon: '€',
    bg: 'linear-gradient(135deg,#FFEDD5,#FED7AA)',
    border: '#F97316',
    iconBg: '#F97316',
    iconColor: '#fff',
    labelColor: '#7C2D12',
    valueColor: '#431407',
    subColor: '#C2410C',
    href: '/admin/users',
  },
]

const REASON_LABEL: Record<string, string> = {
  fake_profile: 'Fake Profile', inappropriate_content: 'Inappropriate Content',
  harassment: 'Harassment', scam: 'Scam', safety_concern: 'Safety Concern', other: 'Other',
}

export default async function AdminDashboard() {
  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return <p style={{ color: '#64748B', padding: 40 }}>Production mode — connect Supabase.</p>

  const stats = mockDb.getAdminStats()
  const pendingHosts = mockDb.getAllHosts('pending').slice(0, 6)
  const openReports = mockDb.getReports('open').slice(0, 5)

  const values = [
    stats.pendingHosts, stats.approvedHosts, stats.openReports,
    stats.totalUsers, stats.activeSubscriptions, fmt(stats.totalRevenueCents),
  ]

  return (
    <div style={{ padding: '36px 44px', maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <p style={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Overview</p>
          <h1 style={{ color: '#0F172A', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.8px' }}>Dashboard</h1>
        </div>
        <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {KPI.map((k, i) => (
          <Link key={k.label} href={k.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: k.bg,
              border: `1.5px solid ${k.border}40`,
              borderRadius: 14,
              padding: '22px 24px',
              boxShadow: `0 2px 8px ${k.border}20, 0 1px 2px rgba(0,0,0,0.06)`,
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Icon */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: k.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: k.iconColor, boxShadow: `0 2px 8px ${k.border}50` }}>
                  {k.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: k.labelColor, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, marginTop: 4 }}>
                  {k.sub}
                </span>
              </div>

              {/* Value */}
              <div style={{ fontSize: 40, fontWeight: 900, color: k.valueColor, lineHeight: 1, letterSpacing: '-2px', marginBottom: 8 }}>
                {values[i]}
              </div>

              {/* Label */}
              <div style={{ fontSize: 14, fontWeight: 700, color: k.labelColor }}>
                {k.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Pending hosts */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <h2 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.2px' }}>Host Applications</h2>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: '3px 0 0' }}>Pending your review</p>
            </div>
            <Link href="/admin/hosts?filter=pending" style={{ fontSize: 12, color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {pendingHosts.length === 0
            ? <p style={{ color: '#94A3B8', fontSize: 13, padding: '24px 22px' }}>All caught up — no pending hosts.</p>
            : pendingHosts.map((h, i) => (
              <Link key={h.id} href={`/admin/hosts/${h.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: i < pendingHosts.length - 1 ? '1px solid #F8FAFC' : 'none', transition: 'background 0.1s' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `hsl(${(h.fullName?.charCodeAt(0) ?? 65) * 5 % 360},55%,58%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                    {h.fullName?.charAt(0) ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700 }}>{h.fullName}</div>
                    <div style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>{h.flagEmoji} {h.cityName} · {h.categories.slice(0, 2).join(', ')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Pending</span>
                    <span style={{ color: '#CBD5E1' }}>›</span>
                  </div>
                </div>
              </Link>
            ))
          }
        </div>

        {/* Reports */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <h2 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.2px' }}>Safety Reports</h2>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: '3px 0 0' }}>Open · requiring action</p>
            </div>
            <Link href="/admin/reports" style={{ fontSize: 12, color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {openReports.length === 0
            ? <p style={{ color: '#94A3B8', fontSize: 13, padding: '24px 22px' }}>No open reports — all clear.</p>
            : openReports.map((r, i) => {
              const urgent = ['harassment', 'scam', 'safety_concern'].includes(r.reason)
              return (
                <Link key={r.id} href="/admin/reports" style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: i < openReports.length - 1 ? '1px solid #F8FAFC' : 'none', borderLeft: `3px solid ${urgent ? '#F43F5E' : '#F59E0B'}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#0F172A', fontSize: 14, fontWeight: 700 }}>{REASON_LABEL[r.reason] ?? r.reason}</div>
                      <div style={{ color: '#64748B', fontSize: 12, marginTop: 1 }}>{r.reporterName} reported {r.reportedName}</div>
                    </div>
                    <span style={{
                      background: urgent ? '#FFE4E6' : '#FEF3C7',
                      color: urgent ? '#9F1239' : '#92400E',
                      border: `1px solid ${urgent ? '#F43F5E' : '#F59E0B'}`,
                      fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
                      letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                    }}>
                      {r.status}
                    </span>
                  </div>
                </Link>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}
