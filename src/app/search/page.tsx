'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { HostGrid } from '@/components/hosts/HostGrid'
import { SubscribeModal } from '@/components/ui/SubscribeModal'
import { useUser } from '@/hooks/useUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Search, SlidersHorizontal, X, Star } from 'lucide-react'
import { CityAutocomplete } from '@/components/ui/CityAutocomplete'
import type { HostSearchResult } from '@/types'

const CITY_PHOTOS: Record<string, string> = {
  'city-berlin':     'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&q=80',
  'city-lisbon':     'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&q=80',
  'city-amsterdam':  'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&q=80',
  'city-barcelona':  'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&q=80',
  'city-munich':     'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&q=80',
  'city-rome':       'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=80',
  'city-vienna':     'https://images.unsplash.com/photo-1516550893885-985c836c67c2?w=400&q=80',
  'city-prague':     'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&q=80',
  'city-hamburg':    'https://images.unsplash.com/photo-1571406252241-db0280bd36cd?w=400&q=80',
  'city-cologne':    'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=400&q=80',
  'city-frankfurt':  'https://images.unsplash.com/photo-1567448400815-dd3a8c65df73?w=400&q=80',
  'city-dusseldorf': 'https://images.unsplash.com/photo-1559521783-1d1599583485?w=400&q=80',
  'city-stuttgart':  'https://images.unsplash.com/photo-1527866512907-a35e5b8a41fd?w=400&q=80',
}

const CATEGORIES = [
  { value: 'food-drink',  label: '🍜 Food & Drink' },
  { value: 'art-culture', label: '🎨 Art & Culture' },
  { value: 'nature',      label: '🌿 Nature' },
  { value: 'nightlife',   label: '🎵 Nightlife' },
  { value: 'history',     label: '🏛️ History' },
  { value: 'family',      label: '👨‍👩‍👧 Family' },
]

const HOST_TYPES = [
  { value: 'any',    label: 'Any',    icon: '👥' },
  { value: 'male',   label: 'Male',   icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'couple', label: 'Couple', icon: '👫' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'group',  label: 'Group',  icon: '👥' },
]

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'de', label: 'German',     flag: '🇩🇪' },
  { code: 'fr', label: 'French',     flag: '🇫🇷' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸' },
  { code: 'it', label: 'Italian',    flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', label: 'Dutch',      flag: '🇳🇱' },
  { code: 'pl', label: 'Polish',     flag: '🇵🇱' },
  { code: 'ru', label: 'Russian',    flag: '🇷🇺' },
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷' },
  { code: 'hi', label: 'Hindi',      flag: '🇮🇳' },
  { code: 'tr', label: 'Turkish',    flag: '🇹🇷' },
  { code: 'sv', label: 'Swedish',    flag: '🇸🇪' },
]

const GREEN = '#084E4E'
const TERRA = '#E8621A'

// Price range in euros per hour
const PRICE_MIN = 0
const PRICE_MAX = 200

interface Filters {
  q: string
  cityId: string
  category: string
  sort: string
  hostType: string
  languages: string[]
  minPrice: number
  maxPrice: number
  minRating: number
}

const DEFAULT_FILTERS: Filters = {
  q: '', cityId: '', category: '', sort: 'featured',
  hostType: 'any', languages: [], minPrice: PRICE_MIN, maxPrice: PRICE_MAX, minRating: 0,
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream pt-[66px]" />}>
      <SearchPage />
    </Suspense>
  )
}

