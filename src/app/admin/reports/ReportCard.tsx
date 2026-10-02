'use client'
import { useState } from 'react'

interface Report {
  id: string
  reporterName: string | null
  reportedName: string | null
  reason: string
  details: string | null
  status: string
  adminNote: string | null
  createdAt: string
}

export default function ReportCard({
  report,
  reasonLabel,
  urgencyColor,
  statusStyle,
}: {
  report: Report
  reasonLabel: string
  urgencyColor: string
  statusStyle: { bg: string; text: string }
}) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(report.status)
  const [note, setNote] = useState(report.adminNote ?? '')
  const [saving, setSaving] = useState(false)

  const update = async (newStatus: string) => {
    setSaving(true)
    await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: report.id, status: newStatus, adminNote: note }),
    })
    setSaving(false)
    setStatus(newStatus)
  }

  const currentStyle = {
    open:       { bg: 'linear-gradient(135deg,#7F1D1D,#DC2626)',   text: '#FEE2E2' },
    reviewing:  { bg: 'linear-gradient(135deg,#1E3A5F,#2563EB)',   text: '#DBEAFE' },
    resolved:   { bg: 'linear-gradient(135deg,#064E3B,#059669)',   text: '#D1FAE5' },
    dismissed:  { bg: 'linear-gradient(135deg,#1E293B,#475569)',   text: '#CBD5E1' },
  }[status] ?? statusStyle

  return (
    <div style={{ background: '#1E293B', border: `1px solid ${urgencyColor}40`, borderLeft: `4px solid ${urgencyColor}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgencyColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 700 }}>{reasonLabel}</span>
            <span style={{ background: currentStyle.bg, color: currentStyle.text, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, textTransform: 'capitalize' as const }}>{status}</span>
          </div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Reported by <strong style={{ color: '#94A3B8' }}>{report.reporterName ?? 'Unknown'}</strong> against <strong style={{ color: '#94A3B8' }}>{report.reportedName ?? 'Unknown'}</strong>
            <span style={{ marginLeft: 8, color: '#475569' }}> · {new Date(report.createdAt).toLocaleDateString('en-GB')}</span>
          </div>
        </div>
        <span style={{ color: '#475569', fontSize: 18 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #334155' }}>
          {report.details && (
            <div style={{ margin: '16px 0 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Report details</p>
              <p style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{report.details}</p>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <p style={{ color: '#64748B', fontSize: 12, margin: '0 0 6px' }}>Admin note</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Internal note on this report…"
              rows={3}
              style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0', fontSize: 13, padding: '8px 12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {status !== 'reviewing' && status !== 'resolved' && (
              <button
                onClick={() => update('reviewing')}
                disabled={saving}
                style={{ padding: '8px 14px', background: 'linear-gradient(135deg,#1E3A5F,#2563EB)', color: '#fff', border: '2px solid #2563EB', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Mark reviewing
              </button>
            )}
            {status !== 'resolved' && (
              <button
                onClick={() => update('resolved')}
                disabled={saving}
                style={{ padding: '8px 14px', background: 'linear-gradient(135deg,#064E3B,#059669)', color: '#D1FAE5', border: '2px solid #059669', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Mark resolved
              </button>
            )}
            {status !== 'dismissed' && (
              <button
                onClick={() => update('dismissed')}
                disabled={saving}
                style={{ padding: '8px 14px', background: '#334155', color: '#94A3B8', border: '1px solid #475569', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
