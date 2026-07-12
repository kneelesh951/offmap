'use client'
import { useState } from 'react'
import Link from 'next/link'

export function GiftCardWaitlist() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Gift card waitlist',
          email,
          topic: 'other',
          message: `[gift-card-waitlist] ${email} signed up for the gift-card launch notification.`,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('sent')
      setEmail('')
    } catch {
      setError('Network error — please try again.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
        ✅ You're on the list. We'll email you the moment gift cards launch.
      </p>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={status === 'sending'}
          placeholder="your@email.com"
          className="flex-1 px-4 py-3 rounded-full text-sm focus:outline-none disabled:opacity-60"
          style={{
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff',
          }}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="px-6 py-3 rounded-full font-bold text-sm text-white flex-shrink-0 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)' }}
        >
          {status === 'sending' ? 'Sending…' : 'Notify me'}
        </button>
      </form>
      {error && (
        <p className="text-xs mt-3" style={{ color: '#FCA5A5' }}>
          {error}
        </p>
      )}
      <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
        By submitting your email you agree to our{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        . Unsubscribe at any time.
      </p>
    </>
  )
}
