'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'

const GREEN = '#0F3D22'
const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordChecks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'One number', ok: /[0-9]/.test(password) },
  ]
  const passwordValid = passwordChecks.every(c => c.ok)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!email) { setError('Please enter your email.'); return }
    if (!passwordValid) { setError('Password must be at least 8 characters with one uppercase letter and one number.'); return }
    if (!gdpr) { setError('Please accept the Privacy Policy to continue.'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, role: 'traveler', gdprConsent: true }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      // Mock mode — logged in immediately, redirect to welcome
      if (IS_MOCK) {
        router.push('/welcome')
        router.refresh()
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: '#EAF5EE' }}>
          <CheckCircle2 size={32} style={{ color: GREEN }} />
        </div>
        <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: GREEN }}>Check your email</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#4A7A5C' }}>
          We sent a confirmation link. Click it to activate your account.
        </p>
        <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: '#E8621A' }}>Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: GREEN }}>
        <img src="https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1400&q=80"
          alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,rgba(255,255,255,0.06) 0%,transparent 50%)' }} />

        <Link href="/" className="relative z-10 font-serif text-2xl font-bold text-white" style={{ letterSpacing: '-0.3px' }}>
          Off<span style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>map</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-serif text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-1px', lineHeight: 1.05 }}>
              Meet a local.<br />Live the city.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)', maxWidth: 340 }}>
              One subscription. Unlimited hosts in Berlin, Lisbon, Amsterdam — and every city we add.
            </p>
          </div>
          <div className="space-y-3">
            {['Browse all hosts before subscribing', 'Plans from €6/day', 'Direct messaging with locals', 'Real locals — not tour guides'].map(p => (
              <div key={p} className="flex items-center gap-3">
                <CheckCircle2 size={14} style={{ color: '#E8621A', flexShrink: 0 }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-8">
          {[['€6/day', 'Cheapest plan'], ['8', 'Cities'], ['4.97★', 'Avg rating']].map(([v, l]) => (
            <div key={l}>
              <div className="font-serif text-xl font-bold text-white">{v}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
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
            <Link href="/" className="hidden lg:inline-flex items-center gap-1.5 text-xs mb-8 hover:opacity-70 transition-opacity" style={{ color: GREEN }}>
              <ArrowLeft size={13} /> Back to home
            </Link>

            {IS_MOCK && (
              <div className="mb-5 rounded-xl p-3 text-xs" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
                Mock mode — any email works. Check terminal for welcome email.
              </div>
            )}

            <div className="mb-7">
              <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Create your account</h1>
              <p className="text-sm" style={{ color: '#4A7A5C' }}>
                Already have an account?{' '}
                <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: '#E8621A' }}>Sign in</Link>
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="text-[13px] px-4 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  autoComplete="name" placeholder="Your full name" required
                  className="input-field" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" placeholder="you@example.com" required
                  className="input-field" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password" placeholder="Min 8 chars, 1 uppercase, 1 number" required
                    className="input-field pr-11" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: '#6EA880' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 px-1">
                    {passwordChecks.map(c => (
                      <div key={c.label} className="flex items-center gap-2 text-[12px] font-medium transition-colors"
                        style={{ color: c.ok ? GREEN : '#9CA3AF' }}>
                        <CheckCircle2 size={12} style={{ color: c.ok ? '#E8621A' : '#D1D5DB', flexShrink: 0 }} />
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 py-1">
                <input type="checkbox" id="gdpr" checked={gdpr} onChange={e => setGdpr(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded" style={{ accentColor: GREEN }} />
                <label htmlFor="gdpr" className="text-[12px] leading-relaxed cursor-pointer" style={{ color: '#4A7A5C' }}>
                  I agree to the{' '}
                  <Link href="/privacy" className="font-semibold underline underline-offset-2" style={{ color: '#E8621A' }}>Privacy Policy</Link>
                  {' '}and{' '}
                  <Link href="/terms" className="font-semibold underline underline-offset-2" style={{ color: '#E8621A' }}>Terms of Service</Link>.
                </label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 24px rgba(232,98,26,0.40)' }}>
                {loading ? 'Creating account…' : 'Create free account →'}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: '#6EA880' }}>
              Want to host instead?{' '}
              <Link href="/become-a-host" className="font-semibold hover:underline" style={{ color: '#E8621A' }}>
                Become a host →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
