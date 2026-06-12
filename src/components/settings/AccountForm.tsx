'use client'

import { useState } from 'react'

interface AccountFormProps {
  email: string
  createdAt: string
  isMock: boolean
}

export function AccountForm({ email, createdAt, isMock }: AccountFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const memberSince = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const handleChangePassword = async () => {
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json() as { success: boolean; error?: { message: string } }
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to change password')
      } else {
        setSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError('Failed to change password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}>
        <h2 className="text-[15px] font-bold mb-5" style={{ color: '#084E4E' }}>Account information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{ background: '#F5F2EC' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(8,78,78,0.45)' }}>Email</p>
            <p className="text-[14px] font-semibold" style={{ color: '#084E4E' }}>{email}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#F5F2EC' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(8,78,78,0.45)' }}>Member since</p>
            <p className="text-[14px] font-semibold" style={{ color: '#084E4E' }}>{memberSince}</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}>
        <h2 className="text-[15px] font-bold mb-1" style={{ color: '#084E4E' }}>Change password</h2>
        <p className="text-[12px] mb-5" style={{ color: 'rgba(8,78,78,0.50)' }}>
          {isMock ? 'In mock mode, password changes are stored in memory and reset on restart.' : 'Update your password. You\'ll stay logged in on this device.'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold mb-1.5" style={{ color: '#084E4E' }}>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
              style={{ background: '#F5F2EC', border: '1.5px solid rgba(8,78,78,0.15)', color: '#084E4E' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#E8621A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-1.5" style={{ color: '#084E4E' }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
              style={{ background: '#F5F2EC', border: '1.5px solid rgba(8,78,78,0.15)', color: '#084E4E' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#E8621A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-1.5" style={{ color: '#084E4E' }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
              style={{ background: '#F5F2EC', border: '1.5px solid rgba(8,78,78,0.15)', color: '#084E4E' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#E8621A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <div className="pt-4">
          {error && (
            <p className="text-[13px] font-medium mb-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(232,98,26,0.10)', color: '#E8621A', border: '1px solid rgba(232,98,26,0.25)' }}>
              {error}
            </p>
          )}
          {success && (
            <p className="text-[13px] font-bold mb-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(45,106,79,0.12)', color: '#2D6A4F', border: '1px solid rgba(45,106,79,0.25)' }}>
              Password changed successfully!
            </p>
          )}
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#084E4E,#0a5e5e)', boxShadow: '0 4px 16px rgba(8,78,78,0.30)' }}
          >
            {saving ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </div>

      {/* Sessions info */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}>
        <h2 className="text-[15px] font-bold mb-1" style={{ color: '#084E4E' }}>Active sessions</h2>
        <p className="text-[12px] mb-4" style={{ color: 'rgba(8,78,78,0.50)' }}>
          You are currently logged in on this device.
        </p>
        <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: '#F5F2EC' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(8,78,78,0.10)' }}>
            💻
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold" style={{ color: '#084E4E' }}>Current session</p>
            <p className="text-[11px]" style={{ color: 'rgba(8,78,78,0.50)' }}>This browser · Active now</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(45,106,79,0.12)', color: '#2D6A4F' }}>
            Active
          </span>
        </div>
      </div>
    </div>
  )
}
