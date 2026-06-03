'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SessionUser } from '@/types'
import type { FeaturedReview } from '@/app/api/reviews/featured/route'
import type { PlatformStats } from '@/app/api/stats/route'
import { CityAutocomplete, type CityOption } from '@/components/ui/CityAutocomplete'


const GREEN = '#0F3D22'
const TERRA = '#E8621A'
const SAGE  = '#5A7350'

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
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80',
    objectPosition: '50% 35%',
  },
  {
    id: 'host-2',
    name: 'Marco V.',
    city: 'Lisbon', flag: '🇵🇹',
    languages: ['EN','PT','ES'],
    tags: ['Fado & Culture','Food Tours','History'],
    rateCents: 3000,
    rating: '4.96', reviews: 98,
    browsingNow: 21,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
    objectPosition: '50% 40%',
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
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
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
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
    objectPosition: '50% 35%',
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
    photo: 'https://images.unsplash.com/photo-1560250097-0dc05329d0ea?w=800&q=80',
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
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80',
    objectPosition: '50% 28%',
  },
]

const CITIES = [
  { id: 'city-berlin',    name: 'Berlin',    flag: '🇩🇪', hosts: 214 },
  { id: 'city-lisbon',    name: 'Lisbon',    flag: '🇵🇹', hosts: 187 },
  { id: 'city-amsterdam', name: 'Amsterdam', flag: '🇳🇱', hosts: 203 },
  { id: 'city-barcelona', name: 'Barcelona', flag: '🇪🇸', hosts: 229 },
  { id: 'city-munich',    name: 'Munich',    flag: '🇩🇪', hosts: 156 },
  { id: 'city-vienna',    name: 'Vienna',    flag: '🇦🇹', hosts: 142 },
  { id: 'city-prague',    name: 'Prague',    flag: '🇨🇿', hosts: 119 },
  { id: 'city-warsaw',    name: 'Warsaw',    flag: '🇵🇱', hosts: 98  },
  { id: 'city-budapest',  name: 'Budapest',  flag: '🇭🇺', hosts: 134 },
  { id: 'city-rome',      name: 'Rome',      flag: '🇮🇹', hosts: 268 },
  { id: 'city-porto',     name: 'Porto',     flag: '🇵🇹', hosts: 89  },
  { id: 'city-athens',    name: 'Athens',    flag: '🇬🇷', hosts: 112 },
]

