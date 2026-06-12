'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createHostProfileSchema, type CreateHostInput, VALID_LANGUAGES, VALID_CATEGORIES } from '@/lib/validators'
import { CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react'

const GREEN = '#084E4E'

const LANGUAGE_LABELS: Record<string, string> = {
  en:'English', de:'Deutsch', fr:'Français', es:'Español', it:'Italiano',
  pt:'Português', nl:'Nederlands', pl:'Polski', ru:'Русский', ar:'العربية',
  zh:'中文', ja:'日本語', ko:'한국어', hi:'हिन्दी', tr:'Türkçe',
  sv:'Svenska', da:'Dansk', fi:'Suomi',
}

const CATEGORY_LABELS: Record<string, string> = {
  'food-drink':'Food & Drink', 'art-culture':'Art & Culture', 'nature':'Nature & Outdoors',
  'nightlife':'Nightlife', 'history':'History', 'family':'Family-friendly',
  'sports':'Sports', 'music':'Music',
}

const HOST_TYPE_OPTIONS = [
  { value: 'any',    emoji: '🌍', label: 'Anyone' },
  { value: 'male',   emoji: '👨', label: 'Male' },
  { value: 'female', emoji: '👩', label: 'Female' },
  { value: 'couple', emoji: '👫', label: 'Couple' },
  { value: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
  { value: 'group',  emoji: '👥', label: 'Group' },
]

const STEPS = ['About you', 'Location', 'Preferences', 'Rates']

export default function CreateHostProfile() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [cities, setCities] = useState<{ id: string; name: string; flagEmoji: string; country: string }[]>([])

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } =
    useForm<CreateHostInput>({
      resolver: zodResolver(createHostProfileSchema),
      defaultValues: { languages: [], categories: [], hostType: 'any' },
    })

  const langs = watch('languages') ?? []
  const cats = watch('categories') ?? []
  const hostType = watch('hostType')
  const bio = watch('bio') ?? ''

  useEffect(() => {
    fetch('/api/cities').then(r => r.json()).then(j => setCities(j.data ?? []))
  }, [])

  const toggle = (field: 'languages' | 'categories', val: string) => {
    const cur: string[] = field === 'languages' ? langs : cats
    const max = field === 'categories' ? 5 : 8
    if (!cur.includes(val) && cur.length >= max) return
    setValue(field, cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] as any, { shouldValidate: true })
  }

  const nextStep = async () => {
    const fieldsPerStep: (keyof CreateHostInput)[][] = [
      ['headline', 'bio'],
      ['cityId'],
      ['languages', 'categories', 'hostType'],
      [],
    ]
    const valid = await trigger(fieldsPerStep[step])
    if (valid) setStep(s => s + 1)
  }

  const onSubmit = async (data: CreateHostInput) => {
    setError(null)
    const res = await fetch('/api/hosts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error?.message ?? 'Something went wrong'); return }
    router.push('/host-dashboard')
  }

  const selectedCity = cities.find(c => c.id === watch('cityId'))

  return (
    <div className="min-h-screen bg-cream flex">

      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-72 xl:w-80 flex-col p-10 fixed top-0 left-0 h-full overflow-y-auto"
        style={{ background: `linear-gradient(160deg, ${GREEN} 0%, #0a5e5e 100%)` }}>

        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")" }} />

        <Link href="/" className="relative z-10 flex items-center mb-12 select-none group">
          <span className="font-serif font-extrabold text-white group-hover:opacity-90 transition-opacity"
            style={{ fontSize: '21px', letterSpacing: '-0.04em' }}>Off</span>
          <span className="font-serif font-extrabold group-hover:opacity-90 transition-opacity"
            style={{
              fontSize: '21px', letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg,#E8621A,#F5A623)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>map</span>
        </Link>

        <div className="relative z-10 mb-10">
          <p className="overline mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>Host onboarding</p>
          <h2 className="font-serif text-2xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
            Set up your host profile
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Takes about 5 minutes. You can edit everything later.
          </p>
        </div>

        {/* Step tracker */}
        <div className="relative z-10 space-y-1 mb-auto">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3 py-2">
              {/* Connector line */}
              <div className="relative flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  i < step  ? 'text-white' :
                  i === step ? 'bg-white text-ink' :
                  'text-white/25'
                }`}
                  style={i < step ? { background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 2px 8px rgba(232,98,26,0.40)' } :
                    i === step ? { boxShadow: '0 2px 12px rgba(255,255,255,0.20)' } :
                    { border: '1px solid rgba(255,255,255,0.15)' }
                  }>
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
              </div>
              <span className={`text-[13px] font-semibold transition-colors ${
                i < step ? 'text-terra' : i === step ? 'text-white' : 'text-white/30'
              }`}>{label}</span>
              {i === step && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(232,98,26,0.20)', color: '#E8621A' }}>
                  Current
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mt-8 mb-6">
          <div className="h-1 rounded-full mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step) / STEPS.length) * 100}%`, background: 'linear-gradient(90deg,#E8621A,#F5A623)' }} />
          </div>
          <div className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.40)' }}>
            {Math.round((step / STEPS.length) * 100)}% complete
          </div>
        </div>

        <div className="relative z-10 rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            New profiles go live within <span className="text-white font-semibold">24 hours</span> after our team reviews them.
          </p>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-72 xl:ml-80 flex flex-col min-h-screen">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-5 h-[66px]"
          style={{ background: `linear-gradient(135deg, ${GREEN}, #0a5e5e)`, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/" className="flex items-center select-none">
            <span className="font-serif font-extrabold text-white" style={{ fontSize: '19px', letterSpacing: '-0.04em' }}>Off</span>
            <span className="font-serif font-extrabold" style={{
              fontSize: '19px', letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg,#E8621A,#F5A623)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>map</span>
          </Link>
          <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Step {step + 1} of {STEPS.length}</span>
        </div>

        {/* Mobile progress bar */}
        <div className="lg:hidden flex gap-1.5 px-5 py-3 bg-white border-b border-black/[0.07]">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: i <= step ? '#E8621A' : 'rgba(8,78,78,0.10)' }} />
          ))}
        </div>

        <div className="flex-1 flex items-start justify-center p-6 lg:p-14 pt-10">
          <div className="w-full max-w-xl">

            <form onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="mb-6 text-[13px] px-4 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                  {error}
                </div>
              )}

              {/* ── Step 0: About you ──────────────────────────────── */}
              {step === 0 && (
                <div className="space-y-7">
                  <div>
                    <p className="overline text-terra mb-2">Step 1 of {STEPS.length}</p>
                    <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>
                      Tell travelers about yourself
                    </h1>
                    <p className="text-[14px] leading-relaxed" style={{ color: '#4A8E8E' }}>
                      This is the first thing travelers see. Be specific — generic bios get fewer messages.
                    </p>
                  </div>

                  <div className="card p-7 space-y-6">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                        Your headline
                        <span className="ml-2 normal-case font-normal tracking-normal text-ink-muted text-[11px]">10–80 characters</span>
                      </label>
                      <input
                        {...register('headline')}
                        type="text"
                        maxLength={80}
                        placeholder='e.g. "Berlin street food expert & underground bar guide"'
                        className="input-field"
                      />
                      {errors.headline && <p className="text-[12px] mt-1" style={{ color: '#DC2626' }}>{errors.headline.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                          Your story
                        </label>
                        <span className={`text-[12px] font-semibold ${bio.length < 100 ? 'text-ink-muted' : 'text-terra'}`}>
                          {bio.length} / 2000
                        </span>
                      </div>
                      <textarea
                        {...register('bio')}
                        rows={8}
                        placeholder={`Tell travelers who you are and what you know about your city.\n\nIdeas: Where did you grow up? What do you love most? What are your favourite hidden spots? What kind of experience can you offer a visitor?`}
                        className="input-field resize-none leading-relaxed"
                        style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}
                      />
                      {errors.bio
                        ? <p className="text-[12px] mt-1" style={{ color: '#DC2626' }}>{errors.bio.message}</p>
                        : <p className="text-[12px] mt-1 text-ink-muted">Minimum 100 characters. The best bios are personal and specific.</p>
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 1: Location ───────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-7">
                  <div>
                    <p className="overline text-terra mb-2">Step 2 of {STEPS.length}</p>
                    <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>
                      Where are you based?
                    </h1>
                    <p className="text-[14px] leading-relaxed" style={{ color: '#4A8E8E' }}>
                      Travelers search by city. If your city isn&apos;t listed, we&apos;ll add it soon.
                    </p>
                  </div>

                  <div className="card p-7 space-y-6">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Select your city</label>
                      {cities.length === 0
                        ? <div className="text-ink-muted text-[13px] py-6 text-center">Loading cities…</div>
                        : (
                          <div className="grid grid-cols-2 gap-2.5">
                            {cities.map(city => (
                              <label key={city.id}
                                className="flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-all"
                                style={watch('cityId') === city.id ? {
                                  border: '2px solid #E8621A',
                                  backgroundColor: '#FEF0E8',
                                  boxShadow: '0 0 0 3px rgba(232,98,26,0.10)',
                                } : {
                                  border: '1.5px solid rgba(8,78,78,0.12)',
                                  backgroundColor: '#fff',
                                  boxShadow: '0 1px 4px rgba(8,78,78,0.05)',
                                }}>
                                <input {...register('cityId')} type="radio" value={city.id} className="sr-only" />
                                <span className="text-2xl">{city.flagEmoji}</span>
                                <div>
                                  <div className="font-bold text-[13px]" style={{ color: GREEN }}>{city.name}</div>
                                  <div className="text-[11px] text-ink-muted font-medium">{city.country}</div>
                                </div>
                                {watch('cityId') === city.id && (
                                  <CheckCircle2 size={15} className="ml-auto flex-shrink-0" style={{ color: '#E8621A' }} />
                                )}
                              </label>
                            ))}
                          </div>
                        )
                      }
                      {errors.cityId && <p className="text-[12px] mt-1" style={{ color: '#DC2626' }}>{errors.cityId.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                        Neighbourhood
                        <span className="ml-2 normal-case font-normal tracking-normal text-ink-muted text-[11px]">optional</span>
                      </label>
                      <input
                        {...register('neighborhood')}
                        type="text"
                        placeholder='e.g. "Neukölln", "Alfama", "Jordaan"'
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Preferences ────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-7">
                  <div>
                    <p className="overline text-terra mb-2">Step 3 of {STEPS.length}</p>
                    <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>
                      Your languages & interests
                    </h1>
                    <p className="text-[14px] leading-relaxed" style={{ color: '#4A8E8E' }}>
                      Travelers filter by language and category — pick everything that applies.
                    </p>
                  </div>

                  <div className="card p-7 space-y-7">
                    {/* Languages */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                          Languages you speak
                        </label>
                        <span className="text-[11px] font-semibold text-ink-muted">{langs.length}/8</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {VALID_LANGUAGES.map(l => (
                          <button type="button" key={l} onClick={() => toggle('languages', l)}
                            className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                            style={langs.includes(l) ? {
                              background: 'linear-gradient(135deg,#E8621A,#F07830)',
                              color: '#fff',
                              boxShadow: '0 2px 8px rgba(232,98,26,0.30)',
                            } : {
                              border: '1.5px solid rgba(8,78,78,0.14)',
                              color: '#4A8E8E',
                              backgroundColor: '#fff',
                            }}>
                            {LANGUAGE_LABELS[l] ?? l.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      {errors.languages && <p className="text-[12px] mt-2" style={{ color: '#DC2626' }}>{errors.languages.message}</p>}
                    </div>

                    <div className="border-t border-black/[0.06]" />

                    {/* Categories */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                          What you offer
                        </label>
                        <span className="text-[11px] font-semibold text-ink-muted">{cats.length}/5</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {VALID_CATEGORIES.map(c => (
                          <button type="button" key={c} onClick={() => toggle('categories', c)}
                            className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all"
                            style={cats.includes(c) ? {
                              background: `linear-gradient(135deg, ${GREEN}, #2A8080)`,
                              color: '#fff',
                              boxShadow: '0 2px 8px rgba(8,78,78,0.25)',
                            } : cats.length >= 5 ? {
                              border: '1.5px solid rgba(8,78,78,0.08)',
                              color: 'rgba(8,78,78,0.30)',
                              backgroundColor: '#F8F5F0',
                              cursor: 'not-allowed',
                            } : {
                              border: '1.5px solid rgba(8,78,78,0.14)',
                              color: '#4A8E8E',
                              backgroundColor: '#fff',
                            }}>
                            {CATEGORY_LABELS[c] ?? c}
                          </button>
                        ))}
                      </div>
                      {errors.categories && <p className="text-[12px] mt-2" style={{ color: '#DC2626' }}>{errors.categories.message}</p>}
                    </div>

                    <div className="border-t border-black/[0.06]" />

                    {/* Host type */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: GREEN }}>
                        Who are you?
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {HOST_TYPE_OPTIONS.map(opt => (
                          <label key={opt.value}
                            className="rounded-xl p-3.5 cursor-pointer text-center transition-all"
                            style={hostType === opt.value ? {
                              border: '2px solid #E8621A',
                              backgroundColor: '#FEF0E8',
                              boxShadow: '0 0 0 3px rgba(232,98,26,0.10)',
                            } : {
                              border: '1.5px solid rgba(8,78,78,0.12)',
                              backgroundColor: '#fff',
                              boxShadow: '0 1px 4px rgba(8,78,78,0.05)',
                            }}>
                            <input {...register('hostType')} type="radio" value={opt.value} className="sr-only" />
                            <div className="text-xl mb-1.5">{opt.emoji}</div>
                            <div className="text-[12px] font-semibold"
                              style={{ color: hostType === opt.value ? '#E8621A' : GREEN }}>
                              {opt.label}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Rates ──────────────────────────────────── */}
              {step === 3 && (
                <div className="space-y-7">
                  <div>
                    <p className="overline text-terra mb-2">Step 4 of {STEPS.length}</p>
                    <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>
                      Set your hourly rate
                    </h1>
                    <p className="text-[14px] leading-relaxed" style={{ color: '#4A8E8E' }}>
                      Optional — some hosts prefer to discuss rates in chat. You can update this any time.
                    </p>
                  </div>

                  <div className="card p-7 space-y-6">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                        Hourly rate
                        <span className="ml-2 normal-case font-normal tracking-normal text-ink-muted text-[11px]">optional</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[14px]" style={{ color: GREEN }}>€</span>
                        <input
                          type="number"
                          min={5}
                          max={500}
                          placeholder="25"
                          onChange={e => {
                            const val = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined
                            setValue('hourlyRateCents', val, { shouldValidate: true })
                          }}
                          className="input-field pl-8 pr-14"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-muted">/hr</span>
                      </div>
                      {errors.hourlyRateCents && <p className="text-[12px] mt-1" style={{ color: '#DC2626' }}>{errors.hourlyRateCents.message}</p>}
                      <p className="text-[12px] text-ink-muted">Most hosts charge €20–€45/hr. Leave blank to discuss in chat.</p>
                    </div>

                    {/* Profile preview */}
                    <div>
                      <p className="overline text-terra mb-3">Profile preview</p>
                      <div className="rounded-2xl overflow-hidden"
                        style={{ border: '1px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 8px rgba(8,78,78,0.06)' }}>
                        {/* Cover */}
                        <div className="h-24 bg-gradient-to-br from-slate-500 via-slate-700 to-slate-900 relative">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          {/* Avatar */}
                          <div className="absolute bottom-0 right-4 translate-y-1/2 w-10 h-10 rounded-xl border-2 border-white shadow-lg flex items-center justify-center font-serif font-bold text-white text-sm"
                            style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', zIndex: 10 }}>
                            You
                          </div>
                        </div>
                        {/* Body */}
                        <div className="pt-7 px-4 pb-4 bg-white">
                          <div className="font-serif text-[16px] font-bold" style={{ color: GREEN }}>
                            {watch('headline') || <span className="text-ink-muted font-sans font-normal text-[13px]">Your headline goes here</span>}
                          </div>
                          {selectedCity && (
                            <div className="text-[12px] font-semibold text-ink-muted mt-1">
                              {selectedCity.flagEmoji} {selectedCity.name}
                              {watch('neighborhood') ? ` · ${watch('neighborhood')}` : ''}
                            </div>
                          )}
                          {langs.length > 0 && (
                            <div className="text-[11px] font-semibold text-ink-muted mt-1.5 tracking-wide">
                              {langs.slice(0, 4).map(l => l.toUpperCase()).join(' · ')}
                            </div>
                          )}
                          {cats.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {cats.slice(0, 3).map(c => (
                                <span key={c} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: '#FEF0E8', color: '#E8621A', border: '1px solid rgba(232,98,26,0.20)' }}>
                                  {CATEGORY_LABELS[c]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Navigation ─────────────────────────────────────── */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-black/[0.07]">
                {step > 0 ? (
                  <button type="button" onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:text-ink"
                    style={{ color: '#4A8E8E' }}>
                    <ArrowLeft size={15} /> Back
                  </button>
                ) : (
                  <Link href="/host-dashboard"
                    className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:text-ink"
                    style={{ color: '#4A8E8E' }}>
                    <ArrowLeft size={15} /> Cancel
                  </Link>
                )}

                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={nextStep}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-full text-white font-bold text-[13px] transition-all hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 20px rgba(232,98,26,0.38)' }}>
                    Continue <ChevronRight size={15} />
                  </button>
                ) : (
                  <button type="submit" disabled={isSubmitting}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-full text-white font-bold text-[13px] disabled:opacity-60 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: `linear-gradient(135deg, ${GREEN}, #2A8080)`, boxShadow: '0 4px 20px rgba(8,78,78,0.30)' }}>
                    {isSubmitting ? 'Creating profile…' : <><span>Create my profile</span><ChevronRight size={15} /></>}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