function SearchPage() {
  const { user } = useUser()
  const { isActive } = useSubscription()
  const searchParams = useSearchParams()

  const [hosts, setHosts] = useState<HostSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [cities, setCities] = useState<{ id: string; name: string; country: string; countryCode: string; flagEmoji: string; hostCount: number }[]>([])

  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    q:        searchParams.get('q')          ?? '',
    cityId:   searchParams.get('cityId')     ?? '',
    category: searchParams.get('categories') ?? '',
  })

  // Pending filters inside the drawer (applied on "Show results")
  const [pendingFilters, setPendingFilters] = useState<Filters>(filters)

  useEffect(() => {
    fetch('/api/cities').then(r => r.json()).then(j => setCities(j.data ?? []))
  }, [])

  const fetchHosts = useCallback(async (f: Filters) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f.q)           params.set('q', f.q)
    if (f.cityId)      params.set('cityId', f.cityId)
    if (f.category)    params.set('categories', f.category)
    if (f.hostType && f.hostType !== 'any') params.set('hostType', f.hostType)
    f.languages.forEach(l => params.append('languages', l))
    if (f.minPrice > PRICE_MIN) params.set('minRateCents', String(f.minPrice * 100))
    if (f.maxPrice < PRICE_MAX) params.set('maxRateCents', String(f.maxPrice * 100))
    if (f.minRating > 0)        params.set('minRating', String(f.minRating))
    params.set('sort', f.sort)
    params.set('limit', '20')
    const res = await fetch(`/api/hosts/search?${params}`)
    const data = await res.json()
    if (data.success) { setHosts(data.data); setTotal(data.meta.total) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchHosts(filters) }, [filters, fetchHosts])

  const applyFilters = () => {
    setFilters(pendingFilters)
    setShowFilters(false)
  }

  const resetFilters = () => {
    setPendingFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setShowFilters(false)
  }

  const handleConnectClick = () => {
    if (!user) { window.location.href = '/auth/login?redirect=/search'; return }
    if (!isActive) { setShowSubscribeModal(true); return }
  }

  const activeCity = cities.find(c => c.id === filters.cityId)
  const activeCategory = CATEGORIES.find(c => c.value === filters.category)

  const activeFilterCount = [
    filters.hostType !== 'any' ? 1 : 0,
    filters.languages.length,
    filters.minPrice > PRICE_MIN ? 1 : 0,
    filters.maxPrice < PRICE_MAX ? 1 : 0,
    filters.minRating > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const hasAnyFilter = filters.q || filters.cityId || filters.category || activeFilterCount > 0

  const toggleLanguage = (code: string) => {
    setPendingFilters(f => ({
      ...f,
      languages: f.languages.includes(code) ? f.languages.filter(l => l !== code) : [...f.languages, code],
    }))
  }

  return (
    <>
      <Navbar user={user} />
      <main className="min-h-screen bg-cream pt-[66px]">

        {/* ── Hero ──────────────────────────────────────── */}
        <div className="relative bg-ink">
          {/* Image wrapper clips the photo but not the dropdown */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&q=80"
              alt="European city"
              className="w-full h-full object-cover"
              style={{ opacity: 0.45 }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,78,78,0.60) 0%, rgba(8,78,78,0.50) 40%, rgba(8,78,78,0.88) 80%, rgba(8,78,78,0.98) 100%)' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-transparent" />
          </div>

          <div className="relative max-w-6xl mx-auto px-5 md:px-11 pt-12 pb-10">
            <p className="overline text-terra mb-3 fade-up">1,300+ verified locals · 8 cities</p>
            <h1 className="font-serif text-4xl md:text-6xl text-white mb-3 fade-up fade-up-delay-1"
              style={{ letterSpacing: '-0.03em', lineHeight: 1.03 }}>
              Find your{' '}
              <span className="italic text-gradient-sunrise"
                style={{ fontVariationSettings: '"SOFT" 100', filter: 'drop-shadow(0 0 20px rgba(245,166,35,0.40))' }}>
                local guide.
              </span>
            </h1>
            <p className="text-white/65 text-base md:text-lg mb-8 max-w-md fade-up fade-up-delay-2" style={{ lineHeight: 1.55 }}>
              Real locals. Real cities. No tour buses, no scripts.
            </p>

            {/* ── Search bar card ── */}
            <div className="fade-up fade-up-delay-3">
              <div className="rounded-2xl mb-3"
                style={{ background: '#fff', boxShadow: '0 16px 56px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.12)' }}>
                <div className="flex flex-col sm:flex-row items-stretch">
                  {/* Keyword */}
                  <div className="flex items-center gap-3 flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r rounded-l-2xl" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                    <Search size={16} style={{ color: TERRA, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: TERRA }}>Search</div>
                      <input
                        value={filters.q}
                        onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && fetchHosts(filters)}
                        placeholder="Name, interest, neighbourhood…"
                        className="w-full text-[14px] font-semibold outline-none bg-transparent"
                        style={{ color: GREEN }}
                      />
                    </div>
                  </div>

                  {/* City autocomplete */}
                  <div className="flex items-center px-5 py-4 border-b sm:border-b-0 sm:border-r min-w-[200px]" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                    <CityAutocomplete
                      cities={cities}
                      value={filters.cityId}
                      onChange={id => setFilters(f => ({ ...f, cityId: id }))}
                    />
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b sm:border-b-0 sm:border-r min-w-[160px]" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: TERRA }}>Sort by</div>
                      <select
                        value={filters.sort}
                        onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
                        className="w-full text-[14px] font-semibold outline-none bg-transparent appearance-none cursor-pointer"
                        style={{ color: GREEN }}>
                        <option value="featured">Featured first</option>
                        <option value="rating">Highest rated</option>
                        <option value="newest">Newest hosts</option>
                        <option value="price_asc">Price: low to high</option>
                        <option value="price_desc">Price: high to low</option>
                      </select>
                    </div>
                  </div>

                  {/* Filters button */}
                  <button
                    onClick={() => { setPendingFilters(filters); setShowFilters(true) }}
                    className="flex items-center justify-center gap-2 px-5 py-4 text-[13px] font-bold border-b sm:border-b-0 sm:border-r transition-all hover:bg-green-50 relative"
                    style={{ borderColor: 'rgba(8,78,78,0.10)', color: activeFilterCount > 0 ? TERRA : GREEN }}>
                    <SlidersHorizontal size={15} />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="w-5 h-5 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center"
                        style={{ background: TERRA }}>
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Search button */}
                  <button
                    onClick={() => fetchHosts(filters)}
                    className="flex items-center justify-center gap-2 px-8 py-4 text-[14px] font-bold text-white transition-all hover:brightness-110 rounded-r-2xl"
                    style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', minWidth: '120px' }}>
                    <Search size={15} />
                    Search
                  </button>
                </div>
              </div>

              {/* Active filter pills */}
              {hasAnyFilter && (
                <div className="flex flex-wrap gap-2 mb-1">
                  {filters.q && (
                    <FilterPill label={`"${filters.q}"`} onRemove={() => setFilters(f => ({ ...f, q: '' }))} />
                  )}
                  {activeCity && (
                    <FilterPill label={`${activeCity.flagEmoji} ${activeCity.name}`} onRemove={() => setFilters(f => ({ ...f, cityId: '' }))} />
                  )}
                  {activeCategory && (
                    <FilterPill label={activeCategory.label} onRemove={() => setFilters(f => ({ ...f, category: '' }))} />
                  )}
                  {filters.hostType !== 'any' && (
                    <FilterPill label={HOST_TYPES.find(t => t.value === filters.hostType)?.icon + ' ' + HOST_TYPES.find(t => t.value === filters.hostType)?.label} onRemove={() => setFilters(f => ({ ...f, hostType: 'any' }))} />
                  )}
                  {filters.languages.map(code => {
                    const lang = LANGUAGES.find(l => l.code === code)
                    return lang ? <FilterPill key={code} label={`${lang.flag} ${lang.label}`} onRemove={() => setFilters(f => ({ ...f, languages: f.languages.filter(l => l !== code) }))} /> : null
                  })}
                  {(filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX) && (
                    <FilterPill label={`€${filters.minPrice}–€${filters.maxPrice}/hr`} onRemove={() => setFilters(f => ({ ...f, minPrice: PRICE_MIN, maxPrice: PRICE_MAX }))} />
                  )}
                  {filters.minRating > 0 && (
                    <FilterPill label={`★ ${filters.minRating}+`} onRemove={() => setFilters(f => ({ ...f, minRating: 0 }))} />
                  )}
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all hover:bg-white/20"
                    style={{ color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* City photo pills */}
            {cities.length > 0 && (
              <div className="fade-up fade-up-delay-4 mt-4">
                <div className="flex gap-2.5 no-scrollbar overflow-x-auto pb-1">
                  <button
                    onClick={() => setFilters(f => ({ ...f, cityId: '' }))}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      !filters.cityId ? 'bg-terra text-white border-terra' : 'bg-white/10 text-white border-white/20 hover:bg-white/18'
                    }`}>
                    All cities
                  </button>
                  {cities.map(city => (
                    <button key={city.id}
                      onClick={() => setFilters(f => ({ ...f, cityId: f.cityId === city.id ? '' : city.id }))}
                      className={`flex-shrink-0 flex items-center gap-2 pl-1 pr-4 py-1 rounded-full text-sm font-semibold border transition-all ${
                        filters.cityId === city.id ? 'bg-terra border-terra text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/18'
                      }`}>
                      {CITY_PHOTOS[city.id]
                        ? <img src={CITY_PHOTOS[city.id]} alt={city.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-white/20" />
                        : <span className="w-7 h-7 flex items-center justify-center text-base">{city.flagEmoji}</span>
                      }
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Category sticky bar ───────────────────────── */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-black/[0.07] px-5 md:px-11 py-3 sticky top-[66px] z-20"
          style={{ boxShadow: '0 1px 0 rgba(8,78,78,0.06)' }}>
          <div className="max-w-6xl mx-auto flex gap-2 no-scrollbar overflow-x-auto">
            <button
              onClick={() => setFilters(f => ({ ...f, category: '' }))}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all border ${
                !filters.category ? 'bg-ink text-white border-ink' : 'text-ink-mid border-black/[0.12] hover:border-ink/30 hover:text-ink'
              }`}>
              All
            </button>
            {CATEGORIES.map(c => (
              <button key={c.value}
                onClick={() => setFilters(f => ({ ...f, category: f.category === c.value ? '' : c.value }))}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all border ${
                  filters.category === c.value ? 'bg-terra text-white border-terra' : 'text-ink-mid border-black/[0.12] hover:border-terra/40 hover:text-terra'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results ───────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-5 md:px-11 py-8">
          {!loading && (
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p className="text-[13px] font-semibold text-ink-muted">
                <span className="text-ink font-bold">{total.toLocaleString()}</span> host{total !== 1 ? 's' : ''} found
                {activeCity ? ` in ${activeCity.name}` : ''}
                {activeCategory ? ` · ${activeCategory.label}` : ''}
              </p>
            </div>
          )}
          <HostGrid hosts={hosts} loading={loading} onConnectClick={handleConnectClick} />
        </div>
      </main>
      <Footer />
      <SubscribeModal open={showSubscribeModal} onClose={() => setShowSubscribeModal(false)} />

      {/* ── Advanced Filter Drawer ─────────────────────── */}
      {showFilters && (
        <FilterDrawer
          pending={pendingFilters}
          setPending={setPendingFilters}
          onApply={applyFilters}
          onReset={resetFilters}
          onClose={() => setShowFilters(false)}
          toggleLanguage={toggleLanguage}
          activeFilterCount={activeFilterCount}
        />
      )}
    </>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-white"
      style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
      {label}
      <button onClick={onRemove} className="hover:text-white/70"><X size={11} /></button>
    </span>
  )
}

function FilterDrawer({
  pending, setPending, onApply, onReset, onClose, toggleLanguage, activeFilterCount,
}: {
  pending: Filters
  setPending: React.Dispatch<React.SetStateAction<Filters>>
  onApply: () => void
  onReset: () => void
  onClose: () => void
  toggleLanguage: (code: string) => void
  activeFilterCount: number
}) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={handleBackdrop}>
      <div ref={drawerRef}
        className="relative w-full max-w-md bg-white h-full flex flex-col overflow-hidden"
        style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.20)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.08]">
          <div>
            <h2 className="font-serif text-xl font-bold" style={{ color: GREEN }}>Advanced Filters</h2>
            {activeFilterCount > 0 && (
              <p className="text-[12px] mt-0.5" style={{ color: '#E8621A' }}>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: GREEN }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Host type */}
          <FilterSection title="Host type" subtitle="Who would you like to spend time with?">
            <div className="grid grid-cols-3 gap-2">
              {HOST_TYPES.map(t => (
                <button key={t.value}
                  onClick={() => setPending(f => ({ ...f, hostType: t.value }))}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center"
                  style={{
                    borderColor: pending.hostType === t.value ? '#E8621A' : 'rgba(8,78,78,0.12)',
                    background: pending.hostType === t.value ? 'rgba(232,98,26,0.06)' : 'transparent',
                    color: pending.hostType === t.value ? '#E8621A' : GREEN,
                  }}>
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-[12px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Languages */}
          <FilterSection title="Speaks your language" subtitle="Filter hosts by languages they speak">
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => {
                const selected = pending.languages.includes(lang.code)
                return (
                  <button key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all"
                    style={{
                      borderColor: selected ? '#E8621A' : 'rgba(8,78,78,0.14)',
                      background: selected ? 'rgba(232,98,26,0.08)' : 'transparent',
                      color: selected ? '#E8621A' : GREEN,
                    }}>
                    {lang.flag} {lang.label}
                    {selected && <X size={11} />}
                  </button>
                )
              })}
            </div>
          </FilterSection>

          {/* Price range */}
          <FilterSection title="Price per hour" subtitle={`€${pending.minPrice} – €${pending.maxPrice === PRICE_MAX ? `${PRICE_MAX}+` : pending.maxPrice}`}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6EA880' }}>Min (€/hr)</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: 'rgba(8,78,78,0.16)' }}>
                    <span className="text-sm font-bold" style={{ color: '#9CAD9E' }}>€</span>
                    <input
                      type="number"
                      min={0}
                      max={pending.maxPrice}
                      value={pending.minPrice}
                      onChange={e => setPending(f => ({ ...f, minPrice: Math.min(Number(e.target.value), f.maxPrice) }))}
                      className="w-full text-[14px] font-semibold outline-none bg-transparent"
                      style={{ color: GREEN }}
                    />
                  </div>
                </div>
                <div className="text-sm font-bold mt-5" style={{ color: '#9CAD9E' }}>–</div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6EA880' }}>Max (€/hr)</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: 'rgba(8,78,78,0.16)' }}>
                    <span className="text-sm font-bold" style={{ color: '#9CAD9E' }}>€</span>
                    <input
                      type="number"
                      min={pending.minPrice}
                      max={PRICE_MAX}
                      value={pending.maxPrice}
                      onChange={e => setPending(f => ({ ...f, maxPrice: Math.max(Number(e.target.value), f.minPrice) }))}
                      className="w-full text-[14px] font-semibold outline-none bg-transparent"
                      style={{ color: GREEN }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick price presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Under €30', min: 0, max: 30 },
                  { label: '€30–€60',   min: 30, max: 60 },
                  { label: '€60–€100',  min: 60, max: 100 },
                  { label: '€100+',     min: 100, max: PRICE_MAX },
                ].map(preset => (
                  <button key={preset.label}
                    onClick={() => setPending(f => ({ ...f, minPrice: preset.min, maxPrice: preset.max }))}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
                    style={{
                      borderColor: pending.minPrice === preset.min && pending.maxPrice === preset.max ? '#E8621A' : 'rgba(8,78,78,0.14)',
                      background: pending.minPrice === preset.min && pending.maxPrice === preset.max ? 'rgba(232,98,26,0.08)' : 'transparent',
                      color: pending.minPrice === preset.min && pending.maxPrice === preset.max ? '#E8621A' : GREEN,
                    }}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </FilterSection>

          {/* Minimum rating */}
          <FilterSection title="Minimum rating" subtitle="Only show highly-rated hosts">
            <div className="flex gap-2 flex-wrap">
              {[0, 4, 4.5, 4.8, 4.9].map(r => (
                <button key={r}
                  onClick={() => setPending(f => ({ ...f, minRating: r }))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold border transition-all"
                  style={{
                    borderColor: pending.minRating === r ? '#E8621A' : 'rgba(8,78,78,0.14)',
                    background: pending.minRating === r ? 'rgba(232,98,26,0.08)' : 'transparent',
                    color: pending.minRating === r ? '#E8621A' : GREEN,
                  }}>
                  {r === 0 ? 'Any rating' : (
                    <><Star size={12} fill="currentColor" /> {r}+</>
                  )}
                </button>
              ))}
            </div>
          </FilterSection>

        </div>

        {/* Footer buttons */}
        <div className="border-t border-black/[0.08] px-6 py-4 flex gap-3 bg-white">
          <button
            onClick={onReset}
            className="flex-1 py-3 rounded-full text-[14px] font-bold border transition-all hover:bg-gray-50"
            style={{ borderColor: 'rgba(8,78,78,0.20)', color: GREEN }}>
            Reset all
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-3 rounded-full text-[14px] font-bold text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.35)' }}>
            Show results
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-serif text-[16px] font-bold mb-0.5" style={{ color: GREEN }}>{title}</h3>
      <p className="text-[12px] mb-4" style={{ color: '#6EA880' }}>{subtitle}</p>
      {children}
    </div>
  )
}