const CATEGORIES = [
  { value: 'food-drink',  label: 'Food & Drink',    icon: '🍜', count: 438, bg: 'linear-gradient(135deg,#E8621A,#F5A623)', shadow: '0 8px 24px rgba(232,98,26,0.35)' },
  { value: 'nature',      label: 'Nature',           icon: '🌿', count: 312, bg: 'linear-gradient(135deg,#2E8A50,#1A6035)', shadow: '0 8px 24px rgba(46,138,80,0.35)' },
  { value: 'art-culture', label: 'Art & Culture',    icon: '🎨', count: 527, bg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', shadow: '0 8px 24px rgba(124,58,237,0.35)' },
  { value: 'nightlife',   label: 'Nightlife',        icon: '🎵', count: 209, bg: 'linear-gradient(135deg,#1C1C2E,#2D2D44)', shadow: '0 8px 24px rgba(28,28,46,0.50)' },
  { value: 'history',     label: 'History',          icon: '🏛️', count: 384, bg: 'linear-gradient(135deg,#1E3A5F,#2D5A8F)', shadow: '0 8px 24px rgba(30,58,95,0.40)' },
  { value: 'family',      label: 'Family & Kids',    icon: '👨‍👩‍👧', count: 176, bg: 'linear-gradient(135deg,#C2410C,#EA580C)', shadow: '0 8px 24px rgba(194,65,12,0.40)' },
  { value: 'photography', label: 'Photography',      icon: '📸', count: 143, bg: 'linear-gradient(135deg,#0F4C4C,#0D6B6B)', shadow: '0 8px 24px rgba(15,76,76,0.40)' },
  { value: 'wine-beer',   label: 'Wine & Beer',      icon: '🍷', count: 198, bg: 'linear-gradient(135deg,#7F1D1D,#991B1B)', shadow: '0 8px 24px rgba(127,29,29,0.35)' },
  { value: 'markets',     label: 'Markets',          icon: '🛍️', count: 261, bg: 'linear-gradient(135deg,#D97706,#B45309)', shadow: '0 8px 24px rgba(217,119,6,0.35)' },
  { value: 'sports',      label: 'Sports & Active',  icon: '🏃', count: 187, bg: 'linear-gradient(135deg,#0369A1,#075985)', shadow: '0 8px 24px rgba(3,105,161,0.35)' },
  { value: 'cooking',     label: 'Cooking Classes',  icon: '🍳', count: 124, bg: 'linear-gradient(135deg,#3D4A1A,#5C6E2A)', shadow: '0 8px 24px rgba(61,74,26,0.40)' },
  { value: 'wellness',    label: 'Wellness & Spa',   icon: '🧘', count: 156, bg: 'linear-gradient(135deg,#4C3D8A,#6B5CB8)', shadow: '0 8px 24px rgba(76,61,138,0.40)' },
]

const HOSTS = [
  { initials: 'A', name: 'Amira Khalil',  city: 'Berlin',    flag: '🇩🇪', langs: 'EN · DE · AR · FR · TR', tags: ['Street Food','Art Scene','Nightlife'], rate: '€25/hr', rating: '4.98', reviews: 143, grad: 'linear-gradient(135deg,#C55A28,#A64820)', bg: 'linear-gradient(135deg,#2A0E05 0%,#7A3018 50%,#C55A28 100%)', id: 'city-berlin' },
  { initials: 'M', name: 'Marco Vasquez', city: 'Lisbon',    flag: '🇵🇹', langs: 'EN · PT · ES',             tags: ['History','Food','Architecture'],       rate: '€30/hr', rating: '4.96', reviews: 98,  grad: 'linear-gradient(135deg,#2E8A50,#1A5A30)', bg: 'linear-gradient(135deg,#051A0E 0%,#1A5A30 50%,#4A9A5A 100%)', id: 'city-lisbon' },
  { initials: 'Y', name: 'Yuki Tanaka',   city: 'Amsterdam', flag: '🇳🇱', langs: 'EN · NL · JP',             tags: ['Cycling','Markets','Art'],            rate: '€22/hr', rating: '5.0',  reviews: 211, grad: 'linear-gradient(135deg,#2A7AAA,#1A4A6A)', bg: 'linear-gradient(135deg,#051018 0%,#1A4A6A 50%,#4A8AAA 100%)', id: 'city-amsterdam' },
  { initials: 'S', name: 'Sofia Reyes',   city: 'Barcelona', flag: '🇪🇸', langs: 'EN · ES · CA · IT',         tags: ['Tapas','Flamenco','Architecture'],     rate: '€28/hr', rating: '4.97', reviews: 76,  grad: 'linear-gradient(135deg,#C4901A,#8A5A0A)', bg: 'linear-gradient(135deg,#1E1200 0%,#6A3A08 50%,#C4901A 100%)', id: 'city-barcelona' },
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

const REVIEWS = [
  { initials: 'J', grad: 'linear-gradient(135deg,#C55A28,#A64820)', name: 'James K.',  meta: 'London, UK · visited Berlin',    text: 'Amira showed me a Berlin I would never have found in ten trips. We ended up at a rooftop bar that doesn\'t exist on Google Maps and ate döner at 2am. One of my best travel memories.' },
  { initials: 'P', grad: 'linear-gradient(135deg,#2E8A50,#1A5A30)', name: 'Priya M.',  meta: 'Toronto, CA · visited Lisbon',   text: 'Marco took us to a Fado restaurant his family has been going to for decades. The owner sang for us personally. €6 subscription was the best money I spent on the entire trip.' },
  { initials: 'L', grad: 'linear-gradient(135deg,#2A7AAA,#1A4A6A)', name: 'Lars H.',   meta: 'Stockholm, SE · visited Amsterdam', text: 'Yuki cycled with us for 4 hours through Amsterdam neighbourhoods I didn\'t know existed. There\'s no way a tour guide does this. We saw the city through the eyes of someone who lives it.' },
]

const PERKS = [
  { icon: '💰', title: '100% of what you earn',     desc: 'We never take a cut from your sessions. You set the rate, you keep everything travelers pay you directly.' },
  { icon: '🗓️', title: 'Your schedule, your rules', desc: 'Set your own availability. Accept only the travelers you want to meet. No obligations, no minimums.' },
  { icon: '🛡️', title: 'Verified & protected',      desc: 'All travelers are ID-verified before they can message you. Community guidelines protect every host.' },
  { icon: '⭐', title: 'Build your reputation',     desc: 'Reviews build your profile over time. Premium hosts get top search placement and a verified badge.' },
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
  'host-1': { url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80', pos: '50% 35%' },
  'host-2': { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80', pos: '50% 40%' },
  'host-3': { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80', pos: '50% 30%' },
  'host-4': { url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80', pos: '50% 35%' },
  'host-7': { url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80', pos: '50% 28%' },
  'host-9': { url: 'https://images.unsplash.com/photo-1560250097-0dc05329d0ea?w=800&q=80', pos: '50% 30%' },
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

function mapToCard(h: any, i: number) {
  const g = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
  const nameParts = (h.fullName ?? 'Host').split(' ')
  const initials = nameParts.map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  const rate = h.hourlyRateCents ? `€${Math.round(h.hourlyRateCents / 100)}/hr` : '€—/hr'
  return {
    initials,
    name: h.fullName ?? 'Host',
    city: h.cityName ?? '',
    flag: h.flagEmoji ?? '🌍',
    langs: (h.languages ?? []).map((l: string) => l.toUpperCase()).join(' · '),
    tags: (h.categories ?? []).map((c: string) => CATEGORY_LABELS[c] ?? c).slice(0, 3),
    rate,
    rating: String(h.avgRating ?? '—'),
    reviews: h.reviewCount ?? 0,
    grad: g.grad,
    bg: g.bg,
    id: h.id,
  }
}

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
      {/* Main card — clicking navigates to host profile */}
      <div
        onClick={() => router.push(`/hosts/${host.id}`)}
        style={{
          height:'260px', borderRadius:'22px', overflow:'hidden',
          boxShadow:'0 24px 70px rgba(0,0,0,0.40)',
          position:'relative', cursor:'pointer',
        }}
      >
        {/* Photo */}
        <img
          src={host.photo}
          alt={host.name}
          style={{
            width:'100%', height:'100%', objectFit:'cover',
            objectPosition: '50% 20%',
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.30s ease',
            transform: fading ? 'scale(1.02)' : 'scale(1)',
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background:'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.82) 100%)' }} />

        {/* Hover scrim — subtle indication it's clickable */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
          style={{ background:'rgba(15,61,34,0.15)' }} />

        {/* Verified badge — top-left */}
        <div style={{ position:'absolute', top:'12px', left:'12px', borderRadius:'99px', padding:'5px 11px', background:'rgba(15,61,34,0.82)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', gap:'5px' }}>
          <span style={{ fontSize:'10px', color:'#4ADE80' }}>✓</span>
          <span style={{ fontSize:'10px', fontWeight:700, color:'#fff' }}>Verified Host</span>
        </div>

        {/* Browsing now — top-right */}
        <div style={{ position:'absolute', top:'12px', right:'12px', borderRadius:'99px', padding:'5px 11px', background:'rgba(0,0,0,0.52)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', gap:'6px' }}>
          <span className="glow-dot" style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ADE80', display:'inline-block', flexShrink:0 }} />
          <span style={{ fontSize:'11px', fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{host.browsingNow} browsing now</span>
        </div>

        {/* "View profile" hint — bottom-right corner on hover */}
        <div className="absolute opacity-0 hover:opacity-100 transition-opacity"
          style={{ bottom:'14px', right:'14px', borderRadius:'99px', padding:'5px 12px', background:TERRA, fontSize:'10px', fontWeight:700, color:'#fff' }}>
          View profile →
        </div>

        {/* Bottom info */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, padding:'14px 16px',
          opacity: fading ? 0 : 1, transition: 'opacity 0.30s ease',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div>
              <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', fontFamily:'Georgia, serif', letterSpacing:'-0.02em', textShadow:'0 2px 8px rgba(0,0,0,0.50)' }}>
                {host.name}
              </div>
              <div style={{ fontSize:'11.5px', color:'rgba(255,255,255,0.82)', fontWeight:600, marginTop:'2px' }}>
                {host.flag} {host.city} · {host.languages.join(' · ')}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'13px', fontWeight:800, color:'#F5A623' }}>★ {host.rating}</div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.60)', fontWeight:500 }}>{host.reviews} reviews</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'5px', marginTop:'9px', flexWrap:'wrap' }}>
            {(host.tags as string[]).map((t: string) => (
              <span key={t} style={{ fontSize:'10px', fontWeight:600, padding:'3px 9px', borderRadius:'999px', background:'rgba(255,255,255,0.16)', backdropFilter:'blur(4px)', color:'#fff', border:'1px solid rgba(255,255,255,0.22)' }}>{t}</span>
            ))}
            <span style={{ fontSize:'10px', fontWeight:700, padding:'3px 9px', borderRadius:'999px', background:TERRA, color:'#fff' }}>
              €{Math.round(host.rateCents / 100)}/hr
            </span>
          </div>
        </div>

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
  const displayHosts = (featuredHosts && featuredHosts.length > 0)
    ? featuredHosts.slice(0, 4).map(mapToCard)
    : HOSTS
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
    fontSize:'14px', fontWeight:800, color:'#0A2210', cursor:'pointer',
    fontFamily:'inherit', width:'100%', appearance:'none' as any,
    padding: 0, margin: 0, letterSpacing: '-0.01em',
  }

  const active = HOW_STEPS[howStep]

  return (
    <main className="min-h-screen pt-[66px]" style={{ background: 'var(--cream)' }}>

      {/* ════════════════════════════════════════
          HERO — two-column split
      ════════════════════════════════════════ */}
      <section style={{ background: `linear-gradient(155deg, #1C7A42 0%, #155C30 25%, #0D3820 55%, #0A2E1A 80%, #122E1C 100%)`, position:'relative', overflow:'hidden' }}>
        {/* mesh gradient layer — deep teal-green shimmer */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(52,211,153,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(15,61,34,0.80) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 60% 40%, rgba(16,92,48,0.30) 0%, transparent 60%)' }} />
        {/* glass gloss — top diagonal highlight */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, transparent 60%)' }} />
        {/* orange warmth — bottom right */}
        <div className="absolute pointer-events-none" style={{ bottom:'-80px', right:'-60px', width:'550px', height:'550px', borderRadius:'50%', background:'radial-gradient(circle, rgba(232,98,26,0.16) 0%, rgba(245,166,35,0.05) 50%, transparent 70%)' }} />
        {/* emerald bloom — top left */}
        <div className="absolute pointer-events-none" style={{ top:'-120px', left:'-60px', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 65%)' }} />
        {/* horizontal light band across mid */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 40%, transparent 60%)' }} />
        {/* fine grain texture */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")", opacity:1 }} />

        <div className="relative max-w-7xl mx-auto px-5 md:px-11 py-8 md:py-10 grid md:grid-cols-2 gap-12 items-center">

          {/* LEFT */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-7 text-[12px] font-bold fade-up"
              style={{ background:'linear-gradient(135deg, rgba(52,211,153,0.18) 0%, rgba(255,255,255,0.08) 100%)', border:'1px solid rgba(52,211,153,0.35)', color:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', boxShadow:'0 2px 12px rgba(52,211,153,0.15), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background:'#4ADE80', boxShadow:'0 0 8px rgba(74,222,128,0.80)' }} />
              Now live across Europe · 8 cities
            </div>

            {/* Headline */}
            <h1 className="font-serif font-bold text-white mb-5 fade-up fade-up-delay-1"
              style={{ fontSize:'clamp(42px,5vw,72px)', letterSpacing:'-0.045em', lineHeight:1.02 }}>
              Travel like<br />
              a <em className="italic text-gradient-sunrise" style={{ fontVariationSettings:'"SOFT" 100', filter:'drop-shadow(0 0 32px rgba(245,166,35,0.55))' }}>local,</em><br />
              <span style={{ color:'rgba(255,255,255,0.45)', fontWeight:300, letterSpacing:'-0.02em' }}>not a tourist.</span>
            </h1>

            {/* Divider accent line */}
            <div className="mb-5 fade-up fade-up-delay-1" style={{ width:'48px', height:'3px', borderRadius:'99px', background:'linear-gradient(90deg, #4ADE80, rgba(74,222,128,0.0))' }} />

            {/* Tagline frame */}
            <div className="inline-flex items-center gap-2.5 mb-5 fade-up fade-up-delay-2 px-4 py-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(232,98,26,0.18) 0%, rgba(245,166,35,0.12) 100%)',
                border: '1.5px solid rgba(245,166,35,0.50)',
                boxShadow: '0 0 20px rgba(245,166,35,0.20), inset 0 1px 0 rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A623', boxShadow: '0 0 8px rgba(245,166,35,0.90)', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em', color: '#FFD580', textShadow: '0 0 16px rgba(245,166,35,0.70)' }}>
                No map. Just locals.
              </span>
            </div>

            <p className="mb-7 fade-up fade-up-delay-2 max-w-md" style={{ color:'rgba(255,255,255,0.85)', fontSize:'15.5px', lineHeight:1.75, fontWeight:500 }}>
              Connect with verified locals who show you the real city — hidden cafés, neighbourhood stories, and experiences no guidebook covers.
            </p>

            {/* ── Search widget ── */}
            <div className="rounded-2xl mb-6 fade-up fade-up-delay-3 overflow-hidden"
              style={{ background:'linear-gradient(145deg,rgba(255,252,247,0.98) 0%,rgba(240,250,244,0.98) 100%)', boxShadow:'0 20px 60px rgba(0,0,0,0.30)', border:'1px solid rgba(255,255,255,0.60)' }}>

              {/* Tab bar — underline style */}
              <div className="flex" style={{ borderBottom:'2px solid rgba(15,61,34,0.08)' }}>
                <button onClick={() => setTab('find')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 text-[14px] font-bold transition-all"
                  style={{
                    color: tab==='find' ? TERRA : '#8FAF9A',
                    borderBottom: tab==='find' ? `2.5px solid ${TERRA}` : '2.5px solid transparent',
                    marginBottom: '-2px',
                    background: 'transparent',
                  }}>
                  🔍 Find a host
                </button>
                <div style={{ width:'1px', background:'rgba(15,61,34,0.08)', margin:'10px 0' }} />
                <button onClick={() => setTab('trip')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 text-[14px] font-bold transition-all"
                  style={{
                    color: tab==='trip' ? TERRA : '#8FAF9A',
                    borderBottom: tab==='trip' ? `2.5px solid ${TERRA}` : '2.5px solid transparent',
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
                    <div className="rounded-lg px-3.5 py-2.5 transition-all"
                      style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>City</div>
                      <CityAutocomplete cities={heroCities} value={findCity} onChange={setFindCity} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 transition-all"
                      style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>When</div>
                      <input type="date" value={findWhen} min={today} onChange={e=>setFindWhen(e.target.value)}
                        style={{...sel, colorScheme:'light', color:findWhen?'#0F2E1C':'#2D5C42'}} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 transition-all"
                      style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Interest</div>
                      <select value={findInt} onChange={e=>setFindInt(e.target.value)} style={{...sel, color: findInt ? '#0F2E1C' : '#2D5C42'}}>
                        <option value="">Food, Art, Nightlife…</option>
                        {INTERESTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 transition-all"
                      style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Language</div>
                      <select value={findLang} onChange={e=>setFindLang(e.target.value)} style={{...sel, color: findLang ? '#0F2E1C' : '#2D5C42'}}>
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
                    <div className="rounded-lg px-3.5 py-2.5 transition-all"
                      style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Destination</div>
                      <CityAutocomplete cities={heroCities} value={tripCity} onChange={setTripCity} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 transition-all"
                      style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Arrival</div>
                      <input type="date" value={tripArr} min={today} onChange={e=>setTripArr(e.target.value)}
                        style={{...sel, colorScheme:'light', color:tripArr?'#0F2E1C':'#2D5C42'}} />
                    </div>
                    <div className="rounded-lg px-3.5 py-2.5 transition-all"
                      style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                      <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'0.12em', color:TERRA, textTransform:'uppercase', marginBottom:'5px' }}>Departure</div>
                      <input type="date" value={tripDep} min={tripArr||today} onChange={e=>setTripDep(e.target.value)}
                        style={{...sel, colorScheme:'light', color:tripDep?'#0F2E1C':'#2D5C42'}} />
                    </div>
                  </div>
                  <div className="rounded-lg px-3.5 py-2.5"
                    style={{ border:'2px solid rgba(15,61,34,0.55)', background:'#fff', boxShadow:'0 1px 4px rgba(15,61,34,0.10)' }}>
                    <div style={{ fontSize:'9px', fontWeight:900, letterSpacing:'0.13em', color:TERRA, textTransform:'uppercase', marginBottom:'8px' }}>Host type</div>
                    <div className="flex flex-wrap gap-1.5">
                      {HOST_TYPES.map(h => (
                        <button key={h.value} onClick={() => setHostType(h.value)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                          style={{ background:hostType===h.value ? GREEN : '#fff', color:hostType===h.value ? '#fff' : '#0A2E18', border:`1px solid ${hostType===h.value ? GREEN : 'rgba(15,61,34,0.15)'}` }}>
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
            <div className="relative w-full" style={{ height:'260px', marginTop:'100px' }}>
              <HeroCarousel hosts={carouselHosts} />
            </div>

            {/* ── 4 cards ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:'20px', marginTop:'40px' }}>

            {/* ── Row 1: Review + Live Now ── */}
            <div style={{ display:'flex', gap:'20px', alignItems:'stretch' }}>

              {/* Review card */}
              {(() => {
                const rev = featuredReviews[reviewIdx]
                const name  = rev?.reviewerName  ?? 'James M.'
                const city  = rev?.reviewerCity  ?? 'Amsterdam'
                const inits = rev?.reviewerInitials ?? 'JM'
                const grad  = rev?.reviewerGradient ?? 'linear-gradient(135deg,#4A7A9E,#2A5A7E)'
                const body  = rev?.body ?? 'This changed how I travel. No tour guide comes close.'
                return (
                  <div className="fc-review" style={{ flex:1, borderRadius:'16px', padding:'12px 14px', background:'#fff', boxShadow:'0 12px 36px rgba(0,0,0,0.18)', transition:'opacity 0.4s ease', opacity: reviewVisible ? 1 : 0, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', gap:'2px', marginBottom:'6px' }}>
                      {[1,2,3,4,5].map(i => <span key={i} style={{ color:'#F5A623', fontSize:'12px' }}>★</span>)}
                    </div>
                    <p style={{ fontSize:'11px', fontWeight:600, color:GREEN, lineHeight:1.5, marginBottom:'8px' }}>
                      &ldquo;{body}&rdquo;
                    </p>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                      <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color:'#fff', flexShrink:0 }}>{inits}</div>
                      <div>
                        <div style={{ fontSize:'10px', fontWeight:700, color:GREEN }}>{name}</div>
                        <div style={{ fontSize:'9px', color:'#9CAD9E', fontWeight:500 }}>{city} · verified traveler</div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Live Now card */}
              <div className="fc-live" style={{ flex:1, borderRadius:'16px', padding:'12px 14px', background:'linear-gradient(135deg,#3D1F35,#5C2D4D)', boxShadow:'0 12px 36px rgba(61,31,53,0.55)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                  <span className="glow-dot" style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#F9A8D4', display:'inline-block', flexShrink:0 }} />
                  <span style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.50)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Live now</span>
                </div>
                <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', fontFamily:'var(--font-fraunces), Georgia, serif', letterSpacing:'-0.03em', marginBottom:'2px' }}>⚡ 4 min</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', fontWeight:500, marginBottom:'8px' }}>avg. host reply time</div>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                  {[['🇩🇪','Berlin'],['🇵🇹','Lisbon'],['🇳🇱','AMS']].map(([flag, city]) => (
                    <span key={city} style={{ fontSize:'9px', fontWeight:600, padding:'2px 7px', borderRadius:'999px', background:'rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.75)' }}>{flag} {city}</span>
                  ))}
                </div>
              </div>

            </div>

            {/* ── Row 2: Host count + Pricing ── */}
            <div style={{ display:'flex', gap:'20px' }}>

              {/* Host count */}
              <div style={{ flex:1, borderRadius:'14px', padding:'12px 14px', background:'linear-gradient(135deg,#1A2540,#243560)', backdropFilter:'blur(12px)', border:'1px solid rgba(55,80,140,0.40)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:'9px', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>Verified hosts</div>
                <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', fontFamily:'var(--font-fraunces), Georgia, serif', letterSpacing:'-0.03em', lineHeight:1 }}>{stats.hostCount}+</div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.55)', fontWeight:500, marginTop:'2px' }}>across {stats.cityCount} cities</div>
                <div style={{ display:'flex', gap:'3px', marginTop:'6px' }}>
                  {stats.topCityFlags.map(flag => (
                    <span key={flag} style={{ fontSize:'13px' }}>{flag}</span>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div style={{ flex:1, borderRadius:'14px', padding:'12px 14px', background:'linear-gradient(135deg,rgba(232,98,26,0.22),rgba(232,98,26,0.10))', border:'1px solid rgba(232,98,26,0.25)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div style={{ fontSize:'9px', fontWeight:700, color:TERRA, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>Unlock hosts from</div>
                <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', fontFamily:'var(--font-fraunces), Georgia, serif', letterSpacing:'-0.03em', lineHeight:1 }}>€6 <span style={{ fontSize:'11px', fontWeight:500, color:'rgba(255,255,255,0.55)' }}>/day</span></div>
                <div style={{ display:'flex', gap:'4px', marginTop:'6px', flexWrap:'wrap' }}>
                  {['€6 day','€12 week','€18 mo'].map(t => (
                    <span key={t} style={{ fontSize:'9px', fontWeight:600, padding:'2px 6px', borderRadius:'999px', background:'rgba(232,98,26,0.20)', color:TERRA }}>{t}</span>
                  ))}
                </div>
              </div>

            </div>

            </div>{/* end 4-cards wrapper */}

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          POST A TRIP — how it works
      ════════════════════════════════════════ */}
      <div style={{ background:'linear-gradient(160deg, #EBF3EE 0%, #E4EFF2 100%)', borderTop:'1px solid rgba(15,61,34,0.08)', borderBottom:'1px solid rgba(15,61,34,0.08)' }}>
        <div className="max-w-7xl mx-auto px-5 md:px-11 py-16">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div>
              <div className="overline text-terra mb-2">New feature</div>
              <h2 className="font-serif text-4xl md:text-5xl font-bold" style={{ color:GREEN, letterSpacing:'-0.03em', lineHeight:1.08 }}>
                Post your trip.<br />
                Let hosts <em className="italic text-gradient-terra">find you.</em>
              </h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed" style={{ color:'#2E5C3E' }}>
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
                bg:'linear-gradient(135deg,#0F3D22 0%,#1E6B3A 100%)',
                shadow:'0 12px 32px rgba(15,61,34,0.35)',
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
      <div style={{ background:'linear-gradient(160deg, #FDF6EE 0%, #FAF0E8 100%)', borderTop:'1px solid rgba(15,61,34,0.07)', borderBottom:'1px solid rgba(15,61,34,0.07)' }}>
      <div className="max-w-7xl mx-auto px-5 md:px-11 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="overline text-terra mb-1">Explore by interest</div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold" style={{ color:GREEN, letterSpacing:'-0.03em' }}>What's your <em className="italic text-gradient-terra">vibe?</em></h2>
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
              <div className="text-[11px] font-semibold" style={{ color:'rgba(255,255,255,0.65)' }}>{c.count} hosts</div>
            </Link>
          ))}
        </div>
      </div>
      </div>{/* end categories bg wrapper */}

      {/* ════════════════════════════════════════
          FEATURED HOSTS
      ════════════════════════════════════════ */}
      <div style={{ background:'linear-gradient(160deg, #F0F4F8 0%, #EAF0F5 100%)', borderTop:'1px solid rgba(15,61,34,0.07)', borderBottom:'1px solid rgba(15,61,34,0.07)' }}>
      <div className="max-w-7xl mx-auto px-5 md:px-11 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="overline text-terra mb-1">Top rated</div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold" style={{ color:GREEN, letterSpacing:'-0.03em' }}>Featured <em className="italic text-gradient-terra">hosts</em></h2>
          </div>
          <Link href="/search" className="text-[13px] font-bold flex items-center gap-1 hover:gap-2 transition-all" style={{ color:TERRA }}>Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayHosts.map(h => (
            <Link key={h.name} href={`/search?cityId=${h.id}`} className="card card-hover overflow-hidden group">
              {/* Cover */}
              <div style={{ height:'120px', background:h.bg, position:'relative' }}>
                <div className="absolute inset-0" style={{ background:'rgba(0,0,0,0.15)' }} />
                <div className="absolute bottom-0 left-0 m-3 px-2 py-1 rounded-full text-[10px] font-bold text-white" style={{ background:'rgba(0,0,0,0.45)' }}>{h.flag} {h.city}</div>
                <div className="absolute" style={{ bottom:'-20px', right:'16px', width:'44px', height:'44px', borderRadius:'12px', background:h.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:'#fff', border:'2px solid #fff', fontFamily:'var(--font-fraunces), Georgia, serif', boxShadow:'0 4px 12px rgba(0,0,0,0.20)' }}>{h.initials}</div>
              </div>
              <div style={{ padding:'28px 14px 16px' }}>
                <div className="font-serif text-[15px] font-bold mb-0.5" style={{ color:GREEN }}>{h.name}</div>
                <div className="text-[11px] font-semibold mb-2" style={{ color:'#4A7A5C' }}>{h.langs}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {h.tags.map((t: string) => <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background:'rgba(15,61,34,0.07)', color:GREEN }}>{t}</span>)}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-[12px] font-bold" style={{ color:TERRA }}>{h.rate} <span style={{ color:'#9CAD9E', fontWeight:500 }}>· free to browse</span></div>
                  <div className="text-[11px] font-bold" style={{ color:'#F5A623' }}>★ {h.rating} · {h.reviews}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      </div>{/* end featured hosts bg wrapper */}

      {/* ════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════ */}
      <div id="how" style={{ background:`linear-gradient(155deg, #0A2E1A 0%, #0D3820 30%, #155C30 65%, #1C7A42 100%)`, position:'relative', overflow:'hidden' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 70% 60% at 90% 10%, rgba(52,211,153,0.14) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(232,98,26,0.10) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(120deg, rgba(255,255,255,0.07) 0%, transparent 40%)' }} />
        <div className="absolute pointer-events-none" style={{ top:'-100px', right:'-100px', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 65%)' }} />
        <div className="relative max-w-7xl mx-auto px-5 md:px-11 py-16">
          <div className="overline mb-2" style={{ color:'rgba(255,255,255,0.45)' }}>Simple process</div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-10" style={{ letterSpacing:'-0.03em' }}>
            How Offmap <em className="italic text-gradient-sunrise" style={{ fontVariationSettings:'"SOFT" 100' }}>works</em>
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
      <div id="cities" className="max-w-7xl mx-auto px-5 md:px-11 py-14" style={{ borderBottom:'1px solid rgba(15,61,34,0.08)' }}>
        <div className="mb-6">
          <div className="overline text-terra mb-1">Available now</div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold" style={{ color:GREEN, letterSpacing:'-0.03em' }}>Live <em className="italic text-gradient-terra">cities</em></h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {CITIES.map(c => (
            <Link key={c.id} href={`/search?cityId=${c.id}`}
              className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-2xl card card-hover"
              style={{ minWidth:'130px' }}>
              <span className="text-2xl">{c.flag}</span>
              <div>
                <div className="text-[13px] font-bold" style={{ color:GREEN }}>{c.name}</div>
                <div className="text-[11px] font-semibold" style={{ color:'#4A7A5C' }}>{c.hosts} hosts</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          PRICING CTA
      ════════════════════════════════════════ */}
      <div style={{ background:`linear-gradient(150deg, #122E1C 0%, #0D3820 30%, #155C30 60%, #1A6B38 85%, #0F3D22 100%)`, position:'relative', overflow:'hidden' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse 80% 50% at 15% 20%, rgba(52,211,153,0.13) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 80%, rgba(232,98,26,0.14) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(125deg, rgba(255,255,255,0.08) 0%, transparent 35%, rgba(255,255,255,0.03) 100%)' }} />
        {/* subtle horizontal band */}
        <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.10) 100%)' }} />
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
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background:TERRA, color:'#fff' }}>✓</div>
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
                  <div className="font-serif text-xl font-bold flex-shrink-0 ml-4" style={{ color:'#F5A623' }}>{p.price}<sub className="text-[12px] font-semibold">{p.per}</sub></div>
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
          REVIEWS
      ════════════════════════════════════════ */}
      <div style={{ background:'#1a1a1a' }}>
        <div className="max-w-7xl mx-auto px-5 md:px-11 py-16">
          <div className="mb-10">
            <div className="overline mb-1" style={{ color:'rgba(255,255,255,0.35)' }}>Social proof</div>
            <h2 className="font-serif text-4xl font-bold text-white" style={{ letterSpacing:'-0.03em' }}>
              What <em className="italic" style={{ color:TERRA }}>travelers</em> say
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map(r => (
              <div key={r.name} className="rounded-2xl p-6 flex flex-col gap-5" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
                <div style={{ color:'#F5A623', fontSize:'15px' }}>★★★★★</div>
                <p className="font-serif text-[15px] leading-relaxed flex-1 italic" style={{ color:'rgba(255,255,255,0.80)' }}>"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-serif font-bold text-white text-sm flex-shrink-0" style={{ background:r.grad }}>{r.initials}</div>
                  <div>
                    <div className="text-[13px] font-bold text-white">{r.name}</div>
                    <div className="text-[11px]" style={{ color:'rgba(255,255,255,0.40)' }}>{r.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          BECOME A HOST
      ════════════════════════════════════════ */}
      <div style={{ background:'#FAF7F2', borderTop:'1px solid rgba(15,61,34,0.08)' }}>
        <div className="max-w-7xl mx-auto px-5 md:px-11 py-16 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="overline text-terra mb-2">For locals</div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-5" style={{ color:GREEN, letterSpacing:'-0.03em', lineHeight:1.05 }}>
              Share your city.<br />Earn on your<br />
              <em className="italic text-gradient-terra">own terms.</em>
            </h2>
            <p className="text-[15px] leading-relaxed mb-7" style={{ color:'#4A7A5C' }}>
              List your profile for free. Set your own rate, your own schedule, your own experience. Travelers pay you directly — we never take a commission from your earnings.
            </p>
            <Link href="/become-a-host"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-bold text-white hover:-translate-y-0.5 transition-all"
              style={{ background:`linear-gradient(135deg,${GREEN},#1a4a2e)`, boxShadow:'0 6px 24px rgba(15,61,34,0.35)' }}>
              + Become a host — it's free
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {PERKS.map(p => (
              <div key={p.title} className="card p-5 card-hover">
                <div className="text-2xl mb-3">{p.icon}</div>
                <div className="font-serif text-[14px] font-bold mb-2" style={{ color:GREEN }}>{p.title}</div>
                <div className="text-[13px] leading-relaxed" style={{ color:'#4A7A5C' }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  )
}
