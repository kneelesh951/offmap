'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Star, Heart, MapPin, Shield } from 'lucide-react'
import { formatCents, formatRating, getInitials } from '@/lib/utils'
import type { HostSearchResult } from '@/types'

const CITY_GRADIENTS: Record<string, string> = {
  'city-berlin':    'from-slate-500 via-slate-700 to-slate-900',
  'city-lisbon':    'from-amber-400 via-orange-500 to-red-600',
  'city-amsterdam': 'from-teal-400 via-emerald-500 to-green-700',
  'city-barcelona': 'from-yellow-400 via-orange-400 to-red-500',
  'city-munich':    'from-sky-400 via-blue-500 to-blue-700',
  'city-vienna':    'from-violet-400 via-purple-500 to-purple-800',
  'city-prague':    'from-rose-400 via-pink-500 to-rose-700',
  'city-rome':      'from-orange-400 via-red-400 to-rose-600',
}

const CATEGORY_COLORS: Record<string, string> = {
  'food-drink':  'bg-amber-50 text-amber-700 border border-amber-200/70',
  'art-culture': 'bg-purple-50 text-purple-700 border border-purple-200/70',
  'nightlife':   'bg-indigo-50 text-indigo-700 border border-indigo-200/70',
  'nature':      'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
  'history':     'bg-stone-50 text-stone-600 border border-stone-200/70',
  'family':      'bg-pink-50 text-pink-700 border border-pink-200/70',
  'sports':      'bg-blue-50 text-blue-700 border border-blue-200/70',
  'music':       'bg-violet-50 text-violet-700 border border-violet-200/70',
}

interface HostCardProps {
  host: HostSearchResult
  onConnectClick?: (host: HostSearchResult) => void
}

export function HostCard({ host }: HostCardProps) {
  const [wishlisted, setWishlisted] = useState(false)

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setWishlisted((v) => !v)
    try {
      await fetch('/api/wishlists', {
        method: wishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: host.id }),
      })
    } catch { /* optimistic — silently fail */ }
  }

  const gradient = CITY_GRADIENTS[host.cityId] ?? 'from-terra via-terra-dark to-amber-800'

  return (
    <Link href={`/hosts/${host.userId}`} className="block group h-full">
      <div
        className="rounded-2xl overflow-hidden card-hover h-full flex flex-col"
        style={{
          border: '1px solid rgba(17,80,104,0.25)',
          boxShadow: '0 4px 16px rgba(12,53,71,0.20), 0 1px 4px rgba(12,53,71,0.10)',
        }}
      >
        {/* ── Photo / cover ──────────────────────────────── */}
        <div className="relative h-52 overflow-hidden">
          {host.primaryPhotoUrl ? (
            <img
              src={host.primaryPhotoUrl}
              alt={host.fullName ?? 'Host'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          )}

          {/* Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

          {/* Featured badge */}
          {host.isFeatured && (
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-terra text-white text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ boxShadow: '0 2px 8px rgba(232,98,26,0.5)' }}>
              <Star size={9} className="fill-white" /> Featured
            </div>
          )}

          {/* City badge */}
          {!host.isFeatured && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {host.flagEmoji} {host.cityName}
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={toggleWishlist}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save'}
          >
            <Heart size={14} className={wishlisted ? 'fill-red-500 stroke-red-500' : 'stroke-ink-mid'} />
          </button>

          {/* Rating pill */}
          {host.avgRating && parseFloat(host.avgRating) > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm text-ink text-[12px] font-bold px-2.5 py-1 rounded-full"
              style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
              <Star size={10} className="fill-amber-400 stroke-amber-400" />
              {formatRating(host.avgRating)}
              {host.reviewCount > 0 && (
                <span className="text-ink-muted font-normal">({host.reviewCount})</span>
              )}
            </div>
          )}

          {/* Avatar — overlaps into card body */}
          <div className="absolute bottom-0 right-4 translate-y-1/2 w-12 h-12 rounded-xl border-2 border-white shadow-lg overflow-hidden z-10">
            {host.primaryPhotoUrl ? (
              <img src={host.primaryPhotoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center font-serif text-lg font-bold text-white`}>
                {getInitials(host.fullName)}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="pt-8 px-4 pb-4 flex-1 flex flex-col" style={{ background: 'linear-gradient(160deg, #0C3547, #0E4155, #115068)', borderTop: '2px solid rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2">
            <div className="font-serif text-[17px] font-bold leading-tight" style={{ color: '#fff' }}>
              {host.fullName ?? 'Local host'}
            </div>
            {host.idVerificationStatus === 'verified' && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(184,134,11,0.25)', border: '1px solid rgba(184,134,11,0.40)' }}>
                <Shield size={9} style={{ color: '#F5D060' }} />
                <span className="text-[9px] font-bold" style={{ color: '#F5D060' }}>ID</span>
              </div>
            )}
          </div>

          {host.headline && (
            <p className="text-[12.5px] mt-0.5 leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
              {host.headline}
            </p>
          )}

          {host.neighborhood && (
            <div className="flex items-center gap-1 mt-1.5 text-[11.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>
              <MapPin size={10} style={{ color: '#F5A623' }} />
              {host.neighborhood}
              {host.isFeatured && <span className="ml-0.5">{host.flagEmoji} {host.cityName}</span>}
            </div>
          )}

          <div className="text-[11.5px] font-semibold mt-1.5 tracking-wide" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {host.languages.slice(0, 5).map(l => l.toUpperCase()).join(' · ')}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {host.categories.slice(0, 3).map(cat => (
              <span
                key={cat}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.90)', border: '1px solid rgba(255,255,255,0.20)' }}
              >
                {cat.replace('-', ' ')}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            <div className="text-[13px] font-bold" style={{ color: '#F5A623' }}>
              {formatCents(host.hourlyRateCents)}
              {host.hourlyRateCents
                ? <span className="font-normal text-[11px] ml-1" style={{ color: 'rgba(255,255,255,0.60)' }}>/hr</span>
                : <span className="font-normal text-[11px]" style={{ color: 'rgba(255,255,255,0.60)' }}>Rate on request</span>}
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.90)', border: '1px solid rgba(255,255,255,0.22)' }}>
              Free to browse
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
