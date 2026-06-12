'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, FileCheck, Video, X } from 'lucide-react'

const GREEN = '#084E4E'
const TERRA = '#E8621A'

// ─── Data ────────────────────────────────────────────────────────────────────

const CITIES = [
  { id: 'city-berlin',    name: 'Berlin',    flag: '🇩🇪', country: 'Germany' },
  { id: 'city-lisbon',    name: 'Lisbon',    flag: '🇵🇹', country: 'Portugal' },
  { id: 'city-amsterdam', name: 'Amsterdam', flag: '🇳🇱', country: 'Netherlands' },
  { id: 'city-barcelona', name: 'Barcelona', flag: '🇪🇸', country: 'Spain' },
  { id: 'city-munich',    name: 'Munich',    flag: '🇩🇪', country: 'Germany' },
  { id: 'city-vienna',    name: 'Vienna',    flag: '🇦🇹', country: 'Austria' },
  { id: 'city-prague',    name: 'Prague',    flag: '🇨🇿', country: 'Czech Republic' },
  { id: 'city-rome',      name: 'Rome',      flag: '🇮🇹', country: 'Italy' },
  { id: 'city-budapest',  name: 'Budapest',  flag: '🇭🇺', country: 'Hungary' },
  { id: 'city-warsaw',    name: 'Warsaw',    flag: '🇵🇱', country: 'Poland' },
]

