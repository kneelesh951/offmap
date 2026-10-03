'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SessionUser, HostSearchResult } from '@/types'
import type { FeaturedReview } from '@/app/api/reviews/featured/route'
import type { PlatformStats } from '@/app/api/stats/route'
import { CityAutocomplete, type CityOption } from '@/components/ui/CityAutocomplete'
import { HostCard } from '@/components/hosts/HostCard'


const TEAL = '#0C7B7B'
const TEAL_DARK = '#084E4E'
const TEAL_DEEP = '#063B3B'
const YELLOW = '#FFCC00'
const IVORY = '#FAF5E9'
const TERRA = '#E8621A'
const SAGE  = '#5A7350'
// Legacy aliases
const GREEN = TEAL
const GREEN_DARK = TEAL_DARK

// ─── Data ────────────────────────────────────────────────────────────────────

// ─── Hero carousel hosts ─────────────────────────────────────────────────────
// Business logic: these are top featured+verified hosts fetched from
// GET /api/hosts/search?sort=featured&limit=6 and cached for 2 min in Redis.
// In mock mode the data is hardcoded here. In production this component
// receives the array as a prop from the Server Component parent.
// "browsingNow" is a deterministic number seeded from the hostId so it
// appears stable across renders but varies per host.
const CAROUSEL_HOSTS = [
  {
    id: 'host-1',
    name: 'Amira K.',
    city: 'Berlin', flag: '🇩🇪',
    languages: ['EN','DE','AR','FR'],
    tags: ['Street Food','Nightlife','Hidden Gems'],
    rateCents: 2500,
    rating: '4.98', reviews: 143,
    browsingNow: 34,
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&h=500&fit=crop&crop=top&q=80',
    objectPosition: '50% 30%',
  },
  {
    id: 'host-2',
    name: 'Marco V.',
    city: 'Lisbon', flag: '🇵🇹',
    languages: ['EN','PT','ES'],
    tags: ['Food & Drink','History','Art & Culture'],
    rateCents: 3000,
    rating: '4.96', reviews: 98,
    browsingNow: 21,
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&h=500&fit=crop&crop=top&q=80',
    objectPosition: '50% 30%',
  },
  {
    id: 'host-3',
    name: 'Yuki T.',
    city: 'Amsterdam', flag: '🇳🇱',
    languages: ['EN','NL','JA'],
    tags: ['Cycling','Art','Local Markets'],
    rateCents: 2200,
    rating: '5.0', reviews: 211,
    browsingNow: 47,
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&h=500&fit=crop&crop=top&q=80',
    objectPosition: '50% 30%',
  },
  {
    id: 'host-4',
    name: 'Sofia R.',
    city: 'Barcelona', flag: '🇪🇸',
    languages: ['EN','ES','CA','IT'],
    tags: ['Architecture','Tapas','Nightlife'],
    rateCents: 2800,
    rating: '4.97', reviews: 76,
    browsingNow: 29,
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&h=500&fit=crop&crop=top&q=80',
    objectPosition: '50% 30%',
  },
  {
    id: 'host-9',
    name: 'Jan B.',
    city: 'Hamburg', flag: '🇩🇪',
    languages: ['EN','DE','DA'],
    tags: ['Harbour Life','Music Scene','Food'],
    rateCents: 2800,
    rating: '4.93', reviews: 41,
    browsingNow: 18,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=500&fit=crop&crop=top&q=80',
    objectPosition: '50% 30%',
  },
  {
    id: 'host-7',
    name: 'Luca R.',
    city: 'Rome', flag: '🇮🇹',
    languages: ['EN','IT','ES'],
    tags: ['Roman Chef','Markets','History'],
    rateCents: 4500,
    rating: '5.0', reviews: 29,
    browsingNow: 56,
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=900&h=500&fit=crop&crop=top&q=80',
    objectPosition: '50% 30%',
  },
]

