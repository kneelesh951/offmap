'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const GREEN = '#0F3D22'
const TERRA = '#E8621A'

const CATEGORIES = [
  { value: 'food-drink',  label: '🍜 Food & Drink' },
  { value: 'art-culture', label: '🎨 Art & Culture' },
  { value: 'nature',      label: '🌿 Nature' },
  { value: 'nightlife',   label: '🎵 Nightlife' },
  { value: 'history',     label: '🏛️ History' },
  { value: 'family',      label: '👨‍👩‍👧 Family' },
]

const HOST_TYPES = [
  { value: 'any',    label: 'Any' },
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
  { value: 'group',  label: 'Group' },
]

type City = { id: string; name: string; country: string; flagEmoji: string; hostCount: number }

const STEPS = ['When & Where', 'Interests', 'Final Details']

const BG_IMAGE = 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=80'

function CityAutocomplete({ value, onChange, cities }: { value: string; onChange: (id: string) => void; cities: City[] }) {
  const selected = cities.find(c => c.id === value)
  const [query, setQuery] = useState(selected ? `${selected.flagEmoji} ${selected.name}, ${selected.country}` : '')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const rawQuery = query.replace(/^\S+\s/, '').split(',')[0].trim().toLowerCase()
  const filtered = rawQuery
    ? cities.filter(c => c.name.toLowerCase().startsWith(rawQuery) || c.country.toLowerCase().startsWith(rawQuery))
    : cities

  // Sync display when value changes externally (e.g. from URL params)
  useEffect(() => {
    const c = cities.find(c => c.id === value)
    if (c) setQuery(`${c.flagEmoji} ${c.name}, ${c.country}`)
  }, [value, cities])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        const c = cities.find(c => c.id === value)
        if (c) setQuery(`${c.flagEmoji} ${c.name}, ${c.country}`)
        else if (!value) setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, cities])

  const select = (city: City) => {
    onChange(city.id)
    setQuery(`${city.flagEmoji} ${city.name}, ${city.country}`)
    setOpen(false)
    setActiveIdx(-1)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open && e.key !== 'Escape') { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(filtered[activeIdx]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Type a city name..."
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(''); setActiveIdx(-1) }}
        onKeyDown={handleKey}
        style={{
          width: '100%', padding: '14px 44px 14px 16px', borderRadius: '14px', boxSizing: 'border-box',
          border: `2px solid ${value ? GREEN : 'rgba(15,61,34,0.15)'}`,
          fontSize: '15px', fontWeight: 600, outline: 'none',
          background: value ? '#EAF5EE' : '#FAFAF8', color: GREEN,
          fontFamily: 'inherit', transition: 'all 0.2s',
        }}
      />
      {/* chevron / clear icon */}
      <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '16px', color: 'rgba(15,61,34,0.45)' }}>
        {value ? '✓' : '⌄'}
      </span>

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
            background: '#fff', borderRadius: '14px', border: '2px solid rgba(15,61,34,0.12)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.13)', padding: '6px', margin: 0, listStyle: 'none',
            maxHeight: '220px', overflowY: 'auto',
          }}>
          {filtered.map((city, idx) => (
            <li
              key={city.id}
              role="option"
              aria-selected={city.id === value}
              onMouseDown={() => select(city)}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: idx === activeIdx ? '#EAF5EE' : city.id === value ? 'rgba(15,61,34,0.06)' : 'transparent',
                transition: 'background 0.1s',
              }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{city.flagEmoji}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: GREEN }}>{city.name}</span>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#6B8F7A' }}>{city.country}</span>
              </span>
              {city.id === value && <span style={{ color: GREEN, fontSize: '12px', flexShrink: 0 }}>✓</span>}
            </li>
          ))}
        </ul>
      )}

      {open && filtered.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
          background: '#fff', borderRadius: '14px', border: '2px solid rgba(15,61,34,0.12)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.13)', padding: '16px',
          fontSize: '13px', color: '#6B8F7A', fontWeight: 600, textAlign: 'center',
        }}>
          No cities found — we&apos;re expanding soon!
        </div>
      )}
    </div>
  )
}

