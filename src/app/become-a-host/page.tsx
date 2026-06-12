'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/lib/validators'
import { Eye, EyeOff, CheckCircle2, ArrowRight, Star } from 'lucide-react'

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
const GREEN = '#084E4E'

const HOW_IT_WORKS = [
  { step: '01', icon: '📝', title: 'Create your profile', desc: 'Write your story, pick your categories and set your rate. Takes about 5 minutes.' },
  { step: '02', icon: '🔍', title: 'Travelers find you', desc: 'Subscribed travelers browse by city. Your profile shows when you match their interests.' },
  { step: '03', icon: '🤝', title: 'Meet and explore', desc: 'Chat, agree on a plan, show them your city. You set the terms — always.' },
]

const EARNINGS = [
  { hours: '2 hrs/week', low: 160, high: 360 },
  { hours: '5 hrs/week', low: 400, high: 900 },
  { hours: '10 hrs/week', low: 800, high: 1800 },
]

const HOST_REVIEWS = [
  { name: 'Amira K.', city: 'Berlin', flag: '🇩🇪', quote: "I've met people from 40 countries through Offmap. It pays for my rent and I love every session.", rating: 5, initials: 'AK' },
  { name: 'Marco V.', city: 'Lisbon', flag: '🇵🇹', quote: 'I was already showing friends around for free. Now I do the same thing and earn €300/month.', rating: 5, initials: 'MV' },
]

