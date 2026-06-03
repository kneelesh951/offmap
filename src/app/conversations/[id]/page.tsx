import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { ChatWindow } from './ChatWindow'

interface Props { params: { id: string } }

export default async function ConversationPage({ params }: Props) {
  const isMock = process.env.MOCK_MODE === 'true'
  let sessionUser: any = null
  let otherUserName = 'Host'
  let initialMessages: any[] = []
  let conversationId = params.id

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) redirect(`/auth/login?redirect=/conversations/${params.id}`)

    const convo = mockDb.conversations.get(params.id)
    if (!convo) notFound()

    const isParticipant = convo.travelerId === user.id || convo.hostId === user.id
    if (!isParticipant) notFound()

    const otherId = convo.travelerId === user.id ? convo.hostId : convo.travelerId
    const other = mockDb.getUserById(otherId)
    otherUserName = other?.fullName ?? 'Host'

    initialMessages = Array.from(mockDb.messages.values())
      .filter(m => m.conversationId === params.id)
      .sort((a, b) => a.createdAt > b.createdAt ? 1 : -1)
      .map(m => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        createdAt: m.createdAt,
        senderName: mockDb.getUserById(m.senderId)?.fullName ?? 'User',
      }))

    sessionUser = { id: user.id, email: user.email, role: user.role as any, fullName: user.fullName, avatarUrl: null }
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')

    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect(`/auth/login?redirect=/conversations/${params.id}`)

    sessionUser = { id: authUser.id, email: authUser.email!, role: 'traveler' as any, fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }

    try {
      const { db } = await import('@/lib/db')
      const { conversations, messages, users } = await import('@/lib/db/schema')
      const { eq, and, or, asc } = await import('drizzle-orm')

      const [convo] = await db.select().from(conversations)
        .where(and(eq(conversations.id, params.id), or(eq(conversations.travelerId, authUser.id), eq(conversations.hostId, authUser.id))))
        .limit(1)
      if (!convo) notFound()

      const msgs = await db.select({ id: messages.id, content: messages.content, senderId: messages.senderId, createdAt: messages.createdAt, senderName: users.fullName })
        .from(messages).leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, params.id)).orderBy(asc(messages.createdAt))

      const otherId = convo.travelerId === authUser.id ? convo.hostId : convo.travelerId
      const [other] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, otherId)).limit(1)

      otherUserName = other?.fullName ?? 'Host'
      initialMessages = msgs.map(m => ({ ...m, createdAt: m.createdAt?.toISOString() ?? '' }))
    } catch (err) {
      console.warn('[ConversationPage] DB unavailable:', (err as Error).message)
    }
  }

  return (
    <>
      <Navbar user={sessionUser} />
      <ChatWindow
        conversationId={conversationId}
        currentUserId={sessionUser.id}
        otherUserName={otherUserName}
        initialMessages={initialMessages}
      />
    </>
  )
}
