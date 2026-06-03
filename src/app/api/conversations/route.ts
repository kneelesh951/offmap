import { NextRequest, NextResponse } from 'next/server'
import { createConversationSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = createConversationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    // Subscription gate
    const activeSub = mockDb.getActiveSubscription(user.id)
    if (!activeSub) return NextResponse.json({ success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Subscribe from €6/day to connect with hosts.' } }, { status: 403 })

    // Check host exists
    const hostProfile = mockDb.getHostProfileByUserId(parsed.data.hostId)
    if (!hostProfile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } }, { status: 404 })

    // Check for existing conversation
    const existing = Array.from(mockDb.conversations.values()).find(c => c.travelerId === user.id && c.hostId === parsed.data.hostId)
    if (existing) return NextResponse.json({ success: true, data: { conversationId: existing.id } })

    // Create conversation
    const { nanoid } = await import('nanoid')
    const conv = {
      id: `conv-${nanoid(8)}`,
      travelerId: user.id,
      hostId: parsed.data.hostId,
      subscriptionId: activeSub.id,
      unlockedAt: new Date().toISOString(),
      lastMessageAt: null as string | null,
    }
    mockDb.conversations.set(conv.id, conv)

    // Auto-send first message if tripRequestId provided
    const tripRequestId = (body as any).tripRequestId
    if (tripRequestId) {
      const tripResponse = Array.from(mockDb.tripHostResponses.values()).find(r => r.tripId === tripRequestId && r.hostId === parsed.data.hostId)
      if (tripResponse?.message) {
        const msgId = `msg-${nanoid(8)}`
        mockDb.messages.set(msgId, {
          id: msgId,
          conversationId: conv.id,
          senderId: parsed.data.hostId,
          content: tripResponse.message,
          isRead: false,
          createdAt: new Date().toISOString(),
        })
        conv.lastMessageAt = new Date().toISOString()
        mockDb.conversations.set(conv.id, conv)
      }
    }

    return NextResponse.json({ success: true, data: { conversationId: conv.id } }, { status: 201 })
  }

  // Real mode
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { conversations, subscriptions, users, hostProfiles, messages } = await import('@/lib/db/schema')
  const { sendHostMessageNotification } = await import('@/lib/email')
  const { and, eq, gte } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const now = new Date()
  const [activeSub] = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active'), gte(subscriptions.currentPeriodEnd, now))).limit(1)
  if (!activeSub) return NextResponse.json({ success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Subscribe from €6/day to connect with hosts.' } }, { status: 403 })

  const [host] = await db.select({ id: hostProfiles.id, userId: hostProfiles.userId }).from(hostProfiles).where(and(eq(hostProfiles.userId, parsed.data.hostId), eq(hostProfiles.isActive, true))).limit(1)
  if (!host) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } }, { status: 404 })

  const [existing] = await db.select().from(conversations).where(and(eq(conversations.travelerId, user.id), eq(conversations.hostId, host.userId))).limit(1)
  if (existing) return NextResponse.json({ success: true, data: { conversationId: existing.id } })

  const [newConv] = await db.insert(conversations).values({ travelerId: user.id, hostId: host.userId, subscriptionId: activeSub.id }).returning()

  // Auto-send host's trip response as first message if tripRequestId provided
  const tripRequestId = (body as any).tripRequestId
  if (tripRequestId) {
    const { tripHostResponses } = await import('@/lib/db/schema')
    const [tripResp] = await db.select().from(tripHostResponses).where(and(eq(tripHostResponses.tripId, tripRequestId), eq(tripHostResponses.hostId, host.userId))).limit(1)
    if (tripResp?.message) {
      await db.insert(messages).values({ conversationId: newConv.id, senderId: host.userId, content: tripResp.message })
      await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, newConv.id))
    }
  }

  const [traveler] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  const [hostUser] = await db.select().from(users).where(eq(users.id, host.userId)).limit(1)
  if (hostUser?.email && traveler) {
    sendHostMessageNotification({ hostEmail: hostUser.email, hostName: hostUser.fullName ?? 'there', travelerName: traveler.fullName ?? 'A traveler', messagePreview: 'A traveler has connected with you and wants to explore your city together.', conversationId: newConv.id }).catch(console.error)
  }
  return NextResponse.json({ success: true, data: { conversationId: newConv.id } }, { status: 201 })
}
