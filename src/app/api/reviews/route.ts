import { NextRequest, NextResponse } from 'next/server'
import { createReviewSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { nanoid } = await import('nanoid')

    const token = request.cookies.get('offmap_mock_session')?.value
    const me = mockGetUser(token)
    if (!me) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

    const body = await request.json()
    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid review data', fields: parsed.error.flatten().fieldErrors } }, { status: 422 })

    // Verify reviewer was part of this conversation
    const convo = mockDb.conversations.get(parsed.data.conversationId)
    if (!convo || (convo.travelerId !== me.id && convo.hostId !== me.id)) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'You were not part of this conversation' } }, { status: 403 })
    }

    // Prevent duplicate reviews
    const existing = Array.from(mockDb.reviews.values()).find(
      r => r.reviewerId === me.id && r.conversationId === parsed.data.conversationId
    )
    if (existing) {
      return NextResponse.json({ success: false, error: { code: 'DUPLICATE', message: 'You already reviewed this conversation' } }, { status: 409 })
    }

    const review = {
      id: `rev-${nanoid(8)}`,
      reviewerId: me.id,
      revieweeId: parsed.data.revieweeId,
      conversationId: parsed.data.conversationId,
      rating: parsed.data.rating,
      body: parsed.data.body ?? null,
      createdAt: new Date().toISOString(),
    }
    mockDb.reviews.set(review.id, review)

    // Update host avgRating if reviewee is a host
    const hostProfile = mockDb.getHostProfileByUserId(parsed.data.revieweeId)
    if (hostProfile) {
      const hostReviews = Array.from(mockDb.reviews.values()).filter(r => r.revieweeId === parsed.data.revieweeId)
      const avg = hostReviews.reduce((sum, r) => sum + r.rating, 0) / hostReviews.length
      hostProfile.avgRating = avg.toFixed(2)
      hostProfile.reviewCount = hostReviews.length
    }

    return NextResponse.json({ success: true, data: review }, { status: 201 })
  }

  // Production
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const body = await request.json()
  const parsed = createReviewSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid review data', fields: parsed.error.flatten().fieldErrors } }, { status: 422 })

  const { db } = await import('@/lib/db')
  const { reviews, conversations } = await import('@/lib/db/schema')
  const { eq, and, or } = await import('drizzle-orm')

  const [convo] = await db.select().from(conversations)
    .where(and(eq(conversations.id, parsed.data.conversationId), or(eq(conversations.travelerId, user.id), eq(conversations.hostId, user.id)))).limit(1)
  if (!convo) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'You were not part of this conversation' } }, { status: 403 })

  const [review] = await db.insert(reviews).values({ reviewerId: user.id, revieweeId: parsed.data.revieweeId, conversationId: parsed.data.conversationId, rating: parsed.data.rating, body: parsed.data.body }).returning()
  return NextResponse.json({ success: true, data: review }, { status: 201 })
}
