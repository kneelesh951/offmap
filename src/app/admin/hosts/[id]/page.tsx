import { mockDb } from '@/lib/mock/db'
import { notFound } from 'next/navigation'
import HostActionForm from './HostActionForm'

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  pending:  { bg: '#FFFBEB', text: '#B45309', border: '#FCD34D', dot: '#F59E0B' },
  approved: { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7', dot: '#10B981' },
  rejected: { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5', dot: '#EF4444' },
}

export default async function AdminHostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return <p style={{ color: '#64748B', padding: 40 }}>Production mode — connect Supabase.</p>

  const { id } = await params
  const profile = mockDb.hostProfiles.get(id)
  if (!profile) notFound()

  const user = mockDb.users.get(profile.userId)
  if (!user) notFound()

  const city = mockDb.cities.get(profile.cityId)
  const adminNotes = mockDb.getAdminNotes(profile.userId)
  const bookings = mockDb.getBookingsByHost(profile.userId)
  const s = STATUS_BADGE[profile.moderationStatus] ?? STATUS_BADGE.pending

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 13, color: '#94A3B8' }}>
        <a href="/admin/hosts" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>Host Queue</a>
        <span>›</span>
        <span style={{ color: '#475569' }}>{user.fullName}</span>
      </div>

      {/* Header card */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `hsl(${user.fullName.charCodeAt(0) * 5 % 360},45%,60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>
            {user.fullName.charAt(0)}
          </div>
          <div>
            <h1 style={{ color: '#0F172A', fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>{user.fullName}</h1>
            <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>{user.email} · Joined {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
          {profile.moderationStatus}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Profile details */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#0F172A', fontSize: 13, fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.1px' }}>Profile Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row label="City" value={`${city?.flagEmoji ?? ''} ${city?.name ?? ''}`} />
            <Row label="Headline" value={profile.headline} />
            <Row label="Neighbourhood" value={profile.neighborhood} />
            <Row label="Host type" value={profile.hostType} />
            <Row label="Rate" value={`€${(profile.hourlyRateCents / 100).toFixed(0)}/hr`} />
            <Row label="Languages" value={profile.languages.join(', ')} />
            <Row label="Categories" value={profile.categories.join(', ')} />
            <Row label="ID verification" value={profile.idVerificationStatus.replace(/_/g, ' ')} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#0F172A', fontSize: 13, fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.1px' }}>Platform Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row label="Rating" value={`${profile.avgRating}★ (${profile.reviewCount} reviews)`} />
            <Row label="Bookings" value={String(bookings.length)} />
            <Row label="Strikes" value={String(profile.strikeCount)} valueColor={profile.strikeCount > 0 ? '#DC2626' : undefined} />
            <Row label="Active" value={profile.isActive ? 'Yes' : 'No'} />
            <Row label="Payout frozen" value={profile.payoutFrozenUntil ? new Date(profile.payoutFrozenUntil).toLocaleDateString('en-GB') : '—'} />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: '#0F172A', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>Bio</h3>
        <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{profile.bio}</p>
      </div>

      {/* Interactive actions + notes */}
      <HostActionForm
        profileId={profile.id}
        moderationStatus={profile.moderationStatus}
        adminNotes={adminNotes}
      />
    </div>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string | null; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ color: '#94A3B8', fontSize: 12, minWidth: 110, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ color: valueColor ?? '#1E293B', fontSize: 13, fontWeight: 500, textTransform: 'capitalize' as const }}>{value ?? '—'}</span>
    </div>
  )
}