const CATEGORIES = [
  { value: 'food-drink',  label: 'Food & Drink',    icon: '🍜' },
  { value: 'art-culture', label: 'Art & Culture',    icon: '🎨' },
  { value: 'nature',      label: 'Nature & Parks',   icon: '🌿' },
  { value: 'nightlife',   label: 'Nightlife',        icon: '🎵' },
  { value: 'history',     label: 'History',          icon: '🏛️' },
  { value: 'photography', label: 'Photography',      icon: '📸' },
  { value: 'wine-beer',   label: 'Wine & Beer',      icon: '🍷' },
  { value: 'markets',     label: 'Markets',          icon: '🛍️' },
  { value: 'sports',      label: 'Sports & Active',  icon: '🏃' },
  { value: 'cooking',     label: 'Cooking Classes',  icon: '🍳' },
  { value: 'wellness',    label: 'Wellness',         icon: '🧘' },
  { value: 'family',      label: 'Family & Kids',    icon: '👨‍👩‍👧' },
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ar', label: 'Arabic' },
  { code: 'jp', label: 'Japanese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'pl', label: 'Polish' },
]

const TOTAL_STEPS = 8

const DOC_TYPES = [
  { value: 'passport', label: 'Passport', icon: '🛂' },
  { value: 'drivers_license', label: "Driver's License", icon: '🪪' },
  { value: 'national_id', label: 'National ID Card', icon: '🆔' },
]

const STEP_LABELS = [
  'Your City',
  'Your Story',
  'Expertise',
  'Languages',
  'Your Rate',
  'Verification',
  'Intro Video',
  'Review',
]

const STEP_HEADLINES: { title: string; subtitle: string }[] = [
  { title: '1,300+ hosts across\n8 European cities.', subtitle: 'Join them and start earning by sharing what you love about your city.' },
  { title: 'Travelers book hosts\nwith real stories.', subtitle: 'Be specific — mention real places, real neighborhoods, real experiences.' },
  { title: 'Help travelers find\nexactly what they want.', subtitle: 'Your categories appear in search filters — pick what you actually know best.' },
  { title: 'You speak the language,\nwe find the match.', subtitle: 'Travelers filter by language to find someone they can connect with naturally.' },
  { title: 'You set the price.\nYou keep the earnings.', subtitle: 'No commission on your rate — Offmap charges travelers a flat subscription fee instead.' },
  { title: 'Trust is everything.\nVerification takes 24hrs.', subtitle: 'A verified badge makes travelers 3x more likely to message you.' },
  { title: 'A quick intro\ngoes a long way.', subtitle: '30 seconds of you being yourself — hosts with videos get 2x more bookings.' },
  { title: "You're almost live.", subtitle: 'Review your profile and launch. We approve most hosts within 24 hours.' },
]

const BG_IMAGE = 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=80'

// ─── Component ───────────────────────────────────────────────────────────────

export default function HostOnboarding() {
  const router = useRouter()
  const [step, setStep]           = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Validate session on mount — catch stale cookies before user fills 8 steps
  useEffect(() => {
    fetch('/api/me')
      .then(r => {
        if (!r.ok) router.push('/auth/login?redirect=/host-onboarding&as=host')
        else setAuthChecked(true)
      })
      .catch(() => router.push('/auth/login?redirect=/host-onboarding&as=host'))
  }, [router])

  // Form state
  const [cityId,     setCityId]     = useState('')
  const [headline,   setHeadline]   = useState('')
  const [bio,        setBio]        = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [languages,  setLanguages]  = useState<string[]>([])
  const [rate,       setRate]       = useState(25)

  // ID verification (step 6)
  const [idDocType,     setIdDocType]     = useState('')
  const [idFile,        setIdFile]        = useState<File | null>(null)
  const [idUploaded,    setIdUploaded]    = useState(false)
  const idInputRef = useRef<HTMLInputElement>(null)

  // Intro video (step 7, optional)
  const [videoFile,      setVideoFile]      = useState<File | null>(null)
  const [videoUploaded,  setVideoUploaded]  = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const toggleCategory = (val: string) =>
    setCategories(prev => prev.includes(val) ? prev.filter(c => c !== val) : prev.length < 6 ? [...prev, val] : prev)

  const toggleLanguage = (code: string) =>
    setLanguages(prev => prev.includes(code) ? prev.filter(l => l !== code) : prev.length < 10 ? [...prev, code] : prev)

  const canNext = () => {
    if (step === 1) return cityId !== ''
    if (step === 2) return headline.length >= 10 && bio.length >= 50
    if (step === 3) return categories.length >= 1
    if (step === 4) return languages.length >= 1
    if (step === 5) return rate >= 10 && rate <= 300
    if (step === 6) return idUploaded
    if (step === 7) return true
    return true
  }

  const handleIdConfirm = () => {
    if (!idFile || !idDocType) return
    setIdUploaded(true)
  }

  const handleVideoConfirm = () => {
    if (!videoFile) return
    setVideoUploaded(true)
  }

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/host/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId,
          headline,
          bio,
          categories,
          languages,
          hourlyRateCents: rate * 100,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login?redirect=/host-onboarding&as=host')
          return
        }
        setError(json.error?.message ?? 'Something went wrong')
        return
      }

      if (idFile && idDocType) {
        const form = new FormData()
        form.append('document', idFile)
        form.append('documentType', idDocType)
        try {
          await fetch('/api/hosts/id-verification', { method: 'POST', body: form })
        } catch { /* non-blocking */ }
      }

      if (videoFile) {
        const form = new FormData()
        form.append('video', videoFile)
        try {
          await fetch('/api/hosts/intro-video', { method: 'POST', body: form })
        } catch { /* non-blocking */ }
      }

      router.push('/host-dashboard')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const cityObj = CITIES.find(c => c.id === cityId)
  const currentHeadline = STEP_HEADLINES[step - 1]

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F0EB' }}>
        <div className="text-center">
          <svg className="animate-spin mx-auto mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(8,78,78,0.20)" strokeWidth="3" />
            <path d="M12 2 a10 10 0 0 1 10 10" stroke={GREEN} strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="text-[14px] font-semibold" style={{ color: GREEN }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F0EB' }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between relative" style={{ width: '44%', flexShrink: 0 }}>
        <img src={BG_IMAGE} alt="European city" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(8,78,78,0.88) 0%, rgba(8,78,78,0.60) 50%, rgba(10,30,18,0.92) 100%)' }} />

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10 flex flex-col justify-between h-full p-10 pt-20">
          {/* Top: Logo + headline */}
          <div>
            <Link href="/" className="inline-flex items-center mb-10 select-none">
              <span className="font-serif font-extrabold text-white" style={{ fontSize: '22px', letterSpacing: '-0.04em' }}>Off</span>
              <span className="font-serif font-extrabold" style={{ fontSize: '22px', letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>map</span>
            </Link>

            <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-5" style={{ color: 'rgba(245,166,35,0.85)' }}>
              Become a Host
            </p>
            <h1 className="font-serif font-bold text-white mb-4" style={{ fontSize: '36px', letterSpacing: '-0.03em', lineHeight: 1.12, whiteSpace: 'pre-line' }}>
              {currentHeadline.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: '14px', lineHeight: 1.65, maxWidth: '320px' }}>
              {currentHeadline.subtitle}
            </p>
          </div>

          {/* Middle: Step tracker */}
          <div className="my-8">
            <div className="flex flex-col gap-0.5">
              {STEP_LABELS.map((label, i) => {
                const s = i + 1
                const done = s < step
                const active = s === step
                return (
                  <div key={s} className="flex items-center gap-3 py-1.5">
                    <div className="flex items-center justify-center font-bold text-[11px] transition-all"
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: done ? 'rgba(245,166,35,0.90)' : active ? '#fff' : 'rgba(255,255,255,0.12)',
                        color: done ? '#fff' : active ? GREEN : 'rgba(255,255,255,0.35)',
                        boxShadow: active ? '0 0 0 3px rgba(255,255,255,0.20)' : 'none',
                      }}>
                      {done ? '✓' : s}
                    </div>
                    <span className="text-[13px] font-semibold transition-all"
                      style={{ color: done ? 'rgba(245,166,35,0.85)' : active ? '#fff' : 'rgba(255,255,255,0.30)' }}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom: Trust signals */}
          <div className="flex flex-col gap-3">
            {[
              { icon: '✅', text: 'Free to list — no monthly fees' },
              { icon: '💰', text: 'You set your own schedule and rate' },
              { icon: '🌍', text: '1,300+ verified hosts already earning' },
            ].map(t => (
              <div key={t.text} className="flex items-center gap-3">
                <span style={{ fontSize: '16px' }}>{t.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', fontWeight: 600 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Mobile header (hidden on desktop) */}
        <header className="lg:hidden h-[64px] flex items-center justify-between px-5 flex-shrink-0"
          style={{ background: GREEN, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <Link href="/" className="flex items-center select-none">
            <span className="font-serif font-extrabold text-white" style={{ fontSize: '20px', letterSpacing: '-0.04em' }}>Off</span>
            <span className="font-serif font-extrabold" style={{ fontSize: '20px', letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>map</span>
          </Link>
          <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Step {step} of {TOTAL_STEPS}
          </span>
        </header>

        {/* Mobile progress bar */}
        <div className="lg:hidden" style={{ height: '3px', background: 'rgba(8,78,78,0.10)' }}>
          <div style={{ height: '100%', width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`, background: `linear-gradient(90deg,${TERRA},#F07830)`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Desktop: top-right step counter */}
        <div className="hidden lg:flex items-center justify-end px-8 pt-8 flex-shrink-0">
          <span className="text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(8,78,78,0.08)', color: GREEN }}>
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 lg:py-0">
          <div style={{ maxWidth: '540px', width: '100%' }}>

            {/* Card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(8,78,78,0.07)' }}>

              {/* ── Step 1: City ── */}
              {step === 1 && (
                <div className="p-8">
                  <StepBadge n={1} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Which city are you in?</h2>
                  <p className="text-[14px] mb-7" style={{ color: '#4A8E8E' }}>You&apos;ll be listed for travelers heading to your city.</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {CITIES.map(c => (
                      <button key={c.id} onClick={() => setCityId(c.id)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                        style={{
                          border: cityId === c.id ? `2px solid ${GREEN}` : '1.5px solid rgba(8,78,78,0.15)',
                          background: cityId === c.id ? 'rgba(8,78,78,0.06)' : '#fff',
                          boxShadow: cityId === c.id ? '0 0 0 3px rgba(8,78,78,0.08)' : 'none',
                        }}>
                        <span style={{ fontSize: '22px' }}>{c.flag}</span>
                        <div>
                          <div className="text-[13px] font-bold" style={{ color: GREEN }}>{c.name}</div>
                          <div className="text-[11px]" style={{ color: '#6B8F7A' }}>{c.country}</div>
                        </div>
                        {cityId === c.id && <span className="ml-auto text-[11px] font-bold" style={{ color: GREEN }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2: Bio ── */}
              {step === 2 && (
                <div className="p-8">
                  <StepBadge n={2} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Tell travelers about yourself</h2>
                  <p className="text-[14px] mb-7" style={{ color: '#4A8E8E' }}>Be specific — real places, real stories work best.</p>

                  <div className="mb-5">
                    <label className="block text-[10px] font-black tracking-[0.12em] uppercase mb-2" style={{ color: TERRA }}>
                      Your headline <span style={{ color: '#9CAD9E', fontWeight: 500 }}>({headline.length}/100)</span>
                    </label>
                    <input
                      value={headline}
                      onChange={e => setHeadline(e.target.value.slice(0, 100))}
                      placeholder="e.g. Berlin street food expert & hidden bar guide"
                      className="w-full rounded-xl px-4 py-3 text-[14px] font-semibold outline-none transition-all"
                      style={{ border: '2px solid rgba(8,78,78,0.20)', color: '#063B3B', background: '#FAFAF8' }}
                    />
                    {headline.length > 0 && headline.length < 10 && (
                      <p className="text-[11px] mt-1.5" style={{ color: '#E8621A' }}>At least 10 characters</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black tracking-[0.12em] uppercase mb-2" style={{ color: TERRA }}>
                      Your bio <span style={{ color: '#9CAD9E', fontWeight: 500 }}>({bio.length}/600)</span>
                    </label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value.slice(0, 600))}
                      rows={6}
                      placeholder="What makes your city special? Where do locals eat, drink, and explore? What's your story? Be personal — travelers connect with real people, not tourist descriptions."
                      className="w-full rounded-xl px-4 py-3 text-[14px] outline-none transition-all resize-none"
                      style={{ border: '2px solid rgba(8,78,78,0.20)', color: '#063B3B', background: '#FAFAF8', lineHeight: 1.6 }}
                    />
                    {bio.length > 0 && bio.length < 50 && (
                      <p className="text-[11px] mt-1.5" style={{ color: '#E8621A' }}>At least 50 characters ({50 - bio.length} more)</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 3: Categories ── */}
              {step === 3 && (
                <div className="p-8">
                  <StepBadge n={3} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>What do you love sharing?</h2>
                  <p className="text-[14px] mb-7" style={{ color: '#4A8E8E' }}>Pick up to 6 categories. These help travelers find you.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => {
                      const sel = categories.includes(c.value)
                      return (
                        <button key={c.value} onClick={() => toggleCategory(c.value)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                          style={{
                            border: sel ? `2px solid ${GREEN}` : '1.5px solid rgba(8,78,78,0.15)',
                            background: sel ? 'rgba(8,78,78,0.07)' : '#fff',
                            opacity: !sel && categories.length >= 6 ? 0.45 : 1,
                          }}>
                          <span style={{ fontSize: '18px' }}>{c.icon}</span>
                          <span className="text-[13px] font-semibold" style={{ color: sel ? GREEN : '#3D5A4A' }}>{c.label}</span>
                          {sel && <span className="ml-auto text-[11px] font-bold" style={{ color: GREEN }}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] mt-4 font-semibold" style={{ color: '#9CAD9E' }}>{categories.length} / 6 selected</p>
                </div>
              )}

              {/* ── Step 4: Languages ── */}
              {step === 4 && (
                <div className="p-8">
                  <StepBadge n={4} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Which languages do you speak?</h2>
                  <p className="text-[14px] mb-7" style={{ color: '#4A8E8E' }}>Travelers filter by language to find a comfortable match.</p>
                  <div className="flex flex-wrap gap-2.5">
                    {LANGUAGES.map(l => {
                      const sel = languages.includes(l.code)
                      return (
                        <button key={l.code} onClick={() => toggleLanguage(l.code)}
                          className="px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                          style={{
                            border: sel ? `2px solid ${GREEN}` : '1.5px solid rgba(8,78,78,0.18)',
                            background: sel ? GREEN : '#fff',
                            color: sel ? '#fff' : '#3D5A4A',
                            boxShadow: sel ? '0 2px 8px rgba(8,78,78,0.20)' : 'none',
                            opacity: !sel && languages.length >= 10 ? 0.45 : 1,
                          }}>
                          {l.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] mt-5 font-semibold" style={{ color: '#9CAD9E' }}>{languages.length} language{languages.length !== 1 ? 's' : ''} selected</p>
                </div>
              )}

              {/* ── Step 5: Rate ── */}
              {step === 5 && (
                <div className="p-8">
                  <StepBadge n={5} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Set your hourly rate</h2>
                  <p className="text-[14px] mb-8" style={{ color: '#4A8E8E' }}>Set what you&apos;d like to earn per hour. Travelers pay a 5% service fee on top.</p>

                  <div className="text-center mb-8">
                    <div className="font-serif text-6xl font-bold mb-1" style={{ color: GREEN, letterSpacing: '-0.04em' }}>€{rate}</div>
                    <div className="text-[14px] font-semibold" style={{ color: '#6B8F7A' }}>per hour</div>
                  </div>

                  <input type="range" min={10} max={150} step={5} value={rate}
                    onChange={e => setRate(Number(e.target.value))}
                    className="w-full mb-6"
                    style={{ accentColor: GREEN }} />
                  <div className="flex justify-between text-[11px] font-semibold mb-8" style={{ color: '#9CAD9E' }}>
                    <span>€10/hr</span><span>€75/hr</span><span>€150/hr</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[20, 30, 40, 50].map(v => (
                      <button key={v} onClick={() => setRate(v)}
                        className="py-2 rounded-xl text-[13px] font-bold transition-all"
                        style={{ border: rate === v ? `2px solid ${GREEN}` : '1.5px solid rgba(8,78,78,0.15)', background: rate === v ? 'rgba(8,78,78,0.07)' : '#fff', color: rate === v ? GREEN : '#3D5A4A' }}>
                        €{v}
                      </button>
                    ))}
                  </div>

                  <div className="mt-7 rounded-xl p-4" style={{ background: 'rgba(8,78,78,0.05)', border: '1px solid rgba(8,78,78,0.10)' }}>
                    <p className="text-[12px] font-semibold" style={{ color: GREEN }}>
                      Most Offmap hosts charge €25–€45/hr. You can change your rate anytime from your dashboard.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 6: ID Verification ── */}
              {step === 6 && (
                <div className="p-8">
                  <StepBadge n={6} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Verify your identity</h2>
                  <p className="text-[14px] mb-7" style={{ color: '#4A8E8E' }}>Upload a valid ID so travelers know you&apos;re a real person. Free and confidential.</p>

                  <div className="mb-5">
                    <label className="block text-[10px] font-black tracking-[0.12em] uppercase mb-3" style={{ color: TERRA }}>Document type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DOC_TYPES.map(d => (
                        <button key={d.value} onClick={() => setIdDocType(d.value)}
                          className="flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl text-center transition-all"
                          style={{
                            border: idDocType === d.value ? `2px solid ${GREEN}` : '1.5px solid rgba(8,78,78,0.15)',
                            background: idDocType === d.value ? 'rgba(8,78,78,0.06)' : '#fff',
                          }}>
                          <span style={{ fontSize: '24px' }}>{d.icon}</span>
                          <span className="text-[11px] font-semibold" style={{ color: idDocType === d.value ? GREEN : '#3D5A4A' }}>{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {idDocType && !idUploaded && (
                    <div className="mb-5">
                      <input
                        ref={idInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) setIdFile(f) }}
                      />
                      {!idFile ? (
                        <button
                          onClick={() => idInputRef.current?.click()}
                          className="w-full py-8 rounded-xl flex flex-col items-center gap-3 transition-all hover:border-opacity-60"
                          style={{ border: '2px dashed rgba(8,78,78,0.25)', background: '#FAFAF8' }}>
                          <Upload size={28} style={{ color: '#6B8F7A' }} />
                          <div>
                            <div className="text-[13px] font-semibold" style={{ color: GREEN }}>Click to upload your {DOC_TYPES.find(d => d.value === idDocType)?.label}</div>
                            <div className="text-[11px] mt-1" style={{ color: '#9CAD9E' }}>JPEG, PNG, WebP, or PDF · Max 10MB</div>
                          </div>
                        </button>
                      ) : (
                        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#F0FAF0', border: '1.5px solid rgba(8,78,78,0.20)' }}>
                          <FileCheck size={20} style={{ color: GREEN }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold truncate" style={{ color: GREEN }}>{idFile.name}</div>
                            <div className="text-[11px]" style={{ color: '#6B8F7A' }}>{(idFile.size / 1024 / 1024).toFixed(1)} MB</div>
                          </div>
                          <button onClick={() => { setIdFile(null); if (idInputRef.current) idInputRef.current.value = '' }}
                            className="p-1 rounded-full hover:bg-black/5 transition-colors">
                            <X size={16} style={{ color: '#6B8F7A' }} />
                          </button>
                        </div>
                      )}

                      {idFile && (
                        <button
                          onClick={handleIdConfirm}
                          className="mt-4 w-full py-3 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
                          style={{ background: `linear-gradient(135deg,${GREEN},#1a6035)`, boxShadow: '0 4px 16px rgba(8,78,78,0.30)' }}>
                          Confirm document
                        </button>
                      )}
                    </div>
                  )}

                  {idUploaded && (
                    <div className="rounded-xl p-5" style={{ background: '#F0FAF0', border: '1.5px solid rgba(8,78,78,0.20)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GREEN }}>
                          <FileCheck size={16} className="text-white" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold" style={{ color: GREEN }}>Document ready</div>
                          <div className="text-[12px]" style={{ color: '#4A8E8E' }}>Your ID will be uploaded and verified when you submit your profile.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(8,78,78,0.05)', border: '1px solid rgba(8,78,78,0.10)' }}>
                    <p className="text-[12px] font-semibold" style={{ color: GREEN }}>
                      Your ID is encrypted, stored securely in the EU, and only used for verification. It is never shown to travelers.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 7: Intro Video (Optional) ── */}
              {step === 7 && (
                <div className="p-8">
                  <StepBadge n={7} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Record a 30-second intro</h2>
                  <p className="text-[14px] mb-2" style={{ color: '#4A8E8E' }}>
                    A short video helps travelers connect with you before booking.
                  </p>
                  <p className="text-[12px] mb-7 font-semibold" style={{ color: '#9CAD9E' }}>This step is optional — you can add it later.</p>

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(f) }}
                  />

                  {!videoUploaded ? (
                    <>
                      {!videoFile ? (
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          className="w-full py-10 rounded-xl flex flex-col items-center gap-3 transition-all hover:border-opacity-60"
                          style={{ border: '2px dashed rgba(8,78,78,0.25)', background: '#FAFAF8' }}>
                          <Video size={32} style={{ color: '#6B8F7A' }} />
                          <div>
                            <div className="text-[13px] font-semibold" style={{ color: GREEN }}>Click to upload your intro video</div>
                            <div className="text-[11px] mt-1" style={{ color: '#9CAD9E' }}>MP4, WebM, or MOV · Max 30 seconds · Max 50MB</div>
                          </div>
                        </button>
                      ) : (
                        <div>
                          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#F0FAF0', border: '1.5px solid rgba(8,78,78,0.20)' }}>
                            <Video size={20} style={{ color: GREEN }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold truncate" style={{ color: GREEN }}>{videoFile.name}</div>
                              <div className="text-[11px]" style={{ color: '#6B8F7A' }}>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</div>
                            </div>
                            <button onClick={() => { setVideoFile(null); if (videoInputRef.current) videoInputRef.current.value = '' }}
                              className="p-1 rounded-full hover:bg-black/5 transition-colors">
                              <X size={16} style={{ color: '#6B8F7A' }} />
                            </button>
                          </div>

                          <button
                            onClick={handleVideoConfirm}
                            className="mt-4 w-full py-3 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
                            style={{ background: `linear-gradient(135deg,${GREEN},#1a6035)`, boxShadow: '0 4px 16px rgba(8,78,78,0.30)' }}>
                            Confirm video
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl p-5" style={{ background: '#F0FAF0', border: '1.5px solid rgba(8,78,78,0.20)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GREEN }}>
                          <Video size={16} className="text-white" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold" style={{ color: GREEN }}>Video ready</div>
                          <div className="text-[12px]" style={{ color: '#4A8E8E' }}>It will be uploaded when you submit your profile.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(8,78,78,0.05)', border: '1px solid rgba(8,78,78,0.10)' }}>
                    <p className="text-[12px] font-bold mb-2" style={{ color: GREEN }}>Tips for a great intro video</p>
                    <ul className="space-y-1">
                      {[
                        'Smile and introduce yourself naturally',
                        'Mention your city and what you love showing visitors',
                        'Film in good lighting (natural light is best)',
                        'Keep it under 30 seconds — short and friendly',
                      ].map(t => (
                        <li key={t} className="text-[11px] font-medium" style={{ color: '#4A8E8E' }}>• {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* ── Step 8: Review & Submit ── */}
              {step === 8 && (
                <div className="p-8">
                  <StepBadge n={8} />
                  <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Review & launch</h2>
                  <p className="text-[14px] mb-7" style={{ color: '#4A8E8E' }}>Your profile goes live after a quick 24hr review.</p>

                  <div className="space-y-3 mb-7">
                    <SummaryRow label="City" value={cityObj ? `${cityObj.flag} ${cityObj.name}` : '—'} onEdit={() => setStep(1)} />
                    <SummaryRow label="Headline" value={headline} onEdit={() => setStep(2)} />
                    <SummaryRow label="Bio" value={`${bio.slice(0, 80)}…`} onEdit={() => setStep(2)} />
                    <SummaryRow
                      label="Experiences"
                      value={categories.map(c => CATEGORIES.find(x => x.value === c)?.label ?? c).join(', ')}
                      onEdit={() => setStep(3)} />
                    <SummaryRow
                      label="Languages"
                      value={languages.map(l => LANGUAGES.find(x => x.code === l)?.label ?? l).join(', ')}
                      onEdit={() => setStep(4)} />
                    <SummaryRow label="Hourly rate" value={`€${rate}/hr`} onEdit={() => setStep(5)} />
                    <SummaryRow
                      label="ID verification"
                      value={idUploaded ? `✓ ${DOC_TYPES.find(d => d.value === idDocType)?.label ?? 'Document'} uploaded` : 'Not uploaded'}
                      onEdit={() => setStep(6)} />
                    <SummaryRow
                      label="Intro video"
                      value={videoUploaded ? '✓ Video uploaded' : 'Skipped (optional)'}
                      onEdit={() => setStep(7)} />
                  </div>

                  {error && (
                    <div className="rounded-xl px-4 py-3 mb-5 text-[13px] font-semibold" style={{ background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                      {error}
                    </div>
                  )}

                  <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(8,78,78,0.05)', border: '1px solid rgba(8,78,78,0.10)' }}>
                    <p className="text-[12px] font-bold mb-3" style={{ color: GREEN }}>What happens next</p>
                    <ul className="space-y-2">
                      {[
                        '✓ Your profile is submitted for review',
                        '✓ We approve all profiles within 24 hours',
                        '✓ Travelers can find and message you once approved',
                        '✓ Your ID is verified — a "Verified" badge appears on your profile',
                      ].map(t => (
                        <li key={t} className="text-[12px] font-medium" style={{ color: '#4A8E8E' }}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3.5 rounded-full text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg,${TERRA},#F07830)`, boxShadow: '0 4px 20px rgba(232,98,26,0.35)' }}>
                    {submitting ? 'Submitting…' : 'Launch my host profile →'}
                  </button>
                </div>
              )}

              {/* ── Nav buttons (steps 1-7) ── */}
              {step < 8 && (
                <div className="px-8 pb-8 flex items-center justify-between">
                  <button
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                    className="text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all hover:bg-black/5"
                    style={{ color: step === 1 ? 'transparent' : '#6B8F7A', pointerEvents: step === 1 ? 'none' : 'auto' }}>
                    ← Back
                  </button>
                  {step === 7 ? (
                    <div className="flex gap-2">
                      {!videoUploaded && !videoFile && (
                        <button
                          onClick={() => setStep(s => s + 1)}
                          className="px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:bg-black/5"
                          style={{ color: '#6B8F7A' }}>
                          Skip for now
                        </button>
                      )}
                      <button
                        onClick={() => setStep(s => s + 1)}
                        disabled={!canNext()}
                        className="px-7 py-2.5 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        style={{ background: `linear-gradient(135deg,${TERRA},#F07830)`, boxShadow: canNext() ? '0 4px 16px rgba(232,98,26,0.35)' : 'none' }}>
                        Continue →
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setStep(s => s + 1)}
                      disabled={!canNext()}
                      className="px-7 py-2.5 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      style={{ background: `linear-gradient(135deg,${TERRA},#F07830)`, boxShadow: canNext() ? '0 4px 16px rgba(232,98,26,0.35)' : 'none' }}>
                      Continue →
                    </button>
                  )}
                </div>
              )}

              {step === 8 && (
                <div className="px-8 pb-8">
                  <button
                    onClick={() => setStep(7)}
                    className="text-[13px] font-semibold px-5 py-2 rounded-full transition-all hover:bg-black/5"
                    style={{ color: '#6B8F7A' }}>
                    ← Back
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white"
        style={{ background: TERRA }}>
        {n}
      </div>
      <span className="text-[10px] font-black tracking-[0.14em] uppercase" style={{ color: TERRA }}>
        Step {n} of {TOTAL_STEPS}
      </span>
    </div>
  )
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 rounded-xl px-4"
      style={{ background: '#F7FAF8', border: '1px solid rgba(8,78,78,0.08)' }}>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black tracking-[0.12em] uppercase mb-0.5" style={{ color: TERRA }}>{label}</div>
        <div className="text-[13px] font-semibold truncate" style={{ color: '#063B3B' }}>{value}</div>
      </div>
      <button onClick={onEdit} className="text-[11px] font-bold flex-shrink-0 mt-1" style={{ color: '#6B8F7A' }}>Edit</button>
    </div>
  )
}
