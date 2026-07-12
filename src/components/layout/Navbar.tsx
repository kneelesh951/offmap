'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Menu, X } from 'lucide-react'
import type { SessionUser } from '@/types'

const GREEN = '#084E4E'

interface NavbarProps { user?: SessionUser | null }

function getFirstName(user: SessionUser): string {
  if (user.fullName) return user.fullName.split(' ')[0]
  return user.email.split('@')[0]
}

function getInitials(user: SessionUser): string {
  if (user.fullName) {
    const parts = user.fullName.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }
  return user.email[0].toUpperCase()
}

export function Navbar({ user }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
      // Create the Supabase client only when actually signing out in production.
      // Doing this at render time crashes the static build when env vars are absent.
      await createSupabaseBrowserClient().auth.signOut()
    }
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(8,78,78,0.55)' }}
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute top-0 left-0 right-0 p-4 pt-20 flex flex-col gap-1"
            style={{
              background: 'linear-gradient(160deg, #0C7B7B 0%, #063B3B 50%, #042D2D 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-colors hover:bg-white/10"
                style={{
                  color: l.href === '/trips/post' ? '#F5A623' : '#fff',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  {/* Mobile greeting */}
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-1"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <span className="flex items-center justify-center rounded-full text-[12px] font-extrabold flex-shrink-0"
                      style={{ width:'32px', height:'32px', background:'linear-gradient(135deg,#E8621A,#F5A623)', color:'#fff' }}>
                      {getInitials(user)}
                    </span>
                    <div>
                      <div className="text-[13px] font-bold text-white">Hi, {getFirstName(user)}</div>
                      <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{user.email}</div>
                    </div>
                  </div>
                  <Link
                    href={user.role === 'host' ? '/host-dashboard' : '/dashboard'}
                    onClick={() => setMenuOpen(false)}
                    className="block text-center px-4 py-3 rounded-full text-[14px] font-semibold transition-all hover:bg-white/10"
                    style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }}
                  >
                    My Dashboard
                  </Link>
                  <Link
                    href={user.role === 'host' ? '/host-dashboard/profile/create' : '/settings/profile'}
                    onClick={() => setMenuOpen(false)}
                    className="block text-center px-4 py-3 rounded-full text-[14px] font-semibold transition-all hover:bg-white/10"
                    style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }}
                  >
                    Edit Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-3 rounded-full text-white text-[14px] font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.40)' }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center px-4 py-3 rounded-full text-[14px] font-semibold transition-all hover:bg-white/10"
                    style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMenuOpen(false)}
                    className="block text-center px-4 py-3 rounded-full text-white text-[14px] font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.40)' }}
                  >
                    Get started free
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Main header */}
      <header
        className="fixed top-0 left-0 right-0 z-30 h-[66px] flex items-center justify-between px-5 md:px-10 transition-all duration-500"
        style={{
          background: 'linear-gradient(180deg, #0C7B7B 0%, #063B3B 50%, #042D2D 100%)',
          borderBottom: '1px solid rgba(12,123,123,0.25)',
          boxShadow: scrolled
            ? '0 8px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 30px 60px rgba(12,123,123,0.06)'
            : '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 30px 60px rgba(12,123,123,0.04)',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 select-none group flex-shrink-0">
          <span
            className="font-serif font-extrabold text-white transition-opacity group-hover:opacity-90"
            style={{ fontSize: '24px', letterSpacing: '-0.04em' }}
          >
            Off
          </span>
          <span
            className="font-serif font-extrabold transition-opacity group-hover:opacity-90"
            style={{
              fontSize: '24px',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg,#E8621A,#F5A623)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            map
          </span>
        </Link>

        {/* Desktop nav — pill container */}
        <nav
          className="hidden md:flex items-center p-1.5 gap-1"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            borderRadius: '9999px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {navLinks.map((l) => {
            const active = isActive(l.href)
            const isPostTrip = l.href === '/trips/post'
            return (
              <Link
                key={l.href}
                href={l.href}
                className="px-5 py-2 rounded-full text-[13.5px] font-extrabold transition-all whitespace-nowrap"
                style={{
                  color: isPostTrip ? '#F5A623' : active ? '#fff' : 'rgba(255,255,255,0.85)',
                  background: active
                    ? 'rgba(255,255,255,0.18)'
                    : 'transparent',
                  boxShadow: active
                    ? '0 2px 8px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.15)'
                    : 'none',
                  letterSpacing: '0.01em',
                  textShadow: '0 1px 4px rgba(0,0,0,0.30)',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.color = '#fff'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = isPostTrip ? '#F5A623' : 'rgba(255,255,255,0.85)'
                  }
                }}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {user ? (
            <>
              {/* Avatar pill → dropdown */}
              <div ref={dropdownRef} className="relative hidden md:block">
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.22)' }}
                >
                  <span
                    className="flex items-center justify-center rounded-full text-[11px] font-extrabold flex-shrink-0"
                    style={{ width:'26px', height:'26px', background:'linear-gradient(135deg,#E8621A,#F5A623)', color:'#fff' }}
                  >
                    {getInitials(user)}
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.90)' }}>
                    Hi, {getFirstName(user)}
                  </span>
                  {/* Chevron */}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(160deg,#0C7B7B,#063B3B)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
                      zIndex: 50,
                    }}
                  >
                    {/* User info header */}
                    <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-[13px] font-bold text-white truncate">{user.fullName ?? getFirstName(user)}</div>
                      <div className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{user.email}</div>
                    </div>
                    {/* Links */}
                    <div className="p-1.5 flex flex-col gap-0.5">
                      <Link
                        href={user.role === 'host' ? '/host-dashboard' : '/dashboard'}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        <span style={{ fontSize: '15px' }}>🏠</span> Dashboard
                      </Link>
                      <Link
                        href={user.role === 'host' ? '/host-dashboard/profile/create' : '/settings/profile'}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        <span style={{ fontSize: '15px' }}>✏️</span> Edit profile
                      </Link>
                      <Link
                        href="/conversations"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        <span style={{ fontSize: '15px' }}>💬</span> Conversations
                      </Link>
                    </div>
                    {/* Sign out */}
                    <div className="p-1.5 pt-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <button
                        onClick={() => { setDropdownOpen(false); handleLogout() }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors hover:bg-white/10 text-left"
                        style={{ color: 'rgba(255,100,100,0.80)' }}
                      >
                        <span style={{ fontSize: '15px' }}>↩</span> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden md:block text-[13px] font-semibold px-4 py-2 rounded-full transition-all hover:bg-white/12"
                style={{ color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="hidden md:block text-[13px] font-bold px-5 py-2 rounded-full text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 3px 14px rgba(232,98,26,0.45)' }}
              >
                Get started
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-xl transition-colors hover:bg-white/12"
            style={{ color: '#fff' }}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
    </>
  )
}

const navLinks = [
  { href: '/search',        label: 'Explore' },
  { href: '/become-a-host', label: 'Become a Host' },
  { href: '/trips/post',    label: '✈️ Post a Trip' },
  { href: '/#how',          label: 'How It Works' },
  { href: '/#cities',       label: 'Cities' },
  { href: '/pricing',       label: 'Pricing' },
  { href: '/about',         label: 'About Us' },
]
