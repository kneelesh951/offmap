import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
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

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px]" style={{ backgroundColor: '#F5F2EC' }}>

        {/* Header band */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#0C3520 0%,#084E4E 60%,#0a5e5e 100%)' }}
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
            <SettingsSidebar active="profile" />
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
