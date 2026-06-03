import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/me/delete
 * GDPR Article 17 — Right to erasure ("right to be forgotten")
 *
 * Anonymizes PII, removes profile data, keeps financial records for 10 years.
 * Messages are redacted but conversation records are kept for audit trail.
 */
export async function POST(request: NextRequest) {
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

    const deleted = mockDb.deleteUserData(user.id)
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      )
    }

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      data: { message: 'Your data has been anonymized. Financial records are retained for 10 years as required by law.' },
    })
    response.cookies.delete('offmap_mock_session')
    return response
  }

  // ── Production mode ──
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const {
    users, hostProfiles, hostPhotos, wishlists, messages,
    notifications, auditLogs,
  } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  const userId = authUser.id

  // Log the deletion request BEFORE deleting (GDPR audit)
  await db.insert(auditLogs).values({
    userId,
    action: 'user.deletion_requested',
    tableName: 'users',
    recordId: userId,
    newData: { requestedAt: new Date().toISOString() },
  })

  // 1. Anonymize user PII (keep the row for referential integrity)
  await db.update(users).set({
    email: `deleted-${userId}@anonymized.local`,
    fullName: 'Deleted User',
    avatarUrl: null,
    phone: null,
    dataDeleteRequestedAt: new Date(),
    marketingConsent: false,
  }).where(eq(users.id, userId))

  // 2. Delete host profile + photos (cascade handles photos)
  const [profile] = await db.select({ id: hostProfiles.id })
    .from(hostProfiles)
    .where(eq(hostProfiles.userId, userId))
    .limit(1)
  if (profile) {
    await db.delete(hostPhotos).where(eq(hostPhotos.hostId, profile.id))
    await db.delete(hostProfiles).where(eq(hostProfiles.id, profile.id))
  }

  // 3. Delete wishlists
  await db.delete(wishlists).where(eq(wishlists.userId, userId))

  // 4. Redact message content (keep records for audit)
  await db.update(messages).set({
    content: '[deleted]',
    isDeleted: true,
  }).where(eq(messages.senderId, userId))

  // 5. Delete notifications
  await db.delete(notifications).where(eq(notifications.userId, userId))

  // 6. Delete auth user from Supabase (removes JWT, sessions, etc.)
  const adminClient = createSupabaseAdminClient()
  await adminClient.auth.admin.deleteUser(userId)

  // Note: subscriptions, conversations, reviews are KEPT for:
  // - Financial records: 10-year retention (German tax law)
  // - Audit trail: conversations never hard-deleted (legal requirement)

  const response = NextResponse.json({
    success: true,
    data: { message: 'Your data has been anonymized. Financial records are retained for 10 years as required by law.' },
  })
  return response
}
