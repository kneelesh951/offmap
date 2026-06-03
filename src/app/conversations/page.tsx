import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

const GREEN = '#0F3D22'

export default async function ConversationsPage() {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser: any = null
  let convs: { id: string; otherName: string; lastMessageAt: string | null; unlockedAt: string; initials: string }[] = []

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect('/auth/login?redirect=/conversations')

    sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }

    convs = Array.from(mockDb.conversations.values())
      .filter(c => c.travelerId === user.id || c.hostId === user.id)
      .map(c => {
        const otherId = c.travelerId === user.id ? c.hostId : c.travelerId
        const other = mockDb.getUserById(otherId)
        const name = other?.fullName ?? 'Host'
        return { id: c.id, otherName: name, lastMessageAt: c.lastMessageAt, unlockedAt: c.unlockedAt, initials: name[0] ?? '?' }
      })
      .sort((a, b) => {
        const aTime = a.lastMessageAt ?? a.unlockedAt
        const bTime = b.lastMessageAt ?? b.unlockedAt
        return bTime > aTime ? 1 : -1
      })
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/auth/login?redirect=/conversations')

    sessionUser = { id: authUser.id, email: authUser.email!, role: 'traveler' as any, fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }

    try {
      const { db } = await import('@/lib/db')
      const { conversations, users } = await import('@/lib/db/schema')
      const { eq, desc } = await import('drizzle-orm')

      const rows = await db.select({ id: conversations.id, hostId: conversations.hostId, lastMessageAt: conversations.lastMessageAt, unlockedAt: conversations.unlockedAt, hostName: users.fullName })
        .from(conversations).leftJoin(users, eq(conversations.hostId, users.id))
        .where(eq(conversations.travelerId, authUser.id)).orderBy(desc(conversations.lastMessageAt))

      convs = rows.map(r => ({ id: r.id, otherName: r.hostName ?? 'Host', lastMessageAt: r.lastMessageAt?.toISOString() ?? null, unlockedAt: r.unlockedAt.toISOString(), initials: (r.hostName ?? 'H')[0] }))
    } catch (err) {
      console.warn('[Conversations] DB unavailable:', (err as Error).message)
    }
  }

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen pt-[68px]" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="max-w-2xl mx-auto px-5 py-10">
          <h1 className="font-serif text-3xl font-bold mb-6" style={{ color: GREEN, letterSpacing: '-0.5px' }}>Conversations</h1>

          {convs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl" style={{ border: '1px solid rgba(15,61,34,0.10)' }}>
              <div className="text-5xl mb-4">💬</div>
              <h3 className="font-serif text-xl font-bold mb-2" style={{ color: GREEN }}>No conversations yet</h3>
              <p className="text-sm font-medium mb-6" style={{ color: '#2D6B3F' }}>Subscribe to connect with a local host</p>
              <Link href="/search" className="inline-block px-6 py-3 rounded-full text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)' }}>
                Find a local host →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {convs.map(c => (
                <Link key={c.id} href={`/conversations/${c.id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 hover:shadow-md transition-all hover:-translate-y-0.5 group"
                  style={{ border: '1px solid rgba(15,61,34,0.10)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-serif text-lg font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)' }}>
                    {c.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm group-hover:underline" style={{ color: GREEN }}>{c.otherName}</div>
                    <div className="text-xs font-medium mt-0.5" style={{ color: '#4A7A5C' }}>
                      {c.lastMessageAt
                        ? `Last message ${new Date(c.lastMessageAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                        : `Connected ${new Date(c.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    </div>
                  </div>
                  <span style={{ color: '#6EA880' }}>›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
