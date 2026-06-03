import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { ProfileForm } from '@/components/settings/ProfileForm'
import type { SessionUser } from '@/types'

interface ProfileUserData {
  id: string
  email: string
  role: 'traveler' | 'host' | 'admin'
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

export default async function ProfileSettingsPage() {
  const isMock = process.env.MOCK_MODE === 'true'

  let userData: ProfileUserData | null = null
  let sessionUser: SessionUser | null = null

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect('/auth/login?redirect=/settings/profile')

    userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio ?? null,
      homeCity: user.homeCity ?? null,
      homeCountry: user.homeCountry ?? null,
      languages: user.languages ?? [],
      interests: user.interests ?? [],
      travelStyle: user.travelStyle ?? null,
      profileCompleteness: user.profileCompleteness ?? 0,
    }
    sessionUser = { id: user.id, email: user.email, role: user.role, fullName: user.fullName, avatarUrl: user.avatarUrl }
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/auth/login?redirect=/settings/profile')

    try {
      const { db } = await import('@/lib/db')
      const { users } = await import('@/lib/db/schema')
      const { eq } = await import('drizzle-orm')
      const [dbUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
      if (!dbUser) redirect('/auth/login?redirect=/settings/profile')

      userData = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        fullName: dbUser.fullName ?? null,
        avatarUrl: dbUser.avatarUrl ?? null,
        bio: dbUser.bio ?? null,
        homeCity: dbUser.homeCity ?? null,
        homeCountry: dbUser.homeCountry ?? null,
        languages: dbUser.languages ?? [],
        interests: dbUser.interests ?? [],
        travelStyle: dbUser.travelStyle ?? null,
        profileCompleteness: dbUser.profileCompleteness ?? 0,
      }
      sessionUser = { id: dbUser.id, email: dbUser.email, role: dbUser.role, fullName: dbUser.fullName ?? null, avatarUrl: dbUser.avatarUrl ?? null }
    } catch {
      redirect('/auth/login?redirect=/settings/profile')
    }
  }

  if (!userData || !sessionUser) redirect('/auth/login?redirect=/settings/profile')

  const SIDEBAR_TABS = [
    { label: 'Profile', href: '/settings/profile', active: true, disabled: false },
    { label: 'Account', href: '/settings/account', active: false, disabled: true },
    { label: 'Subscription', href: '/pricing', active: false, disabled: false },
    { label: 'Privacy', href: '/settings/privacy', active: false, disabled: true },
  ]

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px]" style={{ backgroundColor: '#F5F2EC' }}>

        {/* Header band */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#0C3520 0%,#0F3D22 60%,#1a4a2e 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
          />
          <div
            className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
            style={{ background: 'radial-gradient(circle,rgba(232,98,26,0.18) 0%,transparent 70%)', transform: 'translate(20%,-30%)' }}
          />
          <div className="relative max-w-5xl mx-auto px-5 md:px-11 py-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3" style={{ color: 'rgba(245,166,35,0.85)' }}>
              Account settings
            </p>
            <h1 className="font-serif text-4xl font-bold text-white mb-1" style={{ letterSpacing: '-0.03em' }}>
              Your profile
            </h1>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{userData.email}</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-5 md:px-11 py-8">
          <div className="flex gap-8 items-start">

            {/* Sidebar */}
            <aside className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3 px-3" style={{ color: 'rgba(15,61,34,0.45)' }}>
                Settings
              </p>
              {SIDEBAR_TABS.map((tab) => (
                tab.disabled ? (
                  <span
                    key={tab.label}
                    className="flex items-center px-4 py-2.5 rounded-xl text-[14px] font-medium cursor-not-allowed"
                    style={{ color: 'rgba(15,61,34,0.30)' }}
                  >
                    {tab.label}
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(15,61,34,0.08)', color: 'rgba(15,61,34,0.35)' }}>
                      soon
                    </span>
                  </span>
                ) : (
                  <Link
                    key={tab.label}
                    href={tab.href}
                    className="flex items-center px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all"
                    style={
                      tab.active
                        ? {
                            background: '#0F3D22',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(15,61,34,0.25)',
                          }
                        : {
                            color: 'rgba(15,61,34,0.70)',
                          }
                    }
                  >
                    {tab.label}
                  </Link>
                )
              ))}
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <ProfileForm user={userData} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
