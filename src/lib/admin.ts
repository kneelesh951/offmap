/**
 * Admin auth guard — used in both admin page server components and API routes.
 * Returns the admin user if valid, throws a 404-shaped response otherwise.
 * Two-layer security: IP allowlist (middleware) + role check (here).
 */
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const isMock = process.env.MOCK_MODE === 'true'

  if (isMock) {
    const { cookies } = await import('next/headers')
    const { mockGetUser } = await import('@/lib/mock/auth')
    const token = (await cookies()).get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user || user.role !== 'admin') {
      return { user: null, error: NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }) }
    }
    return { user, error: null }
  }

  // Production: check Supabase session + DB role
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return { user: null, error: NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }) }
  }
  const { db } = await import('@/lib/db')
  const { users } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const [dbUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!dbUser || dbUser.role !== 'admin') {
    return { user: null, error: NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }) }
  }
  return { user: dbUser, error: null }
}
