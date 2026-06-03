'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Star, Heart, MapPin } from 'lucide-react'

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

interface WishlistHost {
  hostId: string
  userId: string
  fullName: string
  headline: string | null
  primaryPhotoUrl?: string | null
  cityName: string
  flagEmoji: string
  avgRating: string | null
  reviewCount: number
  hourlyRateCents: number | null
  languages: string[]
  categories: string[]
  neighborhood: string | null
}

export function WishlistGrid({ hosts: initialHosts }: { hosts: WishlistHost[] }) {
  const [hosts, setHosts] = useState(initialHosts)

  const removeHost = async (hostId: string) => {
    setHosts(prev => prev.filter(h => h.hostId !== hostId))
    try {
      await fetch('/api/wishlists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId }),
      })
    } catch { /* optimistic remove */ }
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {hosts.map(host => (
        <div key={host.hostId}
          className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5"
          style={{ border: '1px solid rgba(15,61,34,0.08)', boxShadow: '0 2px 8px rgba(15,61,34,0.07)' }}>

          <Link href={`/hosts/${host.userId}`}>
            <div className="relative h-48 overflow-hidden">
              {host.primaryPhotoUrl ? (
                <img src={host.primaryPhotoUrl} alt={host.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                {host.flagEmoji} {host.cityName}
              </div>

              {host.avgRating && parseFloat(host.avgRating) > 0 && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm text-[12px] font-bold px-2.5 py-1 rounded-full"
                  style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                  <Star size={10} className="fill-amber-400 stroke-amber-400" />
                  {parseFloat(host.avgRating).toFixed(1)}
                  {host.reviewCount > 0 && (
                    <span className="text-gray-400 font-normal">({host.reviewCount})</span>
                  )}
                </div>
              )}
            </div>
          </Link>

          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/hosts/${host.userId}`} className="flex-1 min-w-0">
                <div className="font-serif text-[16px] font-bold leading-tight hover:underline" style={{ color: '#0F3D22' }}>
                  {host.fullName}
                </div>
              </Link>
              <button
                onClick={() => removeHost(host.hostId)}
                className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors flex-shrink-0"
                aria-label="Remove from saved"
              >
                <Heart size={14} className="fill-red-500 stroke-red-500" />
              </button>
            </div>

            {host.headline && (
              <p className="text-[12px] mt-1 leading-snug line-clamp-2" style={{ color: '#6B7280' }}>
                {host.headline}
              </p>
            )}

            {host.neighborhood && (
              <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium" style={{ color: '#9CA3AF' }}>
                <MapPin size={10} className="text-orange-400" />
                {host.neighborhood}
              </div>
            )}

            <div className="text-[11px] font-semibold mt-1.5 tracking-wide" style={{ color: '#9CA3AF' }}>
              {host.languages.slice(0, 4).map(l => l.toUpperCase()).join(' · ')}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {host.categories.slice(0, 3).map(cat => (
                <span key={cat}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] ?? 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                  {cat.replace('-', ' ')}
                </span>
              ))}
            </div>

            {host.hourlyRateCents && (
              <div className="mt-3 pt-3 border-t border-black/[0.06] text-[13px] font-bold" style={{ color: '#E8621A' }}>
                €{(host.hourlyRateCents / 100).toFixed(0)}<span className="text-gray-400 font-normal text-[11px] ml-1">/hr</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
