/**
 * GET /api/hosts/[id]/availability/settings
 * Returns the raw HostAvailability object for the host settings page.
 * Only accessible by the host themselves.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.MOCK_MODE === 'true') {
      const { mockGetUser } = await import('@/lib/mock/auth')
      const { mockDb } = await import('@/lib/mock/db')

      const token = cookies().get('offmap_mock_session')?.value
      const user = mockGetUser(token)
      if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
      if (user.id !== params.id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 })

      const profile = Array.from(mockDb.hostProfiles.values()).find(h => h.userId === user.id)
      return NextResponse.json({ success: true, data: profile?.availability ?? null })
    }

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    if (authUser.id !== params.id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 })

    const { db } = await import('@/lib/db')
    const { hostProfiles } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [host] = await db
      .select({ availability: hostProfiles.availability })
      .from(hostProfiles)
      .where(eq(hostProfiles.userId, authUser.id))
      .limit(1)

    return NextResponse.json({ success: true, data: host?.availability ?? null })
  } catch (err) {
    console.error('[availability settings GET]', err)
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Server error' } }, { status: 500 })
  }
}
