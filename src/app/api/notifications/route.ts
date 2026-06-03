import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notifications — fetch user's notifications
 * PATCH /api/notifications — mark notifications as read
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

    const notifs = mockDb.getNotifications(user.id)
    const unreadCount = notifs.filter(n => !n.isRead).length
    return NextResponse.json({
      success: true,
      data: { notifications: notifs, unreadCount },
    })
  }

  // ── Production mode ──
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { notifications } = await import('@/lib/db/schema')
  const { eq, desc, and } = await import('drizzle-orm')
  const { count } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  const [notifs, [{ value: unreadCount }]] = await Promise.all([
    db.select()
      .from(notifications)
      .where(eq(notifications.userId, authUser.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    db.select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, authUser.id), eq(notifications.isRead, false))),
  ])

  return NextResponse.json({
    success: true,
    data: { notifications: notifs, unreadCount: Number(unreadCount) },
  })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { notificationId, markAll } = body as { notificationId?: string; markAll?: boolean }

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

    if (markAll) {
      const count = mockDb.markAllNotificationsRead(user.id)
      return NextResponse.json({ success: true, data: { markedRead: count } })
    }
    if (notificationId) {
      const ok = mockDb.markNotificationRead(notificationId, user.id)
      if (!ok) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: { markedRead: 1 } })
    }

    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide notificationId or markAll' } },
      { status: 422 }
    )
  }

  // ── Production mode ──
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { notifications } = await import('@/lib/db/schema')
  const { eq, and } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  const now = new Date()

  if (markAll) {
    await db.update(notifications)
      .set({ isRead: true, readAt: now })
      .where(and(eq(notifications.userId, authUser.id), eq(notifications.isRead, false)))
    return NextResponse.json({ success: true, data: { markedRead: true } })
  }

  if (notificationId) {
    // Verify the notification exists and belongs to this user
    const [existing] = await db.select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, authUser.id)))
      .limit(1)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } },
        { status: 404 }
      )
    }
    await db.update(notifications)
      .set({ isRead: true, readAt: now })
      .where(eq(notifications.id, notificationId))
    return NextResponse.json({ success: true, data: { markedRead: 1 } })
  }

  return NextResponse.json(
    { success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide notificationId or markAll' } },
    { status: 422 }
  )
}
