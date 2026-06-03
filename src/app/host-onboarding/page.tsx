'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const GREEN = '#0F3D22'
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

const TOTAL_STEPS = 6

// ─── Component ───────────────────────────────────────────────────────────────

export default function HostOnboarding() {
  const router = useRouter()
  const [step, setStep]           = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Form state
  const [cityId,     setCityId]     = useState('')
  const [headline,   setHeadline]   = useState('')
  const [bio,        setBio]        = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [languages,  setLanguages]  = useState<string[]>([])
  const [rate,       setRate]       = useState(25) // €/hr

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

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
    return true
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
      if (!res.ok) { setError(json.error?.message ?? 'Something went wrong'); return }
      router.push('/host-dashboard')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const cityObj = CITIES.find(c => c.id === cityId)

  return (
    <div className="min-h-screen" style={{ background: '#F7FAF8' }}>

      {/* Header */}
      <header className="h-[64px] flex items-center justify-between px-5 md:px-10"
        style={{ background: GREEN, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" className="flex items-center select-none">
          <span className="font-serif font-extrabold text-white" style={{ fontSize:'20px', letterSpacing:'-0.04em' }}>Off</span>
          <span className="font-serif font-extrabold" style={{ fontSize:'20px', letterSpacing:'-0.04em', background:'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>map</span>
        </Link>
        <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Host setup · Step {step} of {TOTAL_STEPS}
        </span>
      </header>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(15,61,34,0.10)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${TERRA},#F07830)`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Card */}
      <div className="max-w-xl mx-auto px-5 py-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ border: '1px solid rgba(15,61,34,0.08)' }}>

          {/* ── Step 1: City ── */}
          {step === 1 && (
            <div className="p-8">
              <StepBadge n={1} />
              <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Which city are you in?</h2>
              <p className="text-[14px] mb-7" style={{ color: '#4A7A5C' }}>You'll be listed for travelers heading to your city.</p>
              <div className="grid grid-cols-2 gap-2.5">
                {CITIES.map(c => (
                  <button key={c.id} onClick={() => setCityId(c.id)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                    style={{
                      border: cityId === c.id ? `2px solid ${GREEN}` : '1.5px solid rgba(15,61,34,0.15)',
                      background: cityId === c.id ? 'rgba(15,61,34,0.06)' : '#fff',
                      boxShadow: cityId === c.id ? `0 0 0 3px rgba(15,61,34,0.08)` : 'none',
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
              <p className="text-[14px] mb-7" style={{ color: '#4A7A5C' }}>Be specific — real places, real stories work best.</p>

              <div className="mb-5">
                <label className="block text-[10px] font-black tracking-[0.12em] uppercase mb-2" style={{ color: TERRA }}>
                  Your headline <span style={{ color: '#9CAD9E', fontWeight: 500 }}>({headline.length}/100)</span>
                </label>
                <input
                  value={headline}
                  onChange={e => setHeadline(e.target.value.slice(0, 100))}
                  placeholder="e.g. Berlin street food expert & hidden bar guide"
                  className="w-full rounded-xl px-4 py-3 text-[14px] font-semibold outline-none transition-all"
                  style={{ border: '2px solid rgba(15,61,34,0.20)', color: '#0A2210', background: '#FAFAF8' }}
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
                  style={{ border: '2px solid rgba(15,61,34,0.20)', color: '#0A2210', background: '#FAFAF8', lineHeight: 1.6 }}
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
              <p className="text-[14px] mb-7" style={{ color: '#4A7A5C' }}>Pick up to 6 categories. These help travelers find you.</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => {
                  const sel = categories.includes(c.value)
                  return (
                    <button key={c.value} onClick={() => toggleCategory(c.value)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        border: sel ? `2px solid ${GREEN}` : '1.5px solid rgba(15,61,34,0.15)',
                        background: sel ? 'rgba(15,61,34,0.07)' : '#fff',
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
              <p className="text-[14px] mb-7" style={{ color: '#4A7A5C' }}>Travelers filter by language to find a comfortable match.</p>
              <div className="flex flex-wrap gap-2.5">
                {LANGUAGES.map(l => {
                  const sel = languages.includes(l.code)
                  return (
                    <button key={l.code} onClick={() => toggleLanguage(l.code)}
                      className="px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                      style={{
                        border: sel ? `2px solid ${GREEN}` : '1.5px solid rgba(15,61,34,0.18)',
                        background: sel ? GREEN : '#fff',
                        color: sel ? '#fff' : '#3D5A4A',
                        boxShadow: sel ? '0 2px 8px rgba(15,61,34,0.20)' : 'none',
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
              <p className="text-[14px] mb-8" style={{ color: '#4A7A5C' }}>Offmap takes 0% commission. You keep everything.</p>

              {/* Rate display */}
              <div className="text-center mb-8">
                <div className="font-serif text-6xl font-bold mb-1" style={{ color: GREEN, letterSpacing: '-0.04em' }}>€{rate}</div>
                <div className="text-[14px] font-semibold" style={{ color: '#6B8F7A' }}>per hour</div>
              </div>

              {/* Slider */}
              <input type="range" min={10} max={150} step={5} value={rate}
                onChange={e => setRate(Number(e.target.value))}
                className="w-full mb-6"
                style={{ accentColor: GREEN }} />
              <div className="flex justify-between text-[11px] font-semibold mb-8" style={{ color: '#9CAD9E' }}>
                <span>€10/hr</span><span>€75/hr</span><span>€150/hr</span>
              </div>

              {/* Quick presets */}
              <div className="grid grid-cols-4 gap-2">
                {[20, 30, 40, 50].map(v => (
                  <button key={v} onClick={() => setRate(v)}
                    className="py-2 rounded-xl text-[13px] font-bold transition-all"
                    style={{ border: rate === v ? `2px solid ${GREEN}` : '1.5px solid rgba(15,61,34,0.15)', background: rate === v ? 'rgba(15,61,34,0.07)' : '#fff', color: rate === v ? GREEN : '#3D5A4A' }}>
                    €{v}
                  </button>
                ))}
              </div>

              {/* Context */}
              <div className="mt-7 rounded-xl p-4" style={{ background: 'rgba(15,61,34,0.05)', border: '1px solid rgba(15,61,34,0.10)' }}>
                <p className="text-[12px] font-semibold" style={{ color: GREEN }}>
                  💡 Most Offmap hosts charge €25–€45/hr. You can change your rate anytime from your dashboard.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 6: Review & Submit ── */}
          {step === 6 && (
            <div className="p-8">
              <StepBadge n={6} />
              <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>Review & launch</h2>
              <p className="text-[14px] mb-7" style={{ color: '#4A7A5C' }}>Your profile goes live after a quick 24hr review.</p>

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
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3 mb-5 text-[13px] font-semibold" style={{ background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                  {error}
                </div>
              )}

              {/* What happens next */}
              <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(15,61,34,0.05)', border: '1px solid rgba(15,61,34,0.10)' }}>
                <p className="text-[12px] font-bold mb-3" style={{ color: GREEN }}>What happens next</p>
                <ul className="space-y-2">
                  {[
                    '✓ Your profile is submitted for review',
                    '✓ We approve all profiles within 24 hours',
                    '✓ Travelers can find and message you once approved',
                    '✓ You keep 100% of what travelers pay you directly',
                  ].map(t => (
                    <li key={t} className="text-[12px] font-medium" style={{ color: '#4A7A5C' }}>{t}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 rounded-full text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg,${GREEN},#1a6035)`, boxShadow: '0 4px 20px rgba(15,61,34,0.35)' }}>
                {submitting ? 'Submitting…' : 'Launch my host profile →'}
              </button>
            </div>
          )}

          {/* ── Nav buttons ── */}
          {step < 6 && (
            <div className="px-8 pb-8 flex items-center justify-between">
              <button
                onClick={() => setStep(s => Math.max(1, s - 1))}
                className="text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all hover:bg-black/5"
                style={{ color: step === 1 ? 'transparent' : '#6B8F7A', pointerEvents: step === 1 ? 'none' : 'auto' }}>
                ← Back
              </button>
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="px-7 py-2.5 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{ background: `linear-gradient(135deg,${TERRA},#F07830)`, boxShadow: canNext() ? '0 4px 16px rgba(232,98,26,0.35)' : 'none' }}>
                Continue →
              </button>
            </div>
          )}

          {step === 6 && (
            <div className="px-8 pb-8">
              <button
                onClick={() => setStep(5)}
                className="text-[13px] font-semibold px-5 py-2 rounded-full transition-all hover:bg-black/5"
                style={{ color: '#6B8F7A' }}>
                ← Back
              </button>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{
              width: i + 1 === step ? '20px' : '7px',
              height: '7px',
              borderRadius: '99px',
              background: i + 1 <= step ? GREEN : 'rgba(15,61,34,0.20)',
              transition: 'all 0.3s ease',
            }} />
          ))}
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
      style={{ background: '#F7FAF8', border: '1px solid rgba(15,61,34,0.08)' }}>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black tracking-[0.12em] uppercase mb-0.5" style={{ color: TERRA }}>{label}</div>
        <div className="text-[13px] font-semibold truncate" style={{ color: '#0A2210' }}>{value}</div>
      </div>
      <button onClick={onEdit} className="text-[11px] font-bold flex-shrink-0 mt-1" style={{ color: '#6B8F7A' }}>Edit</button>
    </div>
  )
}
