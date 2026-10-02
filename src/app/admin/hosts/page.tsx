import { mockDb } from '@/lib/mock/db'
import Link from 'next/link'

const STATUS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  pending:  { bg: '#FFFBEB', text: '#B45309', border: '#FCD34D', dot: '#F59E0B' },
  approved: { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7', dot: '#10B981' },
  rejected: { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5', dot: '#EF4444' },
}

export default async function AdminHostsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return <p style={{ color: '#64748B', padding: 40 }}>Production mode — connect Supabase.</p>

  const { filter } = await searchParams
  const activeFilter = (filter ?? 'pending') as 'pending' | 'approved' | 'rejected' | 'all'
  const hosts = mockDb.getAllHosts(activeFilter)

  const counts = {
    pending:  mockDb.getAllHosts('pending').length,
    approved: mockDb.getAllHosts('approved').length,
    rejected: mockDb.getAllHosts('rejected').length,
    all:      mockDb.getAllHosts('all').length,
  }

  const TABS = [
    { key: 'pending',  label: 'Pending',  count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
    { key: 'all',      label: 'All',      count: counts.all },
  ]

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Moderation</p>
        <h1 style={{ color: '#0F172A', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Host Queue</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24 }}>
        {TABS.map(t => (
          <Link key={t.key} href={`/admin/hosts?filter=${t.key}`} style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '6px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: activeFilter === t.key ? '#fff' : 'transparent',
              color: activeFilter === t.key ? '#0F172A' : '#64748B',
              boxShadow: activeFilter === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              <span style={{
                background: activeFilter === t.key ? '#F1F5F9' : 'transparent',
                color: activeFilter === t.key ? '#475569' : '#94A3B8',
                fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
              }}>{t.count}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 80px', gap: 0, padding: '10px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          {['Host', 'City', 'Categories', 'Rate', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {hosts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            No hosts in this category
          </div>
        ) : (
          hosts.map((h, i) => {
            const s = STATUS[h.moderationStatus] ?? STATUS.pending
            return (
              <Link key={h.id} href={`/admin/hosts/${h.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 80px',
                  gap: 0, padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < hosts.length - 1 ? '1px solid #F8FAFC' : 'none',
                  transition: 'background 0.1s', cursor: 'pointer',
                }}>
                  {/* Host */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${(h.fullName?.charCodeAt(0) ?? 65) * 5 % 360},45%,60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {h.fullName?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 600 }}>{h.fullName}</div>
                      <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>{h.email}</div>
                    </div>
                  </div>
                  {/* City */}
                  <div style={{ color: '#475569', fontSize: 13 }}>{h.flagEmoji} {h.cityName}</div>
                  {/* Categories */}
                  <div style={{ color: '#475569', fontSize: 12 }}>{h.categories.slice(0,2).join(', ')}</div>
                  {/* Rate */}
                  <div style={{ color: '#475569', fontSize: 13 }}>€{((h.hourlyRateCents ?? 0) / 100).toFixed(0)}/hr</div>
                  {/* Status */}
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
                      {h.moderationStatus}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <p style={{ color: '#CBD5E1', fontSize: 12, marginTop: 12 }}>{hosts.length} result{hosts.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
