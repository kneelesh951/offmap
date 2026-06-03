import { NextRequest, NextResponse } from 'next/server'
import { sendMessageSchema } from '@/lib/validators'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const convo = mockDb.conversations.get(params.id)
    if (!convo) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })
    if (convo.travelerId !== user.id && convo.hostId !== user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const before = searchParams.get('before') // ISO timestamp cursor

    let msgs = Array.from(mockDb.messages.values())
      .filter(m => m.conversationId === params.id)
      .filter(m => before ? m.createdAt < before : true)
      .sort((a, b) => a.createdAt > b.createdAt ? 1 : -1)

    const total = msgs.length
    msgs = msgs.slice(-limit) // take last N (oldest-first, paginate backwards)

    const mapped = msgs.map(m => ({ ...m, senderName: mockDb.getUserById(m.senderId)?.fullName ?? 'User' }))

    return NextResponse.json({ success: true, data: mapped, meta: { hasMore: total > limit, nextCursor: mapped[0]?.createdAt ?? null } })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { messages, conversations } = await import('@/lib/db/schema')
  const { eq, and, or, asc } = await import('drizzle-orm')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
  const [convo] = await db.select().from(conversations).where(and(eq(conversations.id, params.id), or(eq(conversations.travelerId, user.id), eq(conversations.hostId, user.id)))).limit(1)
  if (!convo) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const before = searchParams.get('before')

  const { lt, desc } = await import('drizzle-orm')
  const conditions = before
    ? and(eq(messages.conversationId, params.id), lt(messages.createdAt, new Date(before)))
    : eq(messages.conversationId, params.id)

  const msgs = await db.select().from(messages)
    .where(conditions)
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1)

  const hasMore = msgs.length > limit
  const page = msgs.slice(0, limit).reverse() // return oldest-first
  const nextCursor = hasMore ? page[0]?.createdAt?.toISOString() ?? null : null

  return NextResponse.json({ success: true, data: page, meta: { hasMore, nextCursor } })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid message' } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const { nanoid } = await import('nanoid')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const convo = mockDb.conversations.get(params.id)
    if (!convo) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })
    if (convo.travelerId !== user.id && convo.hostId !== user.id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 })
    }

    const msg = {
      id: `msg-${nanoid(8)}`,
      conversationId: params.id,
      senderId: user.id,
      content: parsed.data.content,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    mockDb.messages.set(msg.id, msg)
    convo.lastMessageAt = new Date().toISOString()
    mockDb.conversations.set(params.id, convo)

    return NextResponse.json({ success: true, data: { ...msg, senderName: user.fullName } }, { status: 201 })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { messages, conversations } = await import('@/lib/db/schema')
  const { eq, and, or } = await import('drizzle-orm')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
  const [convo] = await db.select().from(conversations).where(and(eq(conversations.id, params.id), or(eq(conversations.travelerId, user.id), eq(conversations.hostId, user.id)))).limit(1)
  if (!convo) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 })
  const [msg] = await db.insert(messages).values({ conversationId: params.id, senderId: user.id, content: parsed.data.content }).returning()
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, params.id))
  return NextResponse.json({ success: true, data: msg }, { status: 201 })
}
