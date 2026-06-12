'use client'

import { useState, useRef, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_LANGUAGES = ['en','de','fr','es','it','pt','nl','pl','ru','ar','zh','ja','ko','hi','tr','sv','da','fi'] as const
type Language = typeof VALID_LANGUAGES[number]

const VALID_CATEGORIES = ['food-drink','art-culture','nature','nightlife','history','family','sports','music'] as const
type Category = typeof VALID_CATEGORIES[number]

const TRAVEL_STYLES = ['solo','couple','family','group'] as const
type TravelStyle = typeof TRAVEL_STYLES[number]

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'EN', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', pt: 'PT', nl: 'NL', pl: 'PL',
  ru: 'RU', ar: 'AR', zh: 'ZH', ja: 'JA', ko: 'KO', hi: 'HI', tr: 'TR', sv: 'SV',
  da: 'DA', fi: 'FI',
}

const CATEGORY_LABELS: Record<Category, string> = {
  'food-drink': 'Food & Drink',
  'art-culture': 'Art & Culture',
  'nature': 'Nature',
  'nightlife': 'Nightlife',
  'history': 'History',
  'family': 'Family',
  'sports': 'Sports',
  'music': 'Music',
}

const TRAVEL_STYLE_LABELS: Record<TravelStyle, string> = {
  solo: 'Solo',
  couple: 'Couple',
  family: 'Family',
  group: 'Group',
}

// ── Completeness computation (mirrors server) ─────────────────────────────────

function computeCompleteness(data: {
  avatarUrl: string | null
  fullName: string
  bio: string
  homeCity: string
  languages: string[]
  interests: string[]
}): number {
  let s = 0
  if (data.avatarUrl) s += 30
  if (data.fullName.trim().length > 1) s += 20
  if (data.bio.trim().length > 20) s += 20
  if (data.homeCity.trim().length > 0) s += 10
  if (data.languages.length > 0) s += 10
  if (data.interests.length > 0) s += 10
  return s
}

function getCompletionHint(data: {
  avatarUrl: string | null
  fullName: string
  bio: string
  homeCity: string
  languages: string[]
  interests: string[]
}): string {
  if (!data.avatarUrl) return 'Add a profile photo to gain +30%'
  if (data.fullName.trim().length <= 1) return 'Add your full name to gain +20%'
  if (data.bio.trim().length <= 20) return 'Write a short bio (20+ chars) to gain +20%'
  if (!data.homeCity.trim()) return 'Add your home city to gain +10%'
  if (data.languages.length === 0) return 'Add a language to gain +10%'
  if (data.interests.length === 0) return 'Add an interest to gain +10%'
  return 'Profile complete!'
}

function getInitials(fullName: string, email: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }
  return email[0]?.toUpperCase() ?? '?'
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProfileUserData {
  id: string
  email: string
  role: string
  fullName: string | null
  avatarUrl: string | null
  bio: string | null
  homeCity: string | null
  homeCountry: string | null
  languages: string[]
  interests: string[]
  travelStyle: string | null
  profileCompleteness: number
}