export default function BecomeAHostPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<RegisterInput>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'host' } })

  const password = watch('password') ?? ''
  const passwordChecks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(password) },
    { label: 'One number',            ok: /[0-9]/.test(password) },
  ]

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    try {
      if (IS_MOCK) {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, role: 'host' }) })
        const json = await res.json()
        if (!res.ok) { setServerError(json.error?.message ?? 'Something went wrong'); return }
        router.push('/host-onboarding'); router.refresh(); return
      }
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signUp({ email: data.email, password: data.password, options: { data: { full_name: data.fullName, role: 'host' }, emailRedirectTo: `${window.location.origin}/auth/callback` } })
      if (error) { setServerError(error.message); return }
      setSuccess(true)
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg,#084E4E,#0a5e5e)' }}>
      <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)' }}>
          <CheckCircle2 size={32} color="white" />
        </div>
        <h2 className="font-serif text-2xl font-bold mb-3" style={{ color: GREEN }}>Check your email</h2>
        <p className="text-[14px] leading-relaxed mb-6" style={{ color: '#4A8E8E' }}>We sent a confirmation link. Click it to activate your account.</p>
        <Link href="/auth/login" className="text-[13px] font-semibold hover:underline" style={{ color: '#E8621A' }}>Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FAF7F2, #F2EDE4)' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', background: 'rgba(8,78,78,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 800, color: 'white', fontSize: 21, letterSpacing: '-0.04em' }}>Off</span>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 800, fontSize: 21, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>map</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.50)' }}>Already a host?</span>
          <Link href="/auth/login?as=host" style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 999, color: 'rgba(255,255,255,0.90)', border: '1px solid rgba(255,255,255,0.20)', backgroundColor: 'rgba(255,255,255,0.07)', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </header>

      {/* ── Two columns: green left | form right ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 66px)' }}>

        {/* LEFT: dark green marketing panel */}
        <div style={{ background: 'linear-gradient(160deg,#0C3520 0%,#084E4E 50%,#133526 100%)', overflowY: 'auto', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 400, height: 400, background: 'radial-gradient(circle,rgba(232,98,26,0.15) 0%,transparent 70%)', transform: 'translate(30%,-30%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', padding: '52px 48px', maxWidth: 580, margin: '0 auto' }}>

            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, backgroundColor: 'rgba(232,98,26,0.20)', color: '#F5A623', border: '1px solid rgba(232,98,26,0.32)', marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#F5A623', display: 'inline-block' }} />
              Free to join · No listing fees · 0% commission
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 800, color: 'white', fontSize: 46, letterSpacing: '-0.04em', lineHeight: 1.04, marginBottom: 20 }}>
              Get paid to show<br />travelers{' '}
              <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>your city.</em>
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.58)', marginBottom: 40, maxWidth: 420 }}>
              You already know the best hidden bars, the real food spots, the history nobody teaches.
              Offmap connects you with curious travelers who want exactly that.
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 44 }}>
              {[{ val: '4.97★', label: 'Avg rating' }, { val: '1,300+', label: 'Active hosts' }, { val: '€25–45', label: 'Per hour' }].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: '#F5A623', marginBottom: 4 }}>{s.val}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8621A', marginBottom: 8 }}>How it works</div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 20, letterSpacing: '-0.02em' }}>Three steps to your first booking.</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 44 }}>
              {HOW_IT_WORKS.map(step => (
                <div key={step.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px' }}>
                  <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{step.icon}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,166,35,0.60)', letterSpacing: '0.05em' }}>{step.step}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{step.title}</span>
                    </div>
                    <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.46)', margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '24px', marginBottom: 44 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8621A', marginBottom: 4 }}>Earnings potential</div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>What you could earn</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 20 }}>Based on €20–€45/hr</p>
              {EARNINGS.map(row => (
                <div key={row.hours} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 88, fontSize: 12, fontWeight: 600, color: 'white' }}>{row.hours}</div>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(row.high / 1800) * 100}%`, background: 'linear-gradient(90deg,#E8621A,#F5A623)', borderRadius: 999 }} />
                  </div>
                  <div style={{ width: 96, fontSize: 12, fontWeight: 700, color: '#F5A623', textAlign: 'right' }}>€{row.low}–€{row.high}<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.28)' }}>/mo</span></div>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#E8621A', marginBottom: 8 }}>From our hosts</div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 20, letterSpacing: '-0.02em' }}>Real people. Real earnings.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {HOST_REVIEWS.map(h => (
                <div key={h.name} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: h.rating }).map((_, i) => <Star key={i} size={10} style={{ fill: '#F5A623', color: '#F5A623' }} />)}
                  </div>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.6, fontStyle: 'italic', color: 'rgba(255,255,255,0.78)', flex: 1, margin: 0 }}>&ldquo;{h.quote}&rdquo;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#E8621A,#F07830)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{h.initials}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{h.name}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.36)' }}>{h.flag} {h.city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: form — centred inside the right half */}
        <div style={{ position: 'relative', background: '#0F2416', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px', overflowY: 'auto' }}>

          {/* Travel background image with dark overlay */}
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80"
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 0 }}
          />
          {/* Dark glossy overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'linear-gradient(160deg, rgba(15,35,22,0.88) 0%, rgba(20,40,28,0.82) 40%, rgba(12,30,18,0.90) 100%)', backdropFilter: 'blur(2px)' }} />

          {/* Subtle dot-grid texture — right panel only */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'radial-gradient(circle, rgba(8,78,78,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          {/* Warm orange glow — top-right corner */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,98,26,0.14) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

          {/* Soft green glow — bottom-left corner */}
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,78,78,0.10) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ width: '100%', maxWidth: 440, position: 'sticky', top: 24, zIndex: 1 }}>

            {/* Form card */}
            <div style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 28, padding: '36px 36px', border: '2px solid transparent', backgroundClip: 'padding-box', boxShadow: '0 24px 80px rgba(8,78,78,0.18), 0 8px 24px rgba(8,78,78,0.08), inset 0 1px 0 rgba(255,255,255,0.80), inset 0 -1px 0 rgba(8,78,78,0.04), 0 0 0 2px rgba(8,78,78,0.08), 0 0 0 4px rgba(232,98,26,0.06)' }}>

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'linear-gradient(135deg, #FEF0E8, #FDE0CC)', color: '#D4540F', border: '1.5px solid rgba(232,98,26,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 14, boxShadow: '0 2px 8px rgba(232,98,26,0.15)' }}>
                  Join as a host
                </div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 800, color: GREEN, fontSize: 28, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
                  Create your host account
                </h2>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Already have an account?{' '}
                  <Link href="/auth/login?as=host" style={{ fontWeight: 700, color: '#E8621A', textDecoration: 'none' }}>Sign in</Link>
                </p>
              </div>

              {IS_MOCK && (
                <div style={{ marginBottom: 20, borderRadius: 12, padding: '12px 14px', fontSize: 12, fontWeight: 500, backgroundColor: '#FFFBEB', border: '1px solid rgba(245,158,11,0.25)', color: '#92400E' }}>
                  Mock mode — any email and password works.
                </div>
              )}
              {serverError && (
                <div style={{ marginBottom: 20, fontSize: 13, padding: '12px 16px', borderRadius: 12, fontWeight: 500, backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.22)', color: '#DC2626' }}>
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <input {...register('role')} type="hidden" value="host" />

                {/* Full name */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4A8E8E', marginBottom: 6 }}>Full name</label>
                  <input {...register('fullName')} type="text" autoComplete="name" placeholder="Your full name"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, outline: 'none', border: '2px solid rgba(8,78,78,0.12)', backgroundColor: 'rgba(248,251,249,0.70)', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 2px 4px rgba(8,78,78,0.04), 0 1px 0 rgba(255,255,255,0.60)', color: '#063B3B', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    onFocus={e => { e.target.style.borderColor = '#084E4E'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(8,78,78,0.07)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(8,78,78,0.18)'; e.target.style.backgroundColor = '#F8FBF9'; e.target.style.boxShadow = 'none' }}
                  />
                  {errors.fullName && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>{errors.fullName.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4A8E8E', marginBottom: 6 }}>Email address</label>
                  <input {...register('email')} type="email" autoComplete="email" placeholder="you@example.com"
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, outline: 'none', border: '2px solid rgba(8,78,78,0.12)', backgroundColor: 'rgba(248,251,249,0.70)', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 2px 4px rgba(8,78,78,0.04), 0 1px 0 rgba(255,255,255,0.60)', color: '#063B3B', boxSizing: 'border-box', transition: 'all 0.15s' }}
                    onFocus={e => { e.target.style.borderColor = '#084E4E'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(8,78,78,0.07)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(8,78,78,0.18)'; e.target.style.backgroundColor = '#F8FBF9'; e.target.style.boxShadow = 'none' }}
                  />
                  {errors.email && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#4A8E8E', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input {...register('password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Min 8 chars, 1 uppercase, 1 number"
                      style={{ width: '100%', padding: '14px 48px 14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, outline: 'none', border: '2px solid rgba(8,78,78,0.12)', backgroundColor: 'rgba(248,251,249,0.70)', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 2px 4px rgba(8,78,78,0.04), 0 1px 0 rgba(255,255,255,0.60)', color: '#063B3B', boxSizing: 'border-box', transition: 'all 0.15s' }}
                      onFocus={e => { e.target.style.borderColor = '#084E4E'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(8,78,78,0.07)' }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(8,78,78,0.18)'; e.target.style.backgroundColor = '#F8FBF9'; e.target.style.boxShadow = 'none' }}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#4A8E8E', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {passwordChecks.map(c => (
                        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: c.ok ? GREEN : '#9CA3AF' }}>
                          <CheckCircle2 size={13} style={{ color: c.ok ? '#E8621A' : '#D1D5DB', flexShrink: 0 }} />
                          {c.label}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.password && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>{errors.password.message}</p>}
                </div>

                {/* GDPR */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: '14px 16px', background: 'linear-gradient(135deg, #F0FAF4, #E8F5ED)', border: '1.5px solid rgba(8,78,78,0.14)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.60)' }}>
                  <input {...register('gdprConsent')} type="checkbox" id="gdpr" style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer', flexShrink: 0, accentColor: GREEN }} />
                  <label htmlFor="gdpr" style={{ fontSize: 13, lineHeight: 1.6, cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                    I agree to the{' '}
                    <Link href="/privacy" style={{ fontWeight: 700, color: '#E8621A', textDecoration: 'none' }}>Privacy Policy</Link>
                    {' '}and{' '}
                    <Link href="/terms" style={{ fontWeight: 700, color: '#E8621A', textDecoration: 'none' }}>Terms of Service</Link>.
                  </label>
                </div>
                {errors.gdprConsent && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{errors.gdprConsent.message}</p>}

                {/* CTA */}
                <button type="submit" disabled={isSubmitting}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', borderRadius: 18, color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1, background: 'linear-gradient(135deg,#E8621A,#D4540F,#C44A0D)', boxShadow: '0 8px 32px rgba(232,98,26,0.45), inset 0 1px 0 rgba(255,255,255,0.25)', transition: 'transform 0.15s', letterSpacing: '-0.01em' }}
                  onMouseEnter={e => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}>
                  {isSubmitting ? 'Creating account…' : <><span>Create host account</span><ArrowRight size={16} /></>}
                </button>

                {!IS_MOCK && (
                  <>
                    <div style={{ position: 'relative', margin: '4px 0' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}><div style={{ width: '100%', borderTop: '1px solid rgba(8,78,78,0.08)' }} /></div>
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}><span style={{ backgroundColor: 'white', padding: '0 12px', fontSize: 12, color: '#9CA3AF' }}>or</span></div>
                    </div>
                    <button type="button" onClick={async () => {
                      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
                      createSupabaseBrowserClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { role: 'host' } } })
                    }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 14, fontSize: 13, fontWeight: 600, border: '2px solid rgba(8,78,78,0.14)', color: GREEN, backgroundColor: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(8,78,78,0.06)', transition: 'transform 0.15s' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Continue with Google
                    </button>
                  </>
                )}
              </form>

              {/* Trust signals */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1.5px solid rgba(8,78,78,0.10)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[['€0', 'To join'], ['0%', 'Commission'], ['24h', 'Review']].map(([val, label]) => (
                  <div key={label} style={{ borderRadius: 14, padding: '12px 8px', textAlign: 'center', background: 'linear-gradient(160deg, #EDF5F0, #E0EDE5)', border: '1.5px solid rgba(8,78,78,0.12)', boxShadow: '0 2px 8px rgba(8,78,78,0.06), inset 0 1px 0 rgba(255,255,255,0.70)' }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 2 }}>{val}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4A8E8E' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, marginTop: 16, color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.01em' }}>
              Your profile is reviewed within <span style={{ color: '#F5A623', fontWeight: 700 }}>24 hours</span> of joining.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
