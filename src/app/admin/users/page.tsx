import { mockDb } from '@/lib/mock/db'
import Link from 'next/link'

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return <p style={{ color: '#64748B', padding: 40 }}>Production mode — connect Supabase.</p>

  const { q } = await searchParams
  const users = q ? mockDb.searchAllUsers(q) : []
  const totalUsers = Array.from(mockDb.users.values()).filter(u => u.role !== 'admin').length
  const totalHosts = Array.from(mockDb.users.values()).filter(u => u.role === 'host').length
  const totalTravelers = Array.from(mockDb.users.values()).filter(u => u.role === 'traveler').length

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>People</p>
        <h1 style={{ color: '#0F172A', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Users</h1>
        <p style={{ color: '#94A3B8', fontSize: 13, margin: '6px 0 0' }}>
          {totalUsers} total · {totalHosts} hosts · {totalTravelers} travelers
        </p>
      </div>

      {/* Search */}
      <form method="GET" style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 520 }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          autoFocus
          style={{ flex: 1, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 9, color: '#1E293B', fontSize: 13, padding: '9px 14px', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
        />
        <button type="submit" style={{ padding: '9px 20px', background: '#6366F1', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {!q && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '48px 0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Enter a name or email to search users</p>
        </div>
      )}

      {q && users.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '48px 0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ color: '#94A3B8', fontSize: 14 }}>No users found for &ldquo;{q}&rdquo;</p>
        </div>
      )}

      {users.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 80px', padding: '10px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            {['User', 'Role', 'Subscription', 'Joined', ''].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {users.map((u, i) => {
            const roleStyle = u.role === 'host'
              ? { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7' }
              : { bg: '#EEF2FF', text: '#4338CA', border: '#A5B4FC' }
            return (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 80px', padding: '13px 20px', alignItems: 'center', borderBottom: i < users.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `hsl(${(u.fullName?.charCodeAt(0) ?? 65) * 5 % 360},45%,60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {u.fullName?.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 600 }}>{u.fullName}</div>
                    <div style={{ color: '#94A3B8', fontSize: 11 }}>{u.email}</div>
                  </div>
                </div>
                <div>
                  <span style={{ background: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}`, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, textTransform: 'capitalize' as const }}>{u.role}</span>
                </div>
                <div>
                  {u.hasActiveSub
                    ? <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #6EE7B7', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5 }}>Active</span>
                    : <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>}
                </div>
                <div style={{ color: '#475569', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('en-GB')}</div>
                <div>
                  {u.hostProfile && (
                    <Link href={`/admin/hosts/${u.hostProfile.id}`} style={{ color: '#6366F1', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      View host →
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