interface ProfileFormProps {
  user: ProfileUserData
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileForm({ user }: ProfileFormProps) {
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [homeCity, setHomeCity] = useState(user.homeCity ?? '')
  const [homeCountry, setHomeCountry] = useState(user.homeCountry ?? '')
  const [languages, setLanguages] = useState<Language[]>((user.languages ?? []) as Language[])
  const [interests, setInterests] = useState<Category[]>((user.interests ?? []) as Category[])
  const [travelStyle, setTravelStyle] = useState<TravelStyle | null>((user.travelStyle as TravelStyle) ?? null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const completeness = computeCompleteness({ avatarUrl, fullName, bio, homeCity, languages, interests })
  const hint = getCompletionHint({ avatarUrl, fullName, bio, homeCity, languages, interests })
  const initials = getInitials(fullName, user.email)

  // ── Avatar upload ─────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError(null)

    // Instant preview
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/me/avatar', { method: 'POST', body: formData })
      const json = await res.json() as { success: boolean; data?: { avatarUrl: string }; error?: { message: string } }
      if (!json.success) {
        setAvatarPreview(avatarUrl) // revert
        setAvatarError(json.error?.message ?? 'Upload failed')
      } else {
        setAvatarUrl(json.data!.avatarUrl)
        setAvatarPreview(json.data!.avatarUrl)
      }
    } catch {
      setAvatarPreview(avatarUrl)
      setAvatarError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [avatarUrl])

  // ── Toggle helpers ────────────────────────────────────────────────────────

  const toggleLanguage = (lang: Language) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const toggleInterest = (cat: Category) => {
    setInterests(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const toggleTravelStyle = (style: TravelStyle) => {
    setTravelStyle(prev => (prev === style ? null : style))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const body: Record<string, unknown> = {}
      if (fullName.trim()) body.fullName = fullName.trim()
      if (bio.trim()) body.bio = bio.trim()
      if (homeCity.trim()) body.homeCity = homeCity.trim()
      if (homeCountry.trim()) body.homeCountry = homeCountry.trim()
      body.languages = languages
      body.interests = interests
      if (travelStyle) body.travelStyle = travelStyle

      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { success: boolean; error?: { message: string } }
      if (!json.success) {
        setSaveError(json.error?.message ?? 'Save failed. Please try again.')
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch {
      setSaveError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Avatar section ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}
      >
        <div className="flex items-center gap-5">
          {/* Avatar circle */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#E8621A,#F5A623)', flexShrink: 0 }}
            >
              {avatarPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-extrabold text-2xl" style={{ letterSpacing: '-0.02em' }}>
                  {initials}
                </span>
              )}
            </div>
            {/* Upload spinner overlay */}
            {uploading && (
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.45)' }}
              >
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.30)" strokeWidth="3" />
                  <path d="M12 2 a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-5 py-2.5 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', color: '#fff', boxShadow: '0 4px 16px rgba(232,98,26,0.35)' }}
            >
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
            <p className="text-[12px] mt-1.5" style={{ color: 'rgba(8,78,78,0.45)' }}>
              JPG, PNG or WebP · Max 3MB
            </p>
            {avatarError && (
              <p className="text-[12px] mt-1" style={{ color: '#E8621A' }}>{avatarError}</p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── Profile completeness bar ────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold" style={{ color: '#084E4E' }}>Profile completeness</span>
          <span className="text-[13px] font-extrabold" style={{ color: '#E8621A' }}>{completeness}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(8,78,78,0.10)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completeness}%`,
              background: completeness >= 80
                ? 'linear-gradient(90deg,#2D6A4F,#40916C)'
                : 'linear-gradient(90deg,#E8621A,#F5A623)',
            }}
          />
        </div>
        {completeness < 100 && (
          <p className="text-[12px] mt-2" style={{ color: 'rgba(8,78,78,0.55)' }}>{hint}</p>
        )}
      </div>

      {/* ── Form fields ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: '#fff', border: '1.5px solid rgba(8,78,78,0.10)', boxShadow: '0 2px 16px rgba(8,78,78,0.06)' }}
      >

        {/* Full name */}
        <div>
          <label className="block text-[13px] font-bold mb-1.5" style={{ color: '#084E4E' }}>
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            maxLength={100}
            placeholder="Your full name"
            className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
            style={{
              background: '#F5F2EC',
              border: '1.5px solid rgba(8,78,78,0.15)',
              color: '#084E4E',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#E8621A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-[13px] font-bold mb-1.5" style={{ color: '#084E4E' }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Tell hosts a little about yourself — where you're from, what you love, what brings you to their city…"
            className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all resize-none"
            style={{
              background: '#F5F2EC',
              border: '1.5px solid rgba(8,78,78,0.15)',
              color: '#084E4E',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#E8621A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <p className="text-[12px] mt-1 text-right" style={{ color: bio.length > 450 ? '#E8621A' : 'rgba(8,78,78,0.40)' }}>
            {bio.length}/500
          </p>
        </div>

        {/* Home city + country */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-bold mb-1.5" style={{ color: '#084E4E' }}>
              Home city
            </label>
            <input
              type="text"
              value={homeCity}
              onChange={e => setHomeCity(e.target.value)}
              maxLength={100}
              placeholder="e.g. London"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
              style={{ background: '#F5F2EC', border: '1.5px solid rgba(8,78,78,0.15)', color: '#084E4E' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#E8621A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-1.5" style={{ color: '#084E4E' }}>
              Home country
            </label>
            <input
              type="text"
              value={homeCountry}
              onChange={e => setHomeCountry(e.target.value)}
              maxLength={100}
              placeholder="e.g. United Kingdom"
              className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
              style={{ background: '#F5F2EC', border: '1.5px solid rgba(8,78,78,0.15)', color: '#084E4E' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#E8621A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* Travel style */}
        <div>
          <label className="block text-[13px] font-bold mb-2" style={{ color: '#084E4E' }}>
            Travel style
          </label>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_STYLES.map(style => {
              const selected = travelStyle === style
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => toggleTravelStyle(style)}
                  className="px-4 py-2 rounded-full text-[13px] font-bold transition-all"
                  style={
                    selected
                      ? { background: 'linear-gradient(135deg,#E8621A,#F5A623)', color: '#fff', boxShadow: '0 3px 12px rgba(232,98,26,0.35)' }
                      : { background: '#F5F2EC', color: 'rgba(8,78,78,0.65)', border: '1.5px solid rgba(8,78,78,0.15)' }
                  }
                >
                  {TRAVEL_STYLE_LABELS[style]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-[13px] font-bold mb-2" style={{ color: '#084E4E' }}>
            Languages I speak
          </label>
          <div className="flex flex-wrap gap-2">
            {VALID_LANGUAGES.map(lang => {
              const selected = languages.includes(lang)
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-extrabold tracking-wider transition-all"
                  style={
                    selected
                      ? { background: 'linear-gradient(135deg,#E8621A,#F5A623)', color: '#fff', boxShadow: '0 2px 8px rgba(232,98,26,0.35)' }
                      : { background: '#F5F2EC', color: 'rgba(8,78,78,0.60)', border: '1.5px solid rgba(8,78,78,0.12)' }
                  }
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="block text-[13px] font-bold mb-2" style={{ color: '#084E4E' }}>
            Interests
          </label>
          <div className="flex flex-wrap gap-2">
            {VALID_CATEGORIES.map(cat => {
              const selected = interests.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleInterest(cat)}
                  className="px-4 py-2 rounded-full text-[13px] font-bold transition-all"
                  style={
                    selected
                      ? { background: 'linear-gradient(135deg,#E8621A,#F5A623)', color: '#fff', boxShadow: '0 2px 10px rgba(232,98,26,0.35)' }
                      : { background: '#F5F2EC', color: 'rgba(8,78,78,0.65)', border: '1.5px solid rgba(8,78,78,0.15)' }
                  }
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save button + feedback */}
        <div className="pt-2">
          {saveError && (
            <p className="text-[13px] font-medium mb-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(232,98,26,0.10)', color: '#E8621A', border: '1px solid rgba(232,98,26,0.25)' }}>
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-[13px] font-bold mb-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(45,106,79,0.12)', color: '#2D6A4F', border: '1px solid rgba(45,106,79,0.25)' }}>
              Saved!
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 6px 24px rgba(232,98,26,0.40)' }}
          >
            {saving && (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.40)" strokeWidth="3" />
                <path d="M12 2 a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
