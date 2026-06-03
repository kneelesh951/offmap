'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CityAutocomplete, type CityOption } from '@/components/ui/CityAutocomplete'

const INTERESTS = [
  { value: 'food-drink',  label: 'Food & Drink' },
  { value: 'art-culture', label: 'Art & Culture' },
  { value: 'nature',      label: 'Nature' },
  { value: 'nightlife',   label: 'Nightlife' },
  { value: 'history',     label: 'History' },
  { value: 'family',      label: 'Family' },
]

const LANGUAGES = ['English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Dutch']

const STATS = [
  { value: '1,300+', label: 'Verified hosts' },
  { value: '8',      label: 'Cities live' },
  { value: '4.9★',   label: 'Avg rating' },
  { value: '€6',     label: 'From / day' },
]

const today = new Date().toISOString().split('T')[0]

const fieldCls = "flex flex-col gap-0.5 px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer"
const labelCls = "text-[9px] font-bold uppercase tracking-widest"
const inputCls: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  fontSize: '13px', fontWeight: 600, color: '#0F3D22',
  fontFamily: 'inherit', width: '100%', appearance: 'none' as const,
  cursor: 'pointer', padding: 0,
}
const divider = <div className="self-stretch w-px my-3 flex-shrink-0" style={{ background: 'rgba(15,61,34,0.10)' }} />

export function HeroSearch() {
  const router = useRouter()
  const [tab, setTab] = useState<'find' | 'trip'>('find')
  const [cities, setCities] = useState<CityOption[]>([])

  useEffect(() => {
    fetch('/api/cities')
      .then(r => r.json())
      .then(j => { if (j.success) setCities(j.data) })
      .catch(() => {})
  }, [])

  // Find a host
  const [findCity,     setFindCity]     = useState('')
  const [findWhen,     setFindWhen]     = useState('')
  const [findInterest, setFindInterest] = useState('')
  const [findLang,     setFindLang]     = useState('')

  // Post my trip
  const [tripCity,      setTripCity]      = useState('')
  const [tripArrival,   setTripArrival]   = useState('')
  const [tripDeparture, setTripDeparture] = useState('')
  const [tripInterest,  setTripInterest]  = useState('')

  const handleFind = () => {
    const p = new URLSearchParams()
    if (findCity)     p.set('cityId', findCity)
    if (findInterest) p.set('categories', findInterest)
    if (findLang)     p.set('q', findLang)
    router.push(`/search?${p}`)
  }

  const handleTrip = () => {
    const p = new URLSearchParams()
    if (tripCity)      p.set('cityId', tripCity)
    if (tripArrival)   p.set('arrival', tripArrival)
    if (tripDeparture) p.set('departure', tripDeparture)
    if (tripInterest)  p.set('interest', tripInterest)
    router.push(`/trips/post?${p}`)
  }

  return (
    <div className="fade-up fade-up-delay-3 max-w-2xl">
      {/* ── Card ── */}
      <div className="rounded-2xl overflow-visible"
        style={{ background: '#fff', boxShadow: '0 20px 64px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.10)' }}>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid rgba(15,61,34,0.09)' }}>
          {(['find', 'trip'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-5 py-3 text-[13px] font-bold transition-all"
              style={{
                color: tab === t ? '#E8621A' : '#4A7A5C',
                borderBottom: tab === t ? '2px solid #E8621A' : '2px solid transparent',
                marginBottom: '-1px',
                background: tab === t ? 'rgba(232,98,26,0.02)' : 'transparent',
              }}>
              {t === 'find' ? '🔍 Find a host' : '✈️ Post my trip'}
            </button>
          ))}
        </div>

        {/* ── FIND A HOST ── */}
        {tab === 'find' && (
          <div>
            <div className="flex items-stretch flex-wrap sm:flex-nowrap">
              <div className={fieldCls} style={{ minWidth: '140px', flex: 1 }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>City</span>
                <CityAutocomplete cities={cities} value={findCity} onChange={setFindCity} />
              </div>
              {divider}
              <div className={fieldCls} style={{ minWidth: '110px' }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>When</span>
                <input type="date" value={findWhen} min={today}
                  onChange={e => setFindWhen(e.target.value)}
                  style={{ ...inputCls, colorScheme: 'light', color: findWhen ? '#0F3D22' : '#9CAD9E' }} />
              </div>
              {divider}
              <div className={fieldCls} style={{ minWidth: '120px' }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>Interest</span>
                <select value={findInterest} onChange={e => setFindInterest(e.target.value)} style={inputCls}>
                  <option value="">Any</option>
                  {INTERESTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
              {divider}
              <div className={fieldCls} style={{ minWidth: '110px' }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>Language</span>
                <select value={findLang} onChange={e => setFindLang(e.target.value)} style={inputCls}>
                  <option value="">Any</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="px-4 pb-4 pt-1 flex justify-end">
              <button onClick={handleFind}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 18px rgba(232,98,26,0.45)' }}>
                Search hosts →
              </button>
            </div>
          </div>
        )}

        {/* ── POST MY TRIP ── */}
        {tab === 'trip' && (
          <div>
            <div className="flex items-stretch flex-wrap sm:flex-nowrap">
              <div className={fieldCls} style={{ minWidth: '140px', flex: 1 }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>Destination</span>
                <CityAutocomplete cities={cities} value={tripCity} onChange={setTripCity} />
              </div>
              {divider}
              <div className={fieldCls} style={{ minWidth: '110px' }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>Arrival</span>
                <input type="date" value={tripArrival} min={today}
                  onChange={e => setTripArrival(e.target.value)}
                  style={{ ...inputCls, colorScheme: 'light', color: tripArrival ? '#0F3D22' : '#9CAD9E' }} />
              </div>
              {divider}
              <div className={fieldCls} style={{ minWidth: '110px' }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>Departure</span>
                <input type="date" value={tripDeparture} min={tripArrival || today}
                  onChange={e => setTripDeparture(e.target.value)}
                  style={{ ...inputCls, colorScheme: 'light', color: tripDeparture ? '#0F3D22' : '#9CAD9E' }} />
              </div>
              {divider}
              <div className={fieldCls} style={{ minWidth: '110px' }}>
                <span className={labelCls} style={{ color: '#E8621A' }}>Interests</span>
                <select value={tripInterest} onChange={e => setTripInterest(e.target.value)} style={inputCls}>
                  <option value="">Any</option>
                  {INTERESTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </div>
            <div className="px-4 pb-4 pt-1 flex justify-end">
              <button onClick={handleTrip}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg,#5A7350,#3A5230)', boxShadow: '0 4px 18px rgba(90,115,80,0.40)' }}>
                Post my trip — hosts will reach out →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="mt-3 rounded-xl grid grid-cols-4"
        style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.18)' }}>
        {STATS.map((s, i) => (
          <div key={s.label} className="py-3 flex flex-col items-center gap-0.5"
            style={{ borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.14)' : 'none' }}>
            <div className="font-serif text-lg font-bold" style={{ color: '#F5A623' }}>{s.value}</div>
            <div className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
