import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/me/data-export
 * GDPR Article 20 — Data portability
 * Returns all user data as JSON download
 */
export async function GET(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } },
        { status: 401 }
      )
    }

    const data = mockDb.getUserData(user.id)
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="offmap-data-export-${Date.now()}.json"`,
      },
    })
  }

  // ── Production mode ──
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const {
    users, hostProfiles, subscriptions, conversations, messages,
    reviews, wishlists, tripRequests, tripHostResponses, notifications, auditLogs,
  } = await import('@/lib/db/schema')
  const { eq, or } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  const userId = authUser.id

  // Fetch all user data in parallel
  const [
    [user],
    hostProfile,
    subs,
    convos,
    msgs,
    revGiven,
    revReceived,
    wishlist,
    trips,
    tripResps,
    notifs,
    userAuditLogs,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(hostProfiles).where(eq(hostProfiles.userId, userId)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
    db.select().from(conversations).where(
      or(eq(conversations.travelerId, userId), eq(conversations.hostId, userId))
    ),
    db.select().from(messages).where(eq(messages.senderId, userId)),
    db.select().from(reviews).where(eq(reviews.reviewerId, userId)),
    db.select().from(reviews).where(eq(reviews.revieweeId, userId)),
    db.select().from(wishlists).where(eq(wishlists.userId, userId)),
    db.select().from(tripRequests).where(eq(tripRequests.travelerId, userId)),
    db.select().from(tripHostResponses).where(eq(tripHostResponses.hostId, userId)),
    db.select().from(notifications).where(eq(notifications.userId, userId)),
    db.select().from(auditLogs).where(eq(auditLogs.userId, userId)),
  ])

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      { status: 404 }
    )
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      createdAt: user.createdAt,
      gdprConsentAt: user.gdprConsentAt,
      marketingConsent: user.marketingConsent,
    },
    hostProfile: hostProfile[0] ?? null,
    subscriptions: subs,
    conversations: convos,
    messagesSent: msgs,
    reviewsGiven: revGiven,
    reviewsReceived: revReceived,
    wishlists: wishlist,
    tripRequests: trips,
    tripHostResponses: tripResps,
    notifications: notifs,
    auditLog: userAuditLogs,
  }

  // Log the data export for GDPR audit
  await db.insert(auditLogs).values({
    userId,
    action: 'user.data_export',
    tableName: 'users',
    recordId: userId,
    newData: { exportedAt: exportData.exportedAt },
  })

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="offmap-data-export-${Date.now()}.json"`,
    },
  })
}