const CATEGORIES = [
  { value: 'food-drink',  label: 'Food & Drink',    icon: '🍜', bg: 'linear-gradient(135deg,#E8621A,#F5A623)', shadow: '0 8px 24px rgba(232,98,26,0.35)' },
  { value: 'nature',      label: 'Nature',           icon: '🌿', bg: 'linear-gradient(135deg,#2E8A50,#1A6035)', shadow: '0 8px 24px rgba(46,138,80,0.35)' },
  { value: 'art-culture', label: 'Art & Culture',    icon: '🎨', bg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', shadow: '0 8px 24px rgba(124,58,237,0.35)' },
  { value: 'nightlife',   label: 'Nightlife',        icon: '🎵', bg: 'linear-gradient(135deg,#1C1C2E,#2D2D44)', shadow: '0 8px 24px rgba(28,28,46,0.50)' },
  { value: 'history',     label: 'History',          icon: '🏛️', bg: 'linear-gradient(135deg,#1E3A5F,#2D5A8F)', shadow: '0 8px 24px rgba(30,58,95,0.40)' },
  { value: 'family',      label: 'Family & Kids',    icon: '👨‍👩‍👧', bg: 'linear-gradient(135deg,#C2410C,#EA580C)', shadow: '0 8px 24px rgba(194,65,12,0.40)' },
  { value: 'photography', label: 'Photography',      icon: '📸', bg: 'linear-gradient(135deg,#0F4C4C,#0D6B6B)', shadow: '0 8px 24px rgba(15,76,76,0.40)' },
  { value: 'wine-beer',   label: 'Wine & Beer',      icon: '🍷', bg: 'linear-gradient(135deg,#7F1D1D,#991B1B)', shadow: '0 8px 24px rgba(127,29,29,0.35)' },
  { value: 'markets',     label: 'Markets',          icon: '🛍️', bg: 'linear-gradient(135deg,#D97706,#B45309)', shadow: '0 8px 24px rgba(217,119,6,0.35)' },
  { value: 'sports',      label: 'Sports & Active',  icon: '🏃', bg: 'linear-gradient(135deg,#0369A1,#075985)', shadow: '0 8px 24px rgba(3,105,161,0.35)' },
  { value: 'cooking',     label: 'Cooking Classes',  icon: '🍳', bg: 'linear-gradient(135deg,#3D4A1A,#5C6E2A)', shadow: '0 8px 24px rgba(61,74,26,0.40)' },
  { value: 'wellness',    label: 'Wellness & Spa',   icon: '🧘', bg: 'linear-gradient(135deg,#4C3D8A,#6B5CB8)', shadow: '0 8px 24px rgba(76,61,138,0.40)' },
]

const FALLBACK_HOSTS: HostSearchResult[] = [
  { id: 'host-1', userId: 'user-host-demo', cityId: 'city-berlin',    cityName: 'Berlin',    cityCountry: 'Germany',     flagEmoji: '🇩🇪', headline: 'Berlin street food expert & nightlife guide',                  bio: '', languages: ['en','de','ar','fr','tr'], categories: ['food-drink','art-culture','nightlife'],          hostType: 'female', hourlyRateCents: 2500, neighborhood: 'Neukölln',    avgRating: '4.98', reviewCount: 143, responseRate: '98',  isPremium: true,  isFeatured: true,  idVerificationStatus: 'verified', primaryPhotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&h=800&fit=crop&crop=top&q=80', fullName: 'Amira Khalil',  avatarUrl: null },
  { id: 'host-3', userId: 'user-host-3',    cityId: 'city-lisbon',    cityName: 'Lisbon',    cityCountry: 'Portugal',    flagEmoji: '🇵🇹', headline: 'Alfama local — Fado, food and hidden viewpoints',              bio: '', languages: ['en','pt','es'],             categories: ['food-drink','history','art-culture'],            hostType: 'male',   hourlyRateCents: 3000, neighborhood: 'Alfama',      avgRating: '4.96', reviewCount: 98,  responseRate: '95',  isPremium: true,  isFeatured: true,  idVerificationStatus: 'verified', primaryPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop&crop=top&q=80', fullName: 'Marco Vasquez', avatarUrl: null },
  { id: 'host-4', userId: 'user-host-4',    cityId: 'city-amsterdam', cityName: 'Amsterdam', cityCountry: 'Netherlands', flagEmoji: '🇳🇱', headline: 'I cycle 40km/day — Amsterdam by wheel',                        bio: '', languages: ['en','nl','jp'],             categories: ['nature','art-culture','food-drink'],             hostType: 'female', hourlyRateCents: 2200, neighborhood: 'Jordaan',      avgRating: '5.0',  reviewCount: 211, responseRate: '100', isPremium: true,  isFeatured: true,  idVerificationStatus: 'verified', primaryPhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop&crop=top&q=80', fullName: 'Yuki Tanaka',   avatarUrl: null },
  { id: 'host-5', userId: 'user-host-5',    cityId: 'city-barcelona', cityName: 'Barcelona', cityCountry: 'Spain',       flagEmoji: '🇪🇸', headline: 'Barcelona local for 28 years — the real city',                  bio: '', languages: ['en','es','ca','it'],         categories: ['food-drink','history','art-culture'],            hostType: 'female', hourlyRateCents: 2800, neighborhood: 'Gràcia',       avgRating: '4.97', reviewCount: 76,  responseRate: '92',  isPremium: false, isFeatured: false, idVerificationStatus: 'verified', primaryPhotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop&crop=top&q=80', fullName: 'Sofia Reyes',   avatarUrl: null },
  { id: 'host-2', userId: 'user-host-2',    cityId: 'city-berlin',    cityName: 'Berlin',    cityCountry: 'Germany',     flagEmoji: '🇩🇪', headline: 'Photographer & urban explorer in Berlin-Mitte',                bio: '', languages: ['en','de','ru'],             categories: ['art-culture','history','nature'],                hostType: 'male',   hourlyRateCents: 3000, neighborhood: 'Mitte',        avgRating: '4.85', reviewCount: 67,  responseRate: '94',  isPremium: false, isFeatured: true,  idVerificationStatus: 'verified', primaryPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=top&q=80', fullName: 'Lars Bauer',    avatarUrl: null },
  { id: 'host-7', userId: 'user-host-7',    cityId: 'city-hamburg',   cityName: 'Hamburg',   cityCountry: 'Germany',     flagEmoji: '🇩🇪', headline: 'Hamburg harbour local — fish markets, Reeperbahn & the real port city', bio: '', languages: ['en','de','da'], categories: ['nightlife','history','food-drink'],              hostType: 'male',   hourlyRateCents: 2800, neighborhood: 'Altona',       avgRating: '4.93', reviewCount: 41,  responseRate: '91',  isPremium: false, isFeatured: true,  idVerificationStatus: 'verified', primaryPhotoUrl: 'https://images.unsplash.com/photo-1560250097-0dc05329d0ea?w=600&h=800&fit=crop&crop=top&q=80', fullName: 'Jan Bremer',    avatarUrl: null },
]

const HOW_STEPS = [
  { n: 1, title: 'Browse host profiles',  desc: 'Explore verified locals by city, interest, and language. Every profile shows their story, availability, and real reviews from past travelers.', icon: '🔍', visual: 'Browse verified locals',       chip: '1,300+ profiles available' },
  { n: 2, title: 'Subscribe to connect',  desc: 'Get a day pass from €6. Unlock messaging with any host in any city — unlimited connections, no per-message fees.',                          icon: '💳', visual: 'Subscribe once, connect all',  chip: 'Day pass from €6' },
  { n: 3, title: 'Chat & plan directly',  desc: 'Message your host, agree on timing, price, and itinerary. Everything negotiated directly between you — no surprises.',                   icon: '💬', visual: 'Direct host messaging',         chip: 'No hidden fees' },
  { n: 4, title: 'Book your session',     desc: 'Confirm the date, time, and duration with a secure booking. Get an instant confirmation and reminder before you meet.',                     icon: '📅', visual: 'Secure session booking',         chip: 'Instant confirmation' },
  { n: 5, title: 'Live like a local',     desc: 'Meet your host, explore the real city, leave an honest review for both sides. Build your travel passport, one city at a time.',             icon: '🌍', visual: 'Real local experiences',         chip: '4.9★ average rating' },
]

const PLANS = [
  { key: 'day',    name: 'Day Pass',  desc: '24hr unlimited connections · perfect for a weekend trip', price: '€6',  per: '/day' },
  { key: 'week',   name: 'Weekly',    desc: '7 days unlimited · ideal for a holiday',                  price: '€12', per: '/wk' },
  { key: 'month',  name: 'Monthly',   desc: '30 days unlimited · for the digital nomad',               price: '€18', per: '/mo' },
  { key: 'annual', name: 'Annual',    desc: '365 days · works out to €4/month',                        price: '€49', per: '/yr', badge: 'Best value' },
]


const PERKS = [
  { icon: '💰', title: 'Earn on your terms',          desc: 'Set your own hourly rate. Most of what you earn goes directly to you — with a small platform fee for payments and support.', bg: '#F0FAF4', border: '#C6E7D4' },
  { icon: '🗓️', title: 'Your schedule, your rules', desc: 'Set your own availability. Accept only the travelers you want to meet. No obligations, no minimums.', bg: '#FFF7ED', border: '#FDE0B0' },
  { icon: '🛡️', title: 'Verified & protected',      desc: 'All travelers are verified subscribers with real payment methods. Our community guidelines and review system protect every host.', bg: '#EFF6FF', border: '#BFDBFE' },
  { icon: '⭐', title: 'Build your reputation',     desc: 'Reviews build your profile over time. Premium hosts get top search placement and a verified badge.', bg: '#FFFBEB', border: '#FDE68A' },
]

const HOST_TYPES = [
  { value: 'any',    icon: '🌍', label: 'Any' },
  { value: 'male',   icon: '👨', label: 'Male' },
  { value: 'female', icon: '👩', label: 'Female' },
  { value: 'couple', icon: '👫', label: 'Couple' },
  { value: 'family', icon: '👨‍👩‍👧', label: 'Family' },
  { value: 'group',  icon: '👥', label: 'Group' },
]

const INTERESTS = [
  { value: 'food-drink',  label: 'Food & Drink' },
  { value: 'art-culture', label: 'Art & Culture' },
  { value: 'nature',      label: 'Nature' },
  { value: 'nightlife',   label: 'Nightlife' },
  { value: 'history',     label: 'History' },
  { value: 'family',      label: 'Family' },
]
const LANGS = ['English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Dutch']
const today = new Date().toISOString().split('T')[0]

// ─── Carousel host mapping ────────────────────────────────────────────────────

// Fallback photo + objectPosition for known mock hosts (no real photos in mock mode)
const MOCK_HOST_PHOTOS: Record<string, { url: string; pos: string }> = {
  'host-1': { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&h=500&fit=crop&crop=top&q=80', pos: '50% 30%' },
  'host-2': { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&h=500&fit=crop&crop=top&q=80', pos: '50% 30%' },
  'host-3': { url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&h=500&fit=crop&crop=top&q=80', pos: '50% 30%' },
  'host-4': { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&h=500&fit=crop&crop=top&q=80', pos: '50% 30%' },
  'host-7': { url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=900&h=500&fit=crop&crop=top&q=80', pos: '50% 30%' },
  'host-9': { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=500&fit=crop&crop=top&q=80', pos: '50% 30%' },
}
const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'

const CATEGORY_LABELS: Record<string, string> = {
  'food-drink': 'Food & Drink', 'art-culture': 'Art & Culture', 'nature': 'Nature',
  'nightlife': 'Nightlife', 'history': 'History', 'family': 'Family',
  'photography': 'Photography', 'wine-beer': 'Wine & Beer', 'markets': 'Markets',
  'sports': 'Sports', 'cooking': 'Cooking', 'wellness': 'Wellness',
}

function browsingNow(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 55) + 12
}

const CARD_GRADIENTS = [
  { grad: 'linear-gradient(135deg,#C55A28,#A64820)', bg: 'linear-gradient(135deg,#2A0E05 0%,#7A3018 50%,#C55A28 100%)' },
  { grad: 'linear-gradient(135deg,#2E8A50,#1A5A30)', bg: 'linear-gradient(135deg,#051A0E 0%,#1A5A30 50%,#4A9A5A 100%)' },
  { grad: 'linear-gradient(135deg,#2A7AAA,#1A4A6A)', bg: 'linear-gradient(135deg,#051018 0%,#1A4A6A 50%,#4A8AAA 100%)' },
  { grad: 'linear-gradient(135deg,#C4901A,#8A5A0A)', bg: 'linear-gradient(135deg,#1E1200 0%,#6A3A08 50%,#C4901A 100%)' },
  { grad: 'linear-gradient(135deg,#7C3AED,#5B21B6)', bg: 'linear-gradient(135deg,#1A0540 0%,#4A1A8A 50%,#7C3AED 100%)' },
  { grad: 'linear-gradient(135deg,#0E7490,#155E75)', bg: 'linear-gradient(135deg,#001A20 0%,#0A4A5A 50%,#0E7490 100%)' },
]

function mapToCarousel(h: any) {
  const fb = MOCK_HOST_PHOTOS[h.id]
  const nameParts = (h.fullName ?? 'Host').split(' ')
  const shortName = nameParts.length > 1
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
    : nameParts[0]
  return {
    id: h.id,
    name: shortName,
    city: h.cityName ?? '',
    flag: h.flagEmoji ?? '🌍',
    languages: (h.languages ?? []).map((l: string) => l.toUpperCase()).slice(0, 4),
    tags: (h.categories ?? []).map((c: string) => CATEGORY_LABELS[c] ?? c).slice(0, 3),
    rateCents: h.hourlyRateCents ?? 0,
    rating: String(h.avgRating ?? '4.9'),
    reviews: h.reviewCount ?? 0,
    browsingNow: browsingNow(h.id),
    photo: h.primaryPhotoUrl ?? fb?.url ?? FALLBACK_PHOTO,
    objectPosition: fb?.pos ?? '50% 30%',
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

// ─── Hero Carousel Component ─────────────────────────────────────────────────
function HeroCarousel({ hosts }: { hosts: ReturnType<typeof mapToCarousel>[] }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const count = hosts.length

  const goTo = (next: number) => {
    if (fading || count === 0) return
    setFading(true)
    setTimeout(() => {
      setIndex((next + count) % count)
      setFading(false)
    }, 300)
  }

  const prev = () => goTo(index - 1)
  const next = () => goTo(index + 1)

  // Reset + restart interval when user navigates manually
  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => goTo(index + 1), 4500)
  }

  useEffect(() => {
    if (count === 0) return
    intervalRef.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIndex(i => (i + 1) % count)
        setFading(false)
      }, 300)
    }, 4500)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [count])

  const host = hosts[index]
  if (!host) return null

  return (
    <div className="absolute" style={{ top:0, left:0, right:0, zIndex:5 }}>
      {/* Main card — horizontal layout: photo left, info right */}
      <div
        onClick={() => router.push(`/hosts/${host.id}`)}
        style={{
          height:'200px', borderRadius:'22px', overflow:'hidden',
          boxShadow:'0 24px 70px rgba(0,0,0,0.40)',
          position:'relative', cursor:'pointer',
          display:'flex',
          background:`linear-gradient(135deg, #07334A 0%, #0A4D6B 40%, #0D6585 70%, #0A4D6B 100%)`,
        }}
      >
        {/* Photo — left side, contained */}
        <div style={{ width:'42%', position:'relative', overflow:'hidden', flexShrink:0, borderRight:'2px solid rgba(255,255,255,0.12)' }}>
          <img
            src={host.photo}
            alt={host.name}
            style={{
              width:'100%', height:'100%', objectFit:'cover',
              objectPosition: host.objectPosition ?? '50% 30%',
              opacity: fading ? 0 : 1,
              transition: 'opacity 0.30s ease',
            }}
          />

        </div>

        {/* Info — right side */}
        <div style={{
          flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
          padding:'18px 22px 18px 10px',
          opacity: fading ? 0 : 1, transition: 'opacity 0.30s ease',
        }}>
          {/* Top row: browsing now + verified badge */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span className="glow-dot" style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ADE80', display:'inline-block', flexShrink:0 }} />
              <span style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.7)', whiteSpace:'nowrap' }}>{host.browsingNow} browsing now</span>
            </div>
            <div style={{ borderRadius:'99px', padding:'6px 16px', background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', gap:'6px', boxShadow:'0 2px 10px rgba(0,0,0,0.12)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#1D9BF0"/><path d="M9.5 13.5l2 2 4-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontSize:'11px', fontWeight:800, color:GREEN_DARK, letterSpacing:'0.03em' }}>Verified Host</span>
            </div>
          </div>

          {/* Name */}
          <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-0.02em', marginBottom:'4px' }}>
            {host.name}
          </div>

          {/* Location + languages */}
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.75)', fontWeight:600, marginBottom:'12px' }}>
            {host.flag} {host.city} · {host.languages.join(' · ')}
          </div>

          {/* Rating */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
            <div style={{ fontSize:'14px', fontWeight:800, color:YELLOW }}>★ {host.rating}</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.50)', fontWeight:500 }}>{host.reviews} reviews</div>
          </div>

          {/* Tags + price */}
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {(host.tags as string[]).map((t: string) => (
              <span key={t} style={{ fontSize:'10px', fontWeight:600, padding:'3px 10px', borderRadius:'999px', background:'rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.85)', border:'1px solid rgba(255,255,255,0.18)' }}>{t}</span>
            ))}
            <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 10px', borderRadius:'999px', background:TERRA, color:'#fff' }}>
              €{Math.round(host.rateCents / 100)}/hr
            </span>
          </div>
        </div>

        {/* Hover scrim */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
          style={{ background:'rgba(6,95,95,0.10)' }} />

        {/* Left arrow — inside card, vertically centred */}
        <button
          onClick={e => { e.stopPropagation(); prev(); resetInterval() }}
          className="group"
          style={{
            position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)',
            width:'32px', height:'32px', borderRadius:'50%', border:'none', cursor:'pointer',
            background:'rgba(0,0,0,0.40)', backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.70)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.40)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Right arrow — inside card */}
        <button
          onClick={e => { e.stopPropagation(); next(); resetInterval() }}
          style={{
            position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
            width:'32px', height:'32px', borderRadius:'50%', border:'none', cursor:'pointer',
            background:'rgba(0,0,0,0.40)', backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.70)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.40)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Dots + counter row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginTop:'10px' }}>
        {hosts.map((_, i) => (
          <button
            key={i}
            onClick={() => { goTo(i); resetInterval() }}
            style={{
              width: i === index ? '20px' : '6px',
              height:'6px', borderRadius:'99px', border:'none', cursor:'pointer', padding:0,
              background: i === index ? TERRA : 'rgba(255,255,255,0.35)',
              transition:'all 0.3s ease',
            }}
          />
        ))}
        <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.40)', fontWeight:600, marginLeft:'4px' }}>
          {index + 1}/{hosts.length}
        </span>
      </div>
    </div>
  )
}

export function HomeClient({ sessionUser, featuredHosts }: { sessionUser: any; featuredHosts?: any[] }) {
  const carouselHosts = (featuredHosts && featuredHosts.length > 0)
    ? featuredHosts.map(mapToCarousel)
    : CAROUSEL_HOSTS.map(mapToCarousel)
  const displayHosts: HostSearchResult[] = (featuredHosts && featuredHosts.length > 0)
    ? featuredHosts.slice(0, 8) as HostSearchResult[]
    : FALLBACK_HOSTS
  const router = useRouter()

  // Search widget
  const [tab, setTab]               = useState<'find'|'trip'>('find')
  const [heroCities, setHeroCities] = useState<CityOption[]>([])
  const [findCity, setFindCity]     = useState('')
  const [findWhen, setFindWhen]     = useState('')
  const [findInt,  setFindInt]      = useState('')
  const [findLang, setFindLang]     = useState('')
  const [tripCity, setTripCity]     = useState('')
  const [tripArr,  setTripArr]      = useState('')
  const [tripDep,  setTripDep]      = useState('')
  const [tripInt,  setTripInt]      = useState('')
  const [hostType, setHostType]     = useState('any')

  // How it works
  const [howStep, setHowStep]       = useState(0)

  // Pricing
  const [plan, setPlan]             = useState('day')

  // Rotating review card
  const [featuredReviews, setFeaturedReviews] = useState<FeaturedReview[]>([])

  // Platform stats
  const [stats, setStats] = useState<PlatformStats>({ hostCount: 47, cityCount: 8, topCityFlags: ['🇩🇪','🇵🇹','🇳🇱','🇪🇸'] })
  const [reviewIdx, setReviewIdx]   = useState(0)
  const [reviewVisible, setReviewVisible] = useState(true)
  const [reviewSlide, setReviewSlide] = useState(0)

  // Fetch featured reviews + platform stats once on mount
  useEffect(() => {
    fetch('/api/reviews/featured')
      .then(r => r.json())
      .then(j => { if (j.success && j.data?.length) setFeaturedReviews(j.data) })
      .catch(() => {})
    fetch('/api/stats')
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setStats(j.data) })
      .catch(() => {})
    fetch('/api/cities')
      .then(r => r.json())
      .then(j => { if (j.success) setHeroCities(j.data) })
      .catch(() => {})
  }, [])

  // Rotate review card every 7s with fade (only when reviews loaded)
  useEffect(() => {
    if (featuredReviews.length < 2) return
    const id = setInterval(() => {
      setReviewVisible(false)
      setTimeout(() => {
        setReviewIdx(i => (i + 1) % featuredReviews.length)
        setReviewVisible(true)
      }, 400)
    }, 7000)
    return () => clearInterval(id)
  }, [featuredReviews])

  const handleFind = () => {
    const p = new URLSearchParams()
    if (findCity) p.set('cityId', findCity)
    if (findInt)  p.set('categories', findInt)
    if (findLang) p.set('q', findLang)
    router.push(`/search?${p}`)
  }

  const handleTrip = () => {
    const p = new URLSearchParams()
    if (tripCity) p.set('cityId', tripCity)
    if (tripArr)  p.set('arrival', tripArr)
    if (tripDep)  p.set('departure', tripDep)
    if (tripInt)  p.set('interest', tripInt)
    if (hostType && hostType !== 'any') p.set('hostType', hostType)
    router.push(`/trips/post?${p}`)
  }

  const sel: React.CSSProperties = {
    background:'transparent', border:'none', outline:'none',
    fontSize:'14px', fontWeight:800, color:TEAL_DARK, cursor:'pointer',
    fontFamily:'inherit', width:'100%', appearance:'none' as any,
    padding: 0, margin: 0, letterSpacing: '-0.01em',
  }

  const active = HOW_STEPS[howStep]

  return (
    <main className="min-h-screen pt-[66px]" style={{ background: IVORY }}>

      {/* ════════════════════════════════════════
          HERO — two-column split
      ════════════════════════════════════════ */}
      <section style={{ position:'relative', overflow:'hidden' }}>
        {/* Teal gradient background */}
        <div className="absolute inset-0" style={{ background:'linear-gradient(155deg, rgba(4,45,45,0.96) 0%, rgba(6,62,62,0.95) 35%, rgba(8,78,78,0.93) 70%, rgba(6,55,55,0.95) 100%)' }} />
        {/* Glossy sheen — diagonal glass highlight */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 20%, transparent 45%, rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%)' }} />
        {/* Warm glow — bottom right */}
        <div className="absolute pointer-events-none" style={{ bottom:'-80px', right:'-60px', width:'550px', height:'550px', borderRadius:'50%', background:'radial-gradient(circle, rgba(255,204,0,0.12) 0%, rgba(255,204,0,0.04) 50%, transparent 70%)' }} />
        {/* Cyan bloom — top left */}
        <div className="absolute pointer-events-none" style={{ top:'-120px', left:'-60px', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 65%)' }} />
        {/* Gloss band — horizontal light strip */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.08) 100%)' }} />

        <div className="relative max-w-7xl mx-auto px-5 md:px-11 py-8 md:py-10 grid md:grid-cols-2 gap-12 items-center">

          {/* LEFT */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-7 text-[12px] font-bold fade-up"
              style={{ background:'linear-gradient(135deg, rgba(20,184,166,0.22) 0%, rgba(255,255,255,0.08) 100%)', border:'1px solid rgba(20,184,166,0.45)', color:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', boxShadow:'0 2px 12px rgba(20,184,166,0.25), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background:'#14B8A6', boxShadow:'0 0 8px rgba(20,184,166,0.80)' }} />
              Now live across Europe · 8 cities
            </div>

            {/* Headline */}
            <h1 className="font-serif font-bold text-white mb-5 fade-up fade-up-delay-1"
              style={{ fontSize:'clamp(42px,5vw,72px)', letterSpacing:'-0.045em', lineHeight:1.02 }}>
              Travel like<br />
              a <span className="text-gradient-sunrise" style={{ fontVariationSettings:'"SOFT" 100', filter:'drop-shadow(0 0 32px rgba(245,166,35,0.55))' }}>local,</span><br />
              <span style={{ color:'rgba(255,255,255,0.45)', fontWeight:300, letterSpacing:'-0.02em' }}>not a tourist.</span>
            </h1>

            {/* Divider accent line */}
            <div className="mb-5 fade-up fade-up-delay-1" style={{ width:'48px', height:'3px', borderRadius:'99px', background:'linear-gradient(90deg, #14B8A6, rgba(20,184,166,0.0))' }} />

            {/* Tagline frame */}
            <div className="inline-flex items-center gap-2.5 mb-5 fade-up fade-up-delay-2 px-4 py-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(255,204,0,0.20) 0%, rgba(255,204,0,0.10) 100%)',
                border: '1.5px solid rgba(255,204,0,0.55)',
                boxShadow: '0 0 20px rgba(255,204,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: YELLOW, boxShadow: `0 0 8px rgba(255,204,0,0.90)`, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em', color: YELLOW, textShadow: '0 0 16px rgba(255,204,0,0.70)' }}>
                No map. Just locals.
              </span>
            </div>

            <p className="mb-7 fade-up fade-up-delay-2 max-w-md" style={{ color:'rgba(255,255,255,0.85)', fontSize:'15.5px', lineHeight:1.75, fontWeight:500 }}>
              Connect with verified locals who show you the real city — hidden cafés, neighbourhood stories, and experiences no guidebook covers.
            </p>

            {/* ── Search widget ── */}
            <div className="rounded-2xl mb-6 fade-up fade-up-delay-3 overflow-hidden hero-card"
              style={{ background:'linear-gradient(145deg,rgba(250,245,233,0.98) 0%,rgba(255,252,247,0.98) 100%)' }}>

              {/* Tab bar — underline style */}
              <div className="flex" style={{ borderBottom:'2px solid rgba(10,143,143,0.10)' }}>
                <button onClick={() => setTab('find')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 text-[14px] font-bold transition-all"
                  style={{
                    color: tab==='find' ? GREEN : '#7BAEAE',
                    borderBottom: tab==='find' ? `2.5px solid ${GREEN}` : '2.5px solid transparent',
                    marginBottom: '-2px',
                    background: 'transparent',
                  }}>
                  🔍 Find a host
                </button>
                <div style={{ width:'1px', background:'rgba(10,143,143,0.10)', margin:'10px 0' }} />
                <button onClick={() => setTab('trip')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 text-[14px] font-bold transition-all"
                  style={{
                    color: tab==='trip' ? GREEN : '#7BAEAE',
                    borderBottom: tab==='trip' ? `2.5px solid ${GREEN}` : '2.5px solid transparent',
                    marginBottom: '-2px',
                    background: 'transparent',
                  }}>
                  ✈️ Post my trip
                </button>
              </div>

              {/* Find a host tab */}
              {tab === 'find' && (
                <div className="p-3 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg px-3.5 py-2.5 hero-field"
                      >
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>City</div>
                      <CityAutocomplete cities={heroCities} value={findCity} onChange={setFindCity} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 hero-field"
                      >
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>When</div>
                      <input type="date" value={findWhen} min={today} onChange={e=>setFindWhen(e.target.value)}
                        style={{...sel, colorScheme:'light', color:findWhen?TEAL_DARK:'#5A9E9E'}} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 hero-field"
                      >
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Interest</div>
                      <select value={findInt} onChange={e=>setFindInt(e.target.value)} style={{...sel, color: findInt ? TEAL_DARK : '#5A9E9E'}}>
                        <option value="">Food, Art, Nightlife…</option>
                        {INTERESTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 hero-field"
                      >
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Language</div>
                      <select value={findLang} onChange={e=>setFindLang(e.target.value)} style={{...sel, color: findLang ? TEAL_DARK : '#5A9E9E'}}>
                        <option value="">English, German…</option>
                        {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={handleFind}
                    className="w-full py-3 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background:`linear-gradient(135deg,${TERRA},#F07830)`, boxShadow:'0 4px 18px rgba(232,98,26,0.40)' }}>
                    Search hosts →
                  </button>
                </div>
              )}

              {/* Post my trip tab */}
              {tab === 'trip' && (
                <div className="p-3 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg px-3.5 py-2.5 hero-field"
                      >
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Destination</div>
                      <CityAutocomplete cities={heroCities} value={tripCity} onChange={setTripCity} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 hero-field"
                      >
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Arrival</div>
                      <input type="date" value={tripArr} min={today} onChange={e=>setTripArr(e.target.value)}
                        style={{...sel, colorScheme:'light', color:tripArr?TEAL_DARK:'#5A9E9E'}} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 hero-field"
                      >
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Departure</div>
                      <input type="date" value={tripDep} min={tripArr||today} onChange={e=>setTripDep(e.target.value)}
                        style={{...sel, colorScheme:'light', color:tripDep?TEAL_DARK:'#5A9E9E'}} />
                    </div>
                  </div>
                  <div className="rounded-lg px-3.5 py-2.5 hero-field"
                    >
                    <div style={{ fontSize:'9px', fontWeight:900, letterSpacing:'0.13em', color:TERRA, textTransform:'uppercase', marginBottom:'8px' }}>Host type</div>
                    <div className="flex flex-wrap gap-1.5">
                      {HOST_TYPES.map(h => (
                        <button key={h.value} onClick={() => setHostType(h.value)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                          style={{ background:hostType===h.value ? GREEN : '#fff', color:hostType===h.value ? '#fff' : GREEN_DARK, border:`1px solid ${hostType===h.value ? GREEN : 'rgba(10,143,143,0.18)'}` }}>
                          <span style={{ fontSize:'13px', lineHeight:1 }}>{h.icon}</span>
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleTrip}
                    className="w-full py-3 rounded-full text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background:`linear-gradient(135deg,${SAGE},#3A5230)`, boxShadow:'0 4px 18px rgba(90,115,80,0.40)' }}>
                    Post my trip — hosts will reach out →
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT — carousel + 4 cards */}
          <div className="hidden md:block">

            <style>{`
              @keyframes floatUp {
                0%,100% { transform: translateY(0px); }
                50%      { transform: translateY(-10px); }
              }
              @keyframes floatDown {
                0%,100% { transform: translateY(0px); }
                50%      { transform: translateY(10px); }
              }
              @keyframes glowPulse {
                0%,100% { box-shadow: 0 0 0 2px rgba(74,222,128,0.35); }
                50%      { box-shadow: 0 0 0 6px rgba(74,222,128,0.08); }
              }
              .fc-review  { animation: floatUp 5s ease-in-out infinite; }
              .fc-live    { animation: floatDown 6s ease-in-out infinite; animation-delay: 1s; }
              .glow-dot   { animation: glowPulse 2s ease-in-out infinite; }
            `}</style>

            {/* ── Host carousel ── */}
            <div className="relative w-full" style={{ height:'200px', marginTop:'140px' }}>
              <HeroCarousel hosts={carouselHosts} />
            </div>

            {/* ── Live activity feed ── */}
            <div style={{ marginTop:'28px' }}>
              <style>{`
                @keyframes feedScroll {
                  0%   { transform: translateY(0); }
                  100% { transform: translateY(-50%); }
                }
                .feed-track { animation: feedScroll 18s linear infinite; }
                .feed-track:hover { animation-play-state: paused; }
              `}</style>
              <div style={{ borderRadius:'20px', background:'rgba(255,255,255,0.10)', backdropFilter:'blur(18px)', border:'1px solid rgba(255,255,255,0.22)', boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden', padding:'0' }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', borderBottom:'1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                    <span className="glow-dot" style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4ADE80', display:'inline-block', flexShrink:0 }} />
                    <span style={{ fontSize:'11px', fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'0.10em' }}>Live activity</span>
                  </div>
                  <span style={{ fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.55)' }}>{stats.hostCount}+ hosts · {stats.cityCount} cities</span>
                </div>
                {/* Scrolling feed */}
                <div style={{ height:'220px', overflow:'hidden', position:'relative' }}>
                  <div className="feed-track">
                    {[
                      { icon:'🤝', color:'#4ADE80', text:'Amira K. connected with a traveler', sub:'Berlin · 2 min ago' },
                      { icon:'★', color:YELLOW, text:'Marco R. left a 5-star review', sub:'Lisbon · 5 min ago' },
                      { icon:'✈️', color:'#60A5FA', text:'Sophie B. posted a trip to Prague', sub:'Arriving Nov 14 · 8 min ago' },
                      { icon:'🏠', color:TERRA, text:'New host joined in Amsterdam', sub:'Food & culture · 12 min ago' },
                      { icon:'💬', color:'#A78BFA', text:'Yuki T. replied in under 3 min', sub:'Tokyo · 15 min ago' },
                      { icon:'🤝', color:'#4ADE80', text:'Lena M. unlocked a Berlin host', sub:'18 min ago' },
                      { icon:'★', color:YELLOW, text:'"This changed how I travel." — Alex D.', sub:'Amsterdam · 22 min ago' },
                      { icon:'✈️', color:'#60A5FA', text:'Carlos V. posted a trip to Barcelona', sub:'Arriving Dec 2 · 25 min ago' },
                    ].concat([
                      { icon:'🤝', color:'#4ADE80', text:'Amira K. connected with a traveler', sub:'Berlin · 2 min ago' },
                      { icon:'★', color:YELLOW, text:'Marco R. left a 5-star review', sub:'Lisbon · 5 min ago' },
                      { icon:'✈️', color:'#60A5FA', text:'Sophie B. posted a trip to Prague', sub:'Arriving Nov 14 · 8 min ago' },
                      { icon:'🏠', color:TERRA, text:'New host joined in Amsterdam', sub:'Food & culture · 12 min ago' },
                      { icon:'💬', color:'#A78BFA', text:'Yuki T. replied in under 3 min', sub:'Tokyo · 15 min ago' },
                      { icon:'🤝', color:'#4ADE80', text:'Lena M. unlocked a Berlin host', sub:'18 min ago' },
                      { icon:'★', color:YELLOW, text:'"This changed how I travel." — Alex D.', sub:'Amsterdam · 22 min ago' },
                      { icon:'✈️', color:'#60A5FA', text:'Carlos V. posted a trip to Barcelona', sub:'Arriving Dec 2 · 25 min ago' },
                    ]).map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'11px', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>{item.icon}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'11px', fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.text}</div>
                          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.50)', marginTop:'1px' }}>{item.sub}</div>
                        </div>
                        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:item.color, flexShrink:0 }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Footer stat row */}
                <div style={{ display:'flex', justifyContent:'space-around', padding:'10px 16px', borderTop:'1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'14px', fontWeight:800, color:'#fff', fontFamily:'var(--font-fraunces), Georgia, serif' }}>⚡ 4 min</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.55)', fontWeight:600, marginTop:'1px' }}>avg reply</div>
                  </div>
                  <div style={{ width:'1px', background:'rgba(255,255,255,0.12)' }} />
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'14px', fontWeight:800, color:'#fff', fontFamily:'var(--font-fraunces), Georgia, serif' }}>€6<span style={{ fontSize:'10px', fontWeight:500 }}>/day</span></div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.55)', fontWeight:600, marginTop:'1px' }}>from</div>
                  </div>
                  <div style={{ width:'1px', background:'rgba(255,255,255,0.12)' }} />
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'14px', fontWeight:800, color:'#fff', fontFamily:'var(--font-fraunces), Georgia, serif' }}>4.9★</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.55)', fontWeight:600, marginTop:'1px' }}>avg rating</div>
                  </div>
                </div>
              </div>
            </div>{/* end feed */}

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          POST A TRIP — how it works
      ════════════════════════════════════════ */}
      <div style={{ background:`linear-gradient(160deg, #E5F4F4 0%, ${IVORY} 100%)`, borderTop:'1px solid rgba(10,143,143,0.10)', borderBottom:'1px solid rgba(10,143,143,0.10)' }}>
        <div className="max-w-7xl mx-auto px-5 md:px-11 py-16">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <div className="overline text-terra mb-2">New feature</div>
              <h2 className="font-serif text-4xl md:text-5xl font-bold" style={{ color:GREEN_DARK, letterSpacing:'-0.03em', lineHeight:1.08 }}>
                Post your trip.<br />
                Let hosts <span className="text-gradient-terra">find you.</span>
              </h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed" style={{ color:'#2E7A7A' }}>
                Don't want to search? Tell us where you're going and what you want to experience — verified locals in that city will reach out to you directly.
              </p>
            </div>
            <Link href="/trips/post"
              className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-bold text-white hover:-translate-y-0.5 transition-all"
              style={{ background:`linear-gradient(135deg,${TERRA},#F07830)`, boxShadow:'0 6px 24px rgba(232,98,26,0.40)', whiteSpace:'nowrap' }}>
              ✈️ Post a trip request →
            </Link>
          </div>

          {/* Step cards — each with a distinct colour */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[
              {
                n:'01', icon:'✈️', title:'Post your trip',
                desc:'Enter your destination, dates, interests, and preferred host type.',
                bg:'linear-gradient(135deg,#E8621A 0%,#F5A623 100%)',
                shadow:'0 12px 32px rgba(232,98,26,0.35)',
              },
              {
                n:'02', icon:'🔔', title:'Hosts get notified',
                desc:'Matching local hosts in your city are notified and review your trip details.',
                bg:`linear-gradient(135deg,${TEAL_DARK} 0%,${TEAL} 100%)`,
                shadow:'0 12px 32px rgba(10,143,143,0.35)',
              },
              {
                n:'03', icon:'💬', title:'Hosts reach out',
                desc:'Interested locals send you a message. You choose who to connect with.',
                bg:'linear-gradient(135deg,#4A7A9E 0%,#2A5A8E 100%)',
                shadow:'0 12px 32px rgba(74,122,158,0.35)',
              },
              {
                n:'04', icon:'🌍', title:'Plan your experience',
                desc:'Meet up, explore the real city together, and leave reviews for each other.',
                bg:'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
                shadow:'0 12px 32px rgba(124,58,237,0.35)',
              },
            ].map(s => (
              <div key={s.n} className="rounded-2xl p-6 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-200"
                style={{ background:s.bg, boxShadow:s.shadow }}>
                <div className="flex items-start justify-between">
                  <span style={{ fontSize:'32px', lineHeight:1 }}>{s.icon}</span>
                  <span className="font-serif font-bold text-[28px] leading-none" style={{ color:'rgba(255,255,255,0.18)', letterSpacing:'-0.04em' }}>{s.n}</span>
                </div>
                <h3 className="font-serif text-[17px] font-bold text-white" style={{ letterSpacing:'-0.02em' }}>{s.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color:'rgba(255,255,255,0.80)' }}>{s.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════
          CATEGORIES
      ════════════════════════════════════════ */}
      <div style={{ background:`linear-gradient(160deg, #FFF8E8 0%, ${IVORY} 100%)`, borderTop:'1px solid rgba(255,204,0,0.15)', borderBottom:'1px solid rgba(255,204,0,0.15)' }}>
      <div className="max-w-7xl mx-auto px-5 md:px-11 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="overline text-terra mb-1">Explore by interest</div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold" style={{ color:GREEN_DARK, letterSpacing:'-0.03em' }}>What's your <span className="text-gradient-terra">vibe?</span></h2>
          </div>
          <Link href="/search" className="text-[13px] font-bold hover:gap-2 transition-all flex items-center gap-1" style={{ color:TERRA }}>See all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {CATEGORIES.map(c => (
            <Link key={c.value} href={`/search?categories=${c.value}`}
              className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl hover:-translate-y-1 transition-all duration-200"
              style={{ background: c.bg, boxShadow: c.shadow }}>
              <span style={{ fontSize:'36px', lineHeight:1, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.20))' }}>{c.icon}</span>
              <div className="font-serif text-[13px] font-bold text-white" style={{ letterSpacing:'-0.01em', lineHeight:1.2 }}>{c.label}</div>
            </Link>
          ))}
        </div>
      </div>
      </div>{/* end categories bg wrapper */}

      {/* ════════════════════════════════════════
          FEATURED HOSTS
      ════════════════════════════════════════ */}
      <div style={{ background:`linear-gradient(160deg, #EAF6F6 0%, ${IVORY} 100%)`, borderTop:'1px solid rgba(10,143,143,0.08)', borderBottom:'1px solid rgba(10,143,143,0.08)' }}>
      <div className="max-w-7xl mx-auto px-5 md:px-11 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="overline text-terra mb-1">Top rated</div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold" style={{ color:GREEN_DARK, letterSpacing:'-0.03em' }}>Featured <span className="text-gradient-terra">hosts</span></h2>
          </div>
          <Link href="/search" className="text-[13px] font-bold flex items-center gap-1 hover:gap-2 transition-all" style={{ color:TERRA }}>Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayHosts.map(h => (
            <HostCard key={h.id} host={h} compact />
          ))}
        </div>
      </div>
      </div>{/* end featured hosts bg wrapper */}

      {/* ════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════ */}
      <div id="how" style={{ position:'relative', overflow:'hidden' }}>
        {/* Travel background — Lisbon tram street */}
        <div className="absolute inset-0" style={{ backgroundImage:'url("https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1920&q=80")', backgroundSize:'cover', backgroundPosition:'center 50%' }} />
        {/* Teal overlay — darker glossy */}
        <div className="absolute inset-0" style={{ background:'linear-gradient(155deg, rgba(4,40,40,0.96) 0%, rgba(6,55,55,0.95) 40%, rgba(8,70,70,0.93) 100%)' }} />
        {/* Glossy diagonal sheen */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 25%, transparent 50%, rgba(255,255,255,0.04) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 70% 60% at 90% 10%, rgba(20,184,166,0.15) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(255,204,0,0.08) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-5 md:px-11 py-16">
          <div className="overline mb-2" style={{ color:'rgba(255,255,255,0.45)' }}>Simple process</div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-10" style={{ letterSpacing:'-0.03em' }}>
            How Offmap <span className="text-gradient-sunrise" style={{ fontVariationSettings:'"SOFT" 100' }}>works</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Steps */}
            <div className="flex flex-col gap-2">
              {HOW_STEPS.map((s, i) => (
                <button key={s.n} onClick={() => setHowStep(i)}
                  className="text-left rounded-2xl p-5 transition-all"
                  style={{ background: howStep===i ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', border:`1px solid ${howStep===i?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.08)'}` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 transition-all"
                      style={{ background: howStep===i ? TERRA : 'rgba(255,255,255,0.10)', color:'#fff' }}>{s.n}</div>
                    <div>
                      <div className="font-serif text-[16px] font-bold text-white mb-1">{s.title}</div>
                      {howStep===i && <div className="text-[13px] leading-relaxed" style={{ color:'rgba(255,255,255,0.65)' }}>{s.desc}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* Visual */}
            <div className="rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[280px]"
              style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)' }}>
              <div className="text-5xl">{active.icon}</div>
              <div className="font-serif text-2xl font-bold text-white">{active.visual}</div>
              <div className="text-[14px] leading-relaxed max-w-xs" style={{ color:'rgba(255,255,255,0.60)' }}>{active.desc}</div>
              {howStep === 0 ? (
                <Link href="/search" className="px-4 py-2 rounded-full text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-orange-600/40"
                  style={{ background:'rgba(232,98,26,0.30)', border:'1px solid rgba(232,98,26,0.40)' }}>
                  {active.chip} →
                </Link>
              ) : howStep === 1 ? (
                <Link href="/pricing" className="px-4 py-2 rounded-full text-[13px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-orange-600/40"
                  style={{ background:'rgba(232,98,26,0.30)', border:'1px solid rgba(232,98,26,0.40)' }}>
                  {active.chip} →
                </Link>
              ) : (
                <div className="px-4 py-2 rounded-full text-[13px] font-bold text-white"
                  style={{ background:'rgba(232,98,26,0.30)', border:'1px solid rgba(232,98,26,0.40)' }}>
                  {active.chip}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          CITIES
      ════════════════════════════════════════ */}
      {/* ════════════════════════════════════════
          CITIES
      ════════════════════════════════════════ */}
      {(() => {
        const CARD_STYLES = [
          { bg:'linear-gradient(150deg,#EBF7F7,#C6E4E4)', border:'rgba(10,116,116,0.28)', borderHov:'rgba(10,116,116,0.60)', shadow:'rgba(10,116,116,0.09)', shadowHov:'rgba(10,116,116,0.22)', explore:'#0A7474' },
          { bg:'linear-gradient(150deg,#FDF7EE,#F1E4C8)', border:'rgba(158,116,48,0.28)', borderHov:'rgba(158,116,48,0.60)', shadow:'rgba(158,116,48,0.09)', shadowHov:'rgba(158,116,48,0.22)', explore:'#9E7430' },
          { bg:'linear-gradient(150deg,#EFF5ED,#D2E8CA)', border:'rgba(50,106,56,0.28)', borderHov:'rgba(50,106,56,0.60)', shadow:'rgba(50,106,56,0.09)', shadowHov:'rgba(50,106,56,0.22)', explore:'#326A38' },
          { bg:'linear-gradient(150deg,#EDF2F8,#CADAED)', border:'rgba(48,86,152,0.28)', borderHov:'rgba(48,86,152,0.60)', shadow:'rgba(48,86,152,0.09)', shadowHov:'rgba(48,86,152,0.22)', explore:'#305698' },
          { bg:'linear-gradient(150deg,#F8EFED,#EDD8D2)', border:'rgba(154,66,50,0.28)', borderHov:'rgba(154,66,50,0.60)', shadow:'rgba(154,66,50,0.09)', shadowHov:'rgba(154,66,50,0.22)', explore:'#9A4232' },
        ]
        const sorted = [...heroCities].sort((a, b) => (b.hostCount ?? 0) - (a.hostCount ?? 0)).slice(0, 12)

        return (
          <div id="cities" className="max-w-7xl mx-auto px-5 md:px-11 py-14" style={{ borderBottom:`1px solid rgba(10,143,143,0.08)` }}>
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background:TERRA }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background:TERRA }} />
                  </span>
                  <span className="overline text-terra">Available now</span>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl font-bold" style={{ color:GREEN_DARK, letterSpacing:'-0.03em' }}>Live <span className="text-gradient-terra">cities</span></h2>
              </div>
              {heroCities.length > 0 && (
                <Link href="/cities" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-bold whitespace-nowrap hover:gap-2.5 transition-all" style={{ color:TERRA }}>
                  See all {heroCities.length} cities →
                </Link>
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {sorted.map((c, i) => {
                const s = CARD_STYLES[i % CARD_STYLES.length]
                const defBox = `0 2px 14px ${s.shadow}, inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(0,0,0,0.03)`
                const hovBox = `0 10px 30px ${s.shadowHov}, inset 0 1px 0 rgba(255,255,255,0.82)`
                return (
                  <Link
                    key={c.id}
                    href={`/search?cityId=${c.id}`}
                    className="group flex-shrink-0 flex flex-col gap-2 px-4 pt-3.5 pb-3 rounded-[16px]"
                    style={{
                      minWidth: '144px',
                      background: s.bg,
                      border: `2px solid ${s.border}`,
                      boxShadow: defBox,
                      transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.22s ease',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = s.borderHov
                      el.style.boxShadow   = hovBox
                      el.style.transform   = 'translateY(-5px)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = s.border
                      el.style.boxShadow   = defBox
                      el.style.transform   = 'translateY(0)'
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span style={{ fontSize:'26px', lineHeight:1 }}>{c.flagEmoji}</span>
                      <div>
                        <div className="text-[13px] font-bold leading-tight" style={{ color:GREEN_DARK }}>{c.name}</div>
                        {c.hostCount > 0 && (
                          <div className="text-[10.5px] font-semibold mt-0.5" style={{ color:'rgba(8,78,78,0.50)' }}>{c.hostCount} hosts</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color:s.explore }}>
                      Explore <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                    </div>
                  </Link>
                )
              })}
              {heroCities.length > 12 && (
                <Link href="/cities"
                  className="flex-shrink-0 flex items-center justify-center flex-col gap-0.5 px-4 py-3.5 rounded-[16px] transition-all hover:-translate-y-1"
                  style={{ minWidth:'96px', background:TERRA, color:'#fff', boxShadow:'0 4px 16px rgba(232,98,26,0.28)', border:'2px solid rgba(255,255,255,0.22)' }}>
                  <div className="text-[13px] font-bold">+{heroCities.length - 12}</div>
                  <div className="text-[10px] font-semibold opacity-80">more →</div>
                </Link>
              )}
            </div>

            {heroCities.length > 0 && (
              <div className="sm:hidden mt-4">
                <Link href="/cities" className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color:TERRA }}>
                  See all {heroCities.length} cities →
                </Link>
              </div>
            )}
          </div>
        )
      })()}

      {/* ════════════════════════════════════════
          PRICING CTA
      ════════════════════════════════════════ */}
      <div style={{ position:'relative', overflow:'hidden' }}>
        {/* Travel background — Barcelona rooftop */}
        <div className="absolute inset-0" style={{ backgroundImage:'url("https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1920&q=80")', backgroundSize:'cover', backgroundPosition:'center 40%' }} />
        {/* Teal overlay — darker glossy */}
        <div className="absolute inset-0" style={{ background:'linear-gradient(150deg, rgba(4,38,38,0.96) 0%, rgba(6,50,50,0.95) 40%, rgba(8,65,65,0.94) 100%)' }} />
        {/* Glossy sheen */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.04) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 80% 50% at 15% 20%, rgba(20,184,166,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 80%, rgba(255,204,0,0.10) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-5 md:px-11 py-16 grid md:grid-cols-2 gap-14 items-start">
          {/* Left */}
          <div>
            <div className="overline mb-2" style={{ color:'rgba(255,255,255,0.45)' }}>Pricing</div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-5" style={{ letterSpacing:'-0.03em', lineHeight:1.05 }}>
              One pass.<br />Every city.<br />Every local.
            </h2>
            <p className="text-[15px] mb-7 leading-relaxed" style={{ color:'rgba(255,255,255,0.60)' }}>
              Browse all profiles for free. Subscribe to unlock messaging. Hosts set their own rates — you deal directly, no commission.
            </p>
            <div className="flex flex-col gap-3">
              {['Unlimited connections in any city','Direct messaging — no middleman','Hosts negotiate price directly with you','Cancel anytime — no lock-in','GDPR compliant — data stays in EU'].map(f => (
                <div key={f} className="flex items-center gap-3 text-[14px] font-semibold" style={{ color:'rgba(255,255,255,0.80)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background:YELLOW, color:GREEN_DARK }}>✓</div>
                  {f}
                </div>
              ))}
            </div>
          </div>
          {/* Right — plan selector */}
          <div>
            <div className="text-[13px] font-bold mb-4" style={{ color:'rgba(255,255,255,0.55)' }}>Choose your plan</div>
            <div className="flex flex-col gap-2 mb-5">
              {PLANS.map(p => (
                <button key={p.key} onClick={() => setPlan(p.key)}
                  className="flex items-center justify-between rounded-2xl p-4 text-left transition-all"
                  style={{ background: plan===p.key?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.06)', border:`1px solid ${plan===p.key?'rgba(255,255,255,0.30)':'rgba(255,255,255,0.10)'}` }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-white">{p.name}</span>
                      {p.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:TERRA, color:'#fff' }}>{p.badge}</span>}
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color:'rgba(255,255,255,0.50)' }}>{p.desc}</div>
                  </div>
                  <div className="font-serif text-xl font-bold flex-shrink-0 ml-4" style={{ color:YELLOW }}>{p.price}<sub className="text-[12px] font-semibold">{p.per}</sub></div>
                </button>
              ))}
            </div>
            <Link href={sessionUser ? '/api/subscriptions/checkout' : '/auth/register'}
              className="block text-center py-3.5 rounded-full text-[15px] font-bold text-white transition-all hover:-translate-y-0.5"
              style={{ background:`linear-gradient(135deg,${TERRA},#F07830)`, boxShadow:'0 6px 28px rgba(232,98,26,0.50)' }}>
              Start connecting now →
            </Link>
            <div className="flex justify-center flex-wrap gap-4 mt-4">
              {['No ads ever','Cancel anytime','GDPR compliant','Secure payment'].map(t => (
                <div key={t} className="text-[11px] font-semibold" style={{ color:'rgba(255,255,255,0.40)' }}>· {t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          REVIEWS — from /api/reviews/featured
      ════════════════════════════════════════ */}
      {featuredReviews.length > 0 && (
      <div style={{ background:`linear-gradient(180deg, ${IVORY} 0%, #F0EBE0 100%)` }}>
        <div className="max-w-7xl mx-auto px-5 md:px-11 py-16">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="overline mb-1" style={{ color:'#7BAEAE' }}>Social proof</div>
              <h2 className="font-serif text-4xl font-bold" style={{ color:GREEN_DARK, letterSpacing:'-0.03em' }}>
                What <span style={{ color:TERRA }}>travelers</span> say
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => setReviewSlide(i => Math.max(0, i - 1))}
                style={{ width:'40px', height:'40px', borderRadius:'50%', border:'1.5px solid rgba(10,143,143,0.18)', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.borderColor = GREEN; (e.currentTarget.firstChild as SVGElement).style.stroke = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; (e.currentTarget.firstChild as SVGElement).style.stroke = GREEN }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button onClick={() => setReviewSlide(i => Math.min(featuredReviews.length - 4, i + 1))}
                style={{ width:'40px', height:'40px', borderRadius:'50%', border:'1.5px solid rgba(10,143,143,0.18)', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.borderColor = GREEN; (e.currentTarget.firstChild as SVGElement).style.stroke = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(8,78,78,0.15)'; (e.currentTarget.firstChild as SVGElement).style.stroke = GREEN }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
          <div style={{ overflow:'hidden', margin:'0 -8px', padding:'0 8px' }}>
            <div style={{ display:'grid', gridAutoFlow:'column', gridAutoColumns:'calc(25% - 12px)', gap:'16px', transition:'transform 0.45s ease', transform:`translateX(calc(-${reviewSlide} * (25% - 12px + 16px)))` }}>
              {featuredReviews.map((r, i) => (
                <div key={`${r.id}-${i}`} className="rounded-2xl p-5 flex flex-col gap-4" style={{ background:'#fff', border:`1px solid rgba(10,143,143,0.08)`, boxShadow:'0 4px 16px rgba(0,0,0,0.05)' }}>
                  <div style={{ color:YELLOW, fontSize:'13px', letterSpacing:'1px' }}>{'★'.repeat(r.rating)}</div>
                  <p className="font-serif text-[13.5px] leading-relaxed flex-1" style={{ color:'#1A4A4A' }}>"{r.body}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-serif font-bold text-white text-xs flex-shrink-0" style={{ background:r.reviewerGradient }}>{r.reviewerInitials}</div>
                    <div>
                      <div className="text-[12px] font-bold" style={{ color:GREEN_DARK }}>{r.reviewerName}</div>
                      <div className="text-[10px]" style={{ color:'#7BAEAE' }}>from {r.reviewerCity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Dots */}
          <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginTop:'20px' }}>
            {Array.from({ length: Math.max(1, featuredReviews.length - 3) }).map((_, i) => (
              <button key={i} onClick={() => setReviewSlide(i)}
                style={{ width: reviewSlide === i ? '24px' : '8px', height:'8px', borderRadius:'99px', border:'none', cursor:'pointer', background: reviewSlide === i ? GREEN : 'rgba(10,143,143,0.12)', transition:'all 0.3s' }} />
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ════════════════════════════════════════
          BECOME A HOST
      ════════════════════════════════════════ */}
      <div style={{ background:IVORY, borderTop:`1px solid rgba(10,143,143,0.08)` }}>
        <div className="max-w-7xl mx-auto px-5 md:px-11 py-16 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="overline text-terra mb-2">For locals</div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-5" style={{ color:GREEN_DARK, letterSpacing:'-0.03em', lineHeight:1.05 }}>
              Share your city.<br />Earn on your<br />
              <span className="text-gradient-terra">own terms.</span>
            </h2>
            <p className="text-[15px] leading-relaxed mb-7" style={{ color:'#2E7A7A' }}>
              List your profile for free. Set your own rate, your own schedule, your own experience. Travelers pay you directly — we never take a commission from your earnings.
            </p>
            <Link href="/become-a-host"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-bold text-white hover:-translate-y-0.5 transition-all"
              style={{ background:`linear-gradient(135deg,${TEAL_DARK},${TEAL})`, boxShadow:'0 6px 24px rgba(10,143,143,0.35)' }}>
              + Become a host — it's free
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {PERKS.map(p => (
              <div key={p.title} className="p-5 card-hover" style={{ background: p.bg, border: `1.5px solid ${p.border}`, borderRadius: '14px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                <div className="text-2xl mb-3">{p.icon}</div>
                <div className="font-serif text-[14px] font-bold mb-2" style={{ color: GREEN_DARK }}>{p.title}</div>
                <div className="text-[13px] leading-relaxed" style={{ color: '#2E7A7A' }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  )
}
