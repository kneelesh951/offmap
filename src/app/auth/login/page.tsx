'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

const GREEN = '#084E4E'
const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectParam = searchParams.get('redirect') ?? ''
  const asParam = searchParams.get('as') ?? ''
  const isHostLogin = asParam === 'host' || redirectParam.includes('host-dashboard') || redirectParam.includes('host-onboarding')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Invalid email or password.')
        setLoading(false)
        return
      }
      const role = json.data?.user?.role
      const redirectTo = searchParams.get('redirect')
      const defaultDest = role === 'host' ? '/host-dashboard' : '/dashboard'
      window.location.href = redirectTo || defaultDest
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: GREEN }}>
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80"
          alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(7,51,74,0.85) 0%, rgba(8,78,78,0.80) 50%, rgba(6,59,59,0.88) 100%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <Link href="/" className="relative z-10 font-serif text-2xl font-bold text-white" style={{ letterSpacing: '-0.3px' }}>
          Off<span style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>map</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            {isHostLogin ? (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
                  style={{ backgroundColor: 'rgba(232,98,26,0.20)', color: '#F5A623', border: '1px solid rgba(232,98,26,0.30)' }}>
                  🏠 Host portal
                </div>
                <h2 className="font-serif text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-1px', lineHeight: 1.05 }}>
                  Welcome back,<br />local expert.
                </h2>
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)', maxWidth: 340 }}>
                  Sign in to manage your profile, view trip requests, and connect with travelers in your city.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-serif text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-1px', lineHeight: 1.05 }}>
                  The city through<br />a local&apos;s eyes.
                </h2>
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)', maxWidth: 340 }}>
                  Subscribe once. Connect with verified locals in Berlin, Lisbon, Amsterdam — and every city we add.
                </p>
              </>
            )}
          </div>
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', maxWidth: 380 }}>
            {isHostLogin ? (
              <>
                <p className="text-sm leading-relaxed italic mb-4" style={{ color: 'rgba(255,255,255,0.80)' }}>
                  &ldquo;I&apos;ve met people from 40 countries through Offmap. It pays for my rent and I love every session.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)' }}>AK</div>
                  <div>
                    <div className="text-sm font-semibold text-white">Amira K.</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Host · Berlin</div>
                  </div>
                  <div className="ml-auto" style={{ color: '#E8621A' }}>★★★★★</div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed italic mb-4" style={{ color: 'rgba(255,255,255,0.80)' }}>
                  &ldquo;Amira showed me a Berlin I would never have found in ten trips. One of my best travel memories.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)' }}>JK</div>
                  <div>
                    <div className="text-sm font-semibold text-white">James K.</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Traveler · Berlin</div>
                  </div>
                  <div className="ml-auto" style={{ color: '#E8621A' }}>★★★★★</div>
                </div>
              </>
            )}
          </div>
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

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Background image + overlay for right side too */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80"
          alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-[0.07]"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(170deg, #F8F5F0 0%, #EDE8E0 40%, #E6E0D6 100%)' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, #084E4E 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(12,123,123,0.06) 0%, transparent 65%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,98,26,0.04) 0%, transparent 65%)', transform: 'translate(-30%, 30%)' }} />

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-5 relative z-10" style={{ background: 'linear-gradient(135deg, rgba(7,51,74,0.95), rgba(8,78,78,0.95))' }}>
          <Link href="/" className="font-serif text-xl font-bold text-white">
            Off<span style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>map</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-white/70"><ArrowLeft size={14} /> Home</Link>
        </div>

        <div className="relative flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[420px]">
            <Link href="/" className="hidden lg:inline-flex items-center gap-1.5 text-xs mb-8 hover:opacity-70 transition-opacity font-semibold" style={{ color: GREEN }}>
              <ArrowLeft size={13} /> Back to home
            </Link>

            {IS_MOCK && (
              <div className="mb-6 rounded-2xl p-4 text-sm" style={{ background: 'rgba(255,251,235,0.90)', border: '1.5px solid rgba(252,211,77,0.45)', boxShadow: '0 2px 12px rgba(252,211,77,0.08)' }}>
                <div className="font-semibold text-amber-800 mb-1">Mock mode — demo accounts</div>
                <div className="text-xs text-amber-700 space-y-0.5">
                  <div>Traveler: <code className="bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold">traveler@demo.com</code> / <code className="bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold">demo1234</code></div>
                  <div>Host: <code className="bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold">host@demo.com</code> / <code className="bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold">demo1234</code></div>
                </div>
              </div>
            )}

            {/* Form card */}
            <div
              className="rounded-3xl p-8 lg:p-10"
              style={{
                background: 'rgba(255,255,255,0.70)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1.5px solid rgba(255,255,255,0.80)',
                boxShadow: '0 8px 40px rgba(8,78,78,0.08), 0 1px 3px rgba(8,78,78,0.04), inset 0 1px 0 rgba(255,255,255,0.90)',
              }}
            >
              <div className="mb-7">
                {isHostLogin && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
                    style={{ backgroundColor: '#FEF0E8', color: '#E8621A', border: '1px solid rgba(232,98,26,0.22)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    🏠 Host sign in
                  </div>
                )}
                <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.5px' }}>
                  {isHostLogin ? 'Sign in to your host account' : 'Welcome back'}
                </h1>
                <p className="text-sm" style={{ color: '#4A8E8E' }}>
                  {isHostLogin ? (
                    <>Not a host yet?{' '}<Link href="/become-a-host" className="font-semibold hover:underline" style={{ color: '#E8621A' }}>Join as a host</Link></>
                  ) : (
                    <>No account?{' '}<Link href="/auth/register" className="font-semibold hover:underline" style={{ color: '#E8621A' }}>Sign up free</Link></>
                  )}
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
                  <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    autoComplete="email" placeholder="you@example.com" required
                    className="input-field"
                    style={{ background: 'rgba(255,255,255,0.60)', borderColor: 'rgba(8,78,78,0.12)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Password</label>
                    <Link href="/auth/forgot-password" className="text-[12px] font-semibold hover:underline" style={{ color: '#E8621A' }}>Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password" placeholder="Enter your password" required
                      className="input-field pr-11"
                      style={{ background: 'rgba(255,255,255,0.60)', borderColor: 'rgba(8,78,78,0.12)' }}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                      style={{ color: '#6EA880' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 24px rgba(232,98,26,0.40)' }}>
                  {loading ? 'Signing in…' : 'Sign in →'}
                </button>
              </form>
            </div>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-5 mt-6">
              {[['🔒', 'Secure login'], ['🇪🇺', 'EU data'], ['✓', 'Encrypted']].map(([icon, label]) => (
                <div key={label as string} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'rgba(8,78,78,0.30)' }}>
                  <span className="text-sm">{icon}</span>{label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
