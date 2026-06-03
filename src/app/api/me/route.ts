import { NextRequest, NextResponse } from 'next/server'

function computeCompleteness(u: {
  avatarUrl: string | null | undefined
  fullName: string | null | undefined
  bio: string | null | undefined
  homeCity: string | null | undefined
  languages: string[] | null | undefined
  interests: string[] | null | undefined
}): number {
  let s = 0
  if (u.avatarUrl) s += 30
  if (u.fullName && u.fullName.trim().length > 1) s += 20
  if (u.bio && u.bio.trim().length > 20) s += 20
  if (u.homeCity) s += 10
  if (u.languages && u.languages.length > 0) s += 10
  if (u.interests && u.interests.length > 0) s += 10
  return s
}

export async function GET(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } }, { status: 401 })
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio ?? null,
        homeCity: user.homeCity ?? null,
        homeCountry: user.homeCountry ?? null,
        languages: user.languages ?? [],
        interests: user.interests ?? [],
        travelStyle: user.travelStyle ?? null,
        profileCompleteness: user.profileCompleteness ?? 0,
      },
    })
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { users } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } }, { status: 401 })
  const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!user) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })
  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio ?? null,
      homeCity: user.homeCity ?? null,
      homeCountry: user.homeCountry ?? null,
      languages: user.languages ?? [],
      interests: user.interests ?? [],
      travelStyle: user.travelStyle ?? null,
      profileCompleteness: user.profileCompleteness ?? 0,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const { updateProfileSchema } = await import('@/lib/validators')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Validation failed' } }, { status: 422 })
  }

  const validated = parsed.data

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } }, { status: 401 })

    const updated = mockDb.updateUser(user.id, validated)
    if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio ?? null,
        homeCity: updated.homeCity ?? null,
        homeCountry: updated.homeCountry ?? null,
        languages: updated.languages ?? [],
        interests: updated.interests ?? [],
        travelStyle: updated.travelStyle ?? null,
        profileCompleteness: updated.profileCompleteness ?? 0,
      },
    })
  }

  // Production
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { users } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } }, { status: 401 })

  // Fetch current user for completeness computation
  const [currentUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (!currentUser) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })

  const merged = {
    avatarUrl: currentUser.avatarUrl,
    fullName: validated.fullName ?? currentUser.fullName,
    bio: validated.bio ?? currentUser.bio,
    homeCity: validated.homeCity ?? currentUser.homeCity,
    languages: validated.languages ?? currentUser.languages ?? [],
    interests: validated.interests ?? currentUser.interests ?? [],
  }

  const profileCompleteness = computeCompleteness(merged)

  const [updated] = await db
    .update(users)
    .set({
      ...validated,
      profileCompleteness,
    })
    .where(eq(users.id, authUser.id))
    .returning()

  if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio ?? null,
      homeCity: updated.homeCity ?? null,
      homeCountry: updated.homeCountry ?? null,
      languages: updated.languages ?? [],
      interests: updated.interests ?? [],
      travelStyle: updated.travelStyle ?? null,
      profileCompleteness: updated.profileCompleteness ?? 0,
    },
  })
}
