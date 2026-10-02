import { mockDb } from '@/lib/mock/db'
import ReportCard from './ReportCard'

const REASON_LABEL: Record<string, string> = {
  fake_profile: 'Fake profile',
  inappropriate_content: 'Inappropriate content',
  harassment: 'Harassment',
  scam: 'Scam / off-platform payments',
  safety_concern: 'Safety concern',
  other: 'Other',
}

const URGENCY: Record<string, string> = {
  harassment: '#EF4444',
  scam: '#EF4444',
  safety_concern: '#EF4444',
  fake_profile: '#F59E0B',
  inappropriate_content: '#F59E0B',
  other: '#64748B',
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  open:       { bg: 'linear-gradient(135deg,#7F1D1D,#DC2626)',   text: '#FEE2E2' },
  reviewing:  { bg: 'linear-gradient(135deg,#1E3A5F,#2563EB)',   text: '#DBEAFE' },
  resolved:   { bg: 'linear-gradient(135deg,#064E3B,#059669)',   text: '#D1FAE5' },
  dismissed:  { bg: 'linear-gradient(135deg,#1E293B,#475569)',   text: '#CBD5E1' },
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return <p style={{ color: '#94A3B8' }}>Production mode — connect Supabase.</p>

  const { filter } = await searchParams
  const activeFilter = (filter ?? 'open') as 'open' | 'reviewing' | 'resolved' | 'dismissed' | 'all'
  const reports = mockDb.getReports(activeFilter)

  const counts = {
    open:      mockDb.getReports('open').length,
    reviewing: mockDb.getReports('reviewing').length,
    resolved:  mockDb.getReports('resolved').length,
    all:       mockDb.getReports('all').length,
  }

  const FILTERS = [
    { key: 'open',      label: `Open (${counts.open})` },
    { key: 'reviewing', label: `Reviewing (${counts.reviewing})` },
    { key: 'resolved',  label: `Resolved (${counts.resolved})` },
    { key: 'all',       label: `All (${counts.all})` },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#F1F5F9', fontSize: 26, fontWeight: 700, margin: 0 }}>Safety Reports</h1>
        <p style={{ color: '#64748B', marginTop: 6, fontSize: 14 }}>Abuse reports submitted by users</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {FILTERS.map(f => (
          <a
            key={f.key}
            href={`/admin/reports?filter=${f.key}`}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              background: activeFilter === f.key ? 'linear-gradient(135deg,#C05621,#F07830)' : '#1E293B',
              color: activeFilter === f.key ? '#fff' : '#94A3B8',
              border: activeFilter === f.key ? '2px solid #F07830' : '2px solid #334155',
            }}
          >
            {f.label}
          </a>
        ))}
      </div>

      {reports.length === 0 ? (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#475569', fontSize: 16 }}>No reports in this category</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              reasonLabel={REASON_LABEL[r.reason] ?? r.reason}
              urgencyColor={URGENCY[r.reason] ?? '#64748B'}
              statusStyle={STATUS_STYLE[r.status] ?? STATUS_STYLE.open}
            />
          ))}
        </div>
      )}
    </div>
  )
}
