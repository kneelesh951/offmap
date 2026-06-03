import { NextRequest, NextResponse } from 'next/server'
import { createHostProfileSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = createHostProfileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid data', fields: parsed.error.flatten().fieldErrors } }, { status: 422 })

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })
    const existing = mockDb.getHostProfileByUserId(user.id)
    if (existing) return NextResponse.json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Profile already exists.' } }, { status: 409 })
    const profile = mockDb.createHostProfile(user.id, parsed.data)
    return NextResponse.json({ success: true, data: profile }, { status: 201 })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Login required' } }, { status: 401 })

  const { db } = await import('@/lib/db')
  const { hostProfiles } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const [existing] = await db.select({ id: hostProfiles.id }).from(hostProfiles).where(eq(hostProfiles.userId, user.id)).limit(1)
  if (existing) return NextResponse.json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Profile already exists. Use PATCH to update.' } }, { status: 409 })

  const [profile] = await db.insert(hostProfiles).values({ userId: user.id, ...parsed.data }).returning()
  return NextResponse.json({ success: true, data: profile }, { status: 201 })
}
