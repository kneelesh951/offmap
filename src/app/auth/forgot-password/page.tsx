'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

const GREEN = '#084E4E'
const ORANGE = '#E8621A'
const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? 'Something went wrong.'); return }
      setSent(true)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: GREEN }}>
        <img src="https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1400&q=80"
          alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,rgba(255,255,255,0.06) 0%,transparent 50%)' }} />

        <Link href="/" className="relative z-10 font-serif text-2xl font-bold text-white" style={{ letterSpacing: '-0.3px' }}>
          Off<span style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>map</span>
        </Link>

        <div className="relative z-10">
          <h2 className="font-serif text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-1px', lineHeight: 1.05 }}>
            No worries —<br />we've got you.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)', maxWidth: 340 }}>
            Enter your email and we'll send a secure link to reset your password. It expires in 1 hour.
          </p>
        </div>

        <div className="relative z-10 flex gap-8">
          {[['1,300+', 'Verified hosts'], ['8', 'Cities'], ['4.97', 'Avg rating']].map(([v, l]) => (
            <div key={l}>
              <div className="font-serif text-2xl font-bold text-white">{v}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-5" style={{ backgroundColor: GREEN }}>
          <Link href="/" className="font-serif text-xl font-bold text-white">
            Off<span style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>map</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-white/70"><ArrowLeft size={14} /> Home</Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[400px]">
            <Link href="/auth/login" className="hidden lg:inline-flex items-center gap-1.5 text-xs mb-8 hover:opacity-70 transition-opacity" style={{ color: GREEN }}>
              <ArrowLeft size={13} /> Back to sign in
            </Link>

            {IS_MOCK && (
              <div className="mb-6 rounded-xl p-4 text-sm" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
                <div className="font-semibold text-amber-800 mb-1">Mock mode</div>
                <div className="text-xs text-amber-700">
                  Password reset emails are logged to the server console. No real email is sent.
                </div>
              </div>
            )}

            {sent ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: '#E5F2F2' }}>
                  <CheckCircle size={32} style={{ color: GREEN }} />
                </div>
                <h1 className="font-serif text-3xl font-bold mb-3" style={{ color: GREEN, letterSpacing: '-0.5px' }}>
                  Check your inbox
                </h1>
                <p className="text-sm text-gray-500 mb-2">
                  We've sent a password reset link to
                </p>
                <p className="font-bold text-sm mb-6" style={{ color: GREEN }}>{email}</p>
                <p className="text-xs text-gray-400 mb-8">
                  The link expires in 1 hour. Check your spam folder if you don't see it.
                </p>
                <div className="space-y-3">
                  <button onClick={() => { setSent(false); setEmail('') }}
                    className="w-full py-3 rounded-full text-[13px] font-semibold border transition-colors hover:bg-green-50"
                    style={{ borderColor: 'rgba(8,78,78,0.22)', color: GREEN }}>
                    Try a different email
                  </button>
                  <Link href="/auth/login"
                    className="w-full py-3 rounded-full text-white text-[13px] font-bold flex items-center justify-center transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: '0 4px 20px rgba(232,98,26,0.35)' }}>
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: '#E5F2F2' }}>
                    <Mail size={22} style={{ color: GREEN }} />
                  </div>
                  <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.5px' }}>
                    Forgot password?
                  </h1>
                  <p className="text-sm" style={{ color: '#4A8E8E' }}>
                    Enter your email and we'll send a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="text-[13px] px-4 py-3 rounded-xl font-medium"
                      style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                      Email address
                    </label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      autoComplete="email" placeholder="you@example.com" required
                      className="input-field" />
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: '0 4px 24px rgba(232,98,26,0.40)' }}>
                    {loading ? 'Sending link…' : 'Send reset link →'}
                  </button>

                  <p className="text-center text-sm" style={{ color: '#4A8E8E' }}>
                    Remember your password?{' '}
                    <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: ORANGE }}>
                      Sign in
                    </Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