export default function PostTripPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cities, setCities] = useState<City[]>([])

  useEffect(() => {
    fetch('/api/cities')
      .then(r => r.json())
      .then(j => { if (j.success) setCities(j.data) })
      .catch(() => {/* silently fail — empty list shows "expanding soon" */})
  }, [])

  const [form, setForm] = useState({
    cityId: '',
    arrivalDate: '',
    departureDate: '',
    numTravelers: 1,
    categories: [] as string[],
    hostTypePreference: 'any',
    noteToHosts: '',
    budgetRange: '',
  })

  useEffect(() => {
    const cityId    = searchParams.get('cityId')    ?? ''
    const arrival   = searchParams.get('arrival')   ?? ''
    const departure = searchParams.get('departure') ?? ''
    const interest  = searchParams.get('interest')  ?? ''
    setForm(f => ({
      ...f,
      cityId:       cityId    || f.cityId,
      arrivalDate:  arrival   || f.arrivalDate,
      departureDate:departure || f.departureDate,
      categories:   interest  ? [interest] : f.categories,
    }))
  }, [searchParams])

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]

  const canNext = () => {
    if (step === 1) return form.cityId && form.arrivalDate && form.departureDate && form.departureDate > form.arrivalDate
    if (step === 2) return form.categories.length >= 1
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          numTravelers: Number(form.numTravelers),
          noteToHosts: form.noteToHosts || undefined,
          budgetRange: form.budgetRange || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? 'Something went wrong'); setLoading(false); return }
      router.push('/trips')
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Left panel — background image ── */}
      <div className="hidden lg:flex flex-col justify-between relative" style={{ width: '48%', flexShrink: 0 }}>
        <img
          src={BG_IMAGE}
          alt="European city"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(15,61,34,0.82) 0%, rgba(15,61,34,0.55) 50%, rgba(10,30,18,0.88) 100%)' }} />

        {/* Content over image */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 pt-24">
          {/* Top: headline */}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] mb-4" style={{ color: 'rgba(255,255,255,0.50)' }}>
              Offmap · Post a Trip
            </p>
            <h1 className="font-serif font-bold text-white mb-4" style={{ fontSize: '42px', letterSpacing: '-0.03em', lineHeight: 1.08 }}>
              Tell locals<br />
              where you're<br />
              <span style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                headed.
              </span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', lineHeight: 1.65, maxWidth: '320px' }}>
              Verified locals review your trip and reach out directly — no searching required.
            </p>
          </div>

          {/* Bottom: trust signals */}
          <div className="flex flex-col gap-3">
            {[
              { icon: '✅', text: 'Posting is always free' },
              { icon: '⚡', text: 'Hosts reply within 4 minutes on average' },
              { icon: '🔒', text: 'Your info is only shared with verified hosts' },
            ].map(t => (
              <div key={t.text} className="flex items-center gap-3">
                <span style={{ fontSize: '18px' }}>{t.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: 600 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: '#F4F0EB', paddingTop: '80px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 28px 60px', width: '100%' }}>

          {/* Back link */}
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 text-[13px] font-semibold mb-8 hover:opacity-70 transition-opacity"
            style={{ color: GREEN }}>
            ← Back to Dashboard
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-0 mb-8">
            {STEPS.map((label, i) => {
              const s = i + 1
              const done = s < step
              const active = s === step
              return (
                <div key={s} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center font-bold text-[13px] transition-all"
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: done ? TERRA : active ? GREEN : 'rgba(15,61,34,0.12)',
                        color: (done || active) ? '#fff' : '#6B8F7A',
                        flexShrink: 0,
                      }}>
                      {done ? '✓' : s}
                    </div>
                    <span className="text-[13px] font-semibold whitespace-nowrap"
                      style={{ color: active ? GREEN : '#6B8F7A' }}>
                      {label}
                    </span>
                  </div>
                  {s < 3 && (
                    <div className="mx-3" style={{ height: '2px', width: '28px', borderRadius: '1px', background: s < step ? TERRA : 'rgba(15,61,34,0.15)', flexShrink: 0 }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Form card */}
          <div style={{ background: '#fff', borderRadius: '24px', padding: '36px', boxShadow: '0 8px 40px rgba(0,0,0,0.10)', border: '1px solid rgba(15,61,34,0.07)' }}>

            {/* Step 1 */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: TERRA, marginBottom: '10px' }}>
                    📍 Destination city <span style={{ color: TERRA }}>*</span>
                  </label>
                  <CityAutocomplete
                    value={form.cityId}
                    onChange={id => setForm(f => ({ ...f, cityId: id }))}
                    cities={cities}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {[
                    { label: '📅 Arrival date', key: 'arrivalDate', min: today },
                    { label: '📅 Departure date', key: 'departureDate', min: form.arrivalDate || today },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: TERRA, marginBottom: '10px' }}>
                        {field.label} <span style={{ color: TERRA }}>*</span>
                      </label>
                      <input
                        type="date"
                        min={field.min}
                        value={(form as any)[field.key]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: `2px solid ${(form as any)[field.key] ? GREEN : 'rgba(15,61,34,0.15)'}`, fontSize: '14px', fontWeight: 600, outline: 'none', background: (form as any)[field.key] ? '#EAF5EE' : '#FAFAF8', color: GREEN, fontFamily: 'inherit', colorScheme: 'light', cursor: 'pointer', boxSizing: 'border-box', transition: 'all 0.2s' }}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: TERRA, marginBottom: '12px' }}>
                    👥 Number of travelers
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button"
                        onClick={() => setForm(f => ({ ...f, numTravelers: n }))}
                        style={{
                          width: '48px', height: '48px', borderRadius: '14px', border: '2px solid',
                          borderColor: form.numTravelers === n ? GREEN : 'rgba(15,61,34,0.15)',
                          background: form.numTravelers === n ? GREEN : '#FAFAF8',
                          color: form.numTravelers === n ? '#fff' : GREEN,
                          fontWeight: 800, fontSize: '15px', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {n === 5 ? '5+' : n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: TERRA, marginBottom: '4px' }}>
                    ✨ What are you interested in? <span style={{ color: TERRA }}>*</span>
                  </label>
                  <p style={{ fontSize: '12px', color: '#6B8F7A', fontWeight: 500, marginBottom: '14px' }}>Select at least one</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {CATEGORIES.map(c => (
                      <button key={c.value} type="button"
                        onClick={() => setForm(f => ({ ...f, categories: toggleArray(f.categories, c.value) }))}
                        style={{
                          padding: '10px 18px', borderRadius: '999px', border: '2px solid',
                          borderColor: form.categories.includes(c.value) ? TERRA : 'rgba(15,61,34,0.15)',
                          background: form.categories.includes(c.value) ? 'rgba(232,98,26,0.08)' : '#FAFAF8',
                          color: form.categories.includes(c.value) ? TERRA : GREEN,
                          fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: TERRA, marginBottom: '4px' }}>
                    🏠 Preferred host type
                  </label>
                  <p style={{ fontSize: '12px', color: '#6B8F7A', fontWeight: 500, marginBottom: '14px' }}>Optional</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {HOST_TYPES.map(h => (
                      <button key={h.value} type="button"
                        onClick={() => setForm(f => ({ ...f, hostTypePreference: h.value }))}
                        style={{
                          padding: '10px 18px', borderRadius: '999px', border: '2px solid',
                          borderColor: form.hostTypePreference === h.value ? GREEN : 'rgba(15,61,34,0.15)',
                          background: form.hostTypePreference === h.value ? GREEN : '#FAFAF8',
                          color: form.hostTypePreference === h.value ? '#fff' : GREEN,
                          fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: TERRA, marginBottom: '4px' }}>
                    💬 Note to hosts
                  </label>
                  <p style={{ fontSize: '12px', color: '#6B8F7A', fontWeight: 500, marginBottom: '10px' }}>{form.noteToHosts.length}/200 · Optional</p>
                  <textarea
                    rows={4}
                    placeholder="e.g. We love street food and live music — looking for someone who knows the local scene!"
                    value={form.noteToHosts}
                    maxLength={200}
                    onChange={e => setForm(f => ({ ...f, noteToHosts: e.target.value }))}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '2px solid rgba(15,61,34,0.15)', fontSize: '14px', fontWeight: 500, outline: 'none', background: '#FAFAF8', color: GREEN, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: TERRA, marginBottom: '4px' }}>
                    💶 Budget range
                  </label>
                  <p style={{ fontSize: '12px', color: '#6B8F7A', fontWeight: 500, marginBottom: '10px' }}>Optional</p>
                  <input
                    type="text"
                    placeholder="e.g. €50–€100 per person, flexible"
                    value={form.budgetRange}
                    onChange={e => setForm(f => ({ ...f, budgetRange: e.target.value }))}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '2px solid rgba(15,61,34,0.15)', fontSize: '14px', fontWeight: 500, outline: 'none', background: '#FAFAF8', color: GREEN, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Summary */}
                <div style={{ borderRadius: '16px', padding: '20px', background: 'linear-gradient(135deg, #EAF5EE, #F0FAF4)', border: '1.5px solid rgba(15,61,34,0.12)' }}>
                  <p style={{ fontWeight: 800, color: GREEN, marginBottom: '14px', fontSize: '14px', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.01em' }}>
                    📋 Your trip summary
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: GREEN, fontWeight: 600 }}>
                    <span>📍 {cities.find(c => c.id === form.cityId)?.name ?? '—'}</span>
                    <span>👥 {form.numTravelers} traveler{form.numTravelers > 1 ? 's' : ''}</span>
                    <span>🗓️ {form.arrivalDate || '—'} → {form.departureDate || '—'}</span>
                    <span>🏠 {HOST_TYPES.find(h => h.value === form.hostTypePreference)?.label ?? 'Any'} host</span>
                    {form.budgetRange && <span>💶 {form.budgetRange}</span>}
                    <span style={{ gridColumn: '1/-1' }}>🏷️ {form.categories.map(c => CATEGORIES.find(cat => cat.value === c)?.label.replace(/^\S+\s/, '') ?? c).join(', ') || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '12px', padding: '14px 18px', color: '#dc2626', fontSize: '14px', fontWeight: 600, marginTop: '20px' }}>
                {error}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', alignItems: 'center' }}>
              {step > 1 ? (
                <button onClick={() => setStep(s => s - 1)}
                  style={{ padding: '12px 24px', borderRadius: '12px', border: '2px solid rgba(15,61,34,0.20)', background: '#fff', cursor: 'pointer', fontWeight: 700, color: GREEN, fontSize: '14px', transition: 'all 0.2s' }}>
                  ← Back
                </button>
              ) : <div />}

              {step < 3 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                  style={{
                    padding: '14px 36px', borderRadius: '14px', border: 'none', cursor: canNext() ? 'pointer' : 'not-allowed',
                    fontWeight: 800, fontSize: '15px', color: '#fff', transition: 'all 0.2s',
                    background: canNext() ? `linear-gradient(135deg, ${TERRA}, #F07830)` : '#d1d5db',
                    boxShadow: canNext() ? '0 6px 20px rgba(232,98,26,0.35)' : 'none',
                  }}>
                  Continue →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading}
                  style={{
                    padding: '14px 36px', borderRadius: '14px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 800, fontSize: '15px', color: '#fff',
                    background: loading ? '#d1d5db' : `linear-gradient(135deg, ${TERRA}, #F07830)`,
                    boxShadow: loading ? 'none' : '0 6px 20px rgba(232,98,26,0.35)',
                  }}>
                  {loading ? 'Posting...' : 'Post My Trip →'}
                </button>
              )}
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#6B8F7A', fontSize: '13px', fontWeight: 600, marginTop: '20px' }}>
            Posting is free · Subscribe from €6 to read host responses
          </p>
        </div>
      </div>
    </div>
  )
}
