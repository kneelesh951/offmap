'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AdminNote { id: string; note: string; createdAt: string }

export default function HostActionForm({
  profileId, moderationStatus, adminNotes: initialNotes,
}: {
  profileId: string
  moderationStatus: string
  adminNotes: AdminNote[]
}) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const doAction = async (action: 'approve' | 'reject' | 'suspend', extraNote?: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/hosts/${profileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: extraNote }),
    })
    const j = await res.json()
    setLoading(false)
    if (j.success) router.push('/admin/hosts')
    else alert(j.error?.message ?? 'Action failed')
  }

  const addNote = async () => {
    if (!noteText.trim()) return
    const res = await fetch(`/api/admin/hosts/${profileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'note', note: noteText }),
    })
    const j = await res.json()
    if (j.success) { setNotes(prev => [j.data.note, ...prev]); setNoteText('') }
  }

  const btn = (label: string, onClick: () => void, style?: React.CSSProperties) => (
    <button onClick={onClick} disabled={loading} style={{
      padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: '1px solid transparent', transition: 'opacity 0.15s', opacity: loading ? 0.5 : 1,
      ...style,
    }}>{label}</button>
  )

  return (
    <>
      {/* Actions */}
      {moderationStatus === 'pending' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#0F172A', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>Actions</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {btn('Approve host', () => doAction('approve'), { background: '#ECFDF5', color: '#047857', border: '1px solid #6EE7B7' })}
            {btn('Reject application', () => setShowRejectModal(true), { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5' })}
          </div>
        </div>
      )}

      {moderationStatus === 'approved' && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#0F172A', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>Actions</h3>
          {btn('Suspend profile', () => doAction('suspend'), { background: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D' })}
        </div>
      )}

      {/* Internal notes */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: '#0F172A', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>Internal Notes</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {notes.length === 0 && <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>No notes yet — add one below.</p>}
          {notes.map(n => (
            <div key={n.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ color: '#334155', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{n.note}</p>
              <p style={{ color: '#94A3B8', fontSize: 11, margin: '5px 0 0' }}>{new Date(n.createdAt).toLocaleString('en-GB')}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNote()}
            placeholder="Add internal note…"
            style={{ flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, color: '#1E293B', fontSize: 13, padding: '9px 12px', outline: 'none' }}
          />
          <button onClick={addNote} style={{ padding: '9px 16px', background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Add note
          </button>
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ color: '#0F172A', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Reject application</h3>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 16px' }}>This reason will be sent to the host by email.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Your bio doesn't describe what you specifically offer travelers. Please reapply with more detail."
              rows={4}
              style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, color: '#1E293B', fontSize: 13, padding: '10px 12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => { setShowRejectModal(false); doAction('reject', rejectReason) }}
                disabled={loading}
                style={{ flex: 1, padding: '10px 0', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm rejection
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ padding: '10px 18px', background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
