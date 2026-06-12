'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PrivacyForm() {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExportData = async () => {
    setExporting(true)
    setError(null)
    try {
      const res = await fetch('/api/me/data-export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `offmap-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch {
      setError('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/me/delete', { method: 'POST' })
      const json = await res.json() as { success: boolean; error?: { message: string } }
      if (!json.success) {
        setError(json.error?.message ?? 'Deletion failed')
      } else {
        router.push('/')
      }
    } catch {
      setError('Deletion failed. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* GDPR overview */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(8,78,78,0.08)' }}>
            🇪🇺
          </div>
          <div>
            <h2 className="text-[15px] font-bold mb-1" style={{ color: '#084E4E' }}>Your data is protected</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(8,78,78,0.60)' }}>
              Offmap is fully GDPR compliant. Your data is stored in the EU (Frankfurt, Germany), never sold to third parties, and you have full control over it at all times.
            </p>
          </div>
        </div>
      </div>

      {/* Data export */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}>
        <h2 className="text-[15px] font-bold mb-1" style={{ color: '#084E4E' }}>Export your data</h2>
        <p className="text-[12px] mb-4" style={{ color: 'rgba(8,78,78,0.50)' }}>
          Download a copy of all your personal data as a JSON file. This includes your profile, conversations, reviews, and subscription history.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#084E4E,#0a5e5e)', boxShadow: '0 4px 16px rgba(8,78,78,0.30)' }}
          >
            {exporting && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.40)" strokeWidth="3" />
                <path d="M12 2 a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {exporting ? 'Preparing...' : 'Download my data'}
          </button>
          {exportSuccess && (
            <span className="text-[12px] font-bold" style={{ color: '#2D6A4F' }}>Downloaded!</span>
          )}
        </div>
      </div>

      {/* Data we store */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}>
        <h2 className="text-[15px] font-bold mb-4" style={{ color: '#084E4E' }}>What we store</h2>
        <div className="space-y-3">
          {[
            { icon: '👤', label: 'Profile data', desc: 'Name, bio, photo, home city, languages, interests' },
            { icon: '💬', label: 'Conversations', desc: 'Messages with hosts (kept for legal audit trail)' },
            { icon: '⭐', label: 'Reviews', desc: 'Reviews you have written and received' },
            { icon: '💳', label: 'Financial records', desc: 'Subscription history (kept 10 years per German law)' },
            { icon: '📊', label: 'Usage data', desc: 'Login timestamps, search queries (anonymized after 7 days)' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#F5F2EC' }}>
              <span className="text-[18px] mt-0.5">{item.icon}</span>
              <div>
                <p className="text-[13px] font-bold" style={{ color: '#084E4E' }}>{item.label}</p>
                <p className="text-[11px]" style={{ color: 'rgba(8,78,78,0.55)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete account */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid rgba(220,38,38,0.20)', boxShadow: '0 2px 16px rgba(220,38,38,0.06)' }}>
        <h2 className="text-[15px] font-bold mb-1" style={{ color: '#DC2626' }}>Delete account</h2>
        <p className="text-[12px] mb-4" style={{ color: 'rgba(8,78,78,0.50)' }}>
          This will permanently anonymize your personal data. Conversations will be redacted but kept for audit trail. Financial records are retained for 10 years as required by German tax law. This action cannot be undone.
        </p>

        {error && (
          <p className="text-[13px] font-medium mb-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.20)' }}>
            {error}
          </p>
        )}

        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1.5px solid rgba(220,38,38,0.25)' }}
          >
            I want to delete my account
          </button>
        ) : (
          <div className="rounded-xl p-4" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <p className="text-[13px] font-bold mb-3" style={{ color: '#DC2626' }}>
              Type DELETE to confirm
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none mb-3"
              style={{ background: '#fff', border: '1.5px solid rgba(220,38,38,0.25)', color: '#084E4E' }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteText !== 'DELETE' || deleting}
                className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#DC2626' }}
              >
                {deleting ? 'Deleting...' : 'Permanently delete my account'}
              </button>
              <button
                type="button"
                onClick={() => { setDeleteConfirm(false); setDeleteText('') }}
                className="px-6 py-2.5 rounded-full text-[13px] font-bold transition-all"
                style={{ color: 'rgba(8,78,78,0.60)', background: '#F5F2EC' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
