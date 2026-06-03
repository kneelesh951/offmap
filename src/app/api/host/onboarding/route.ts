/**
 * POST /api/host/onboarding
 * Creates a host profile after the multi-step onboarding wizard.
 * Works in both mock and production modes.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'

const schema = z.object({
  cityId:          z.string().min(1, 'City is required'),
  headline:        z.string().min(10, 'Headline must be at least 10 characters').max(100),
  bio:             z.string().min(50, 'Bio must be at least 50 characters').max(600),
  categories:      z.array(z.string()).min(1, 'Select at least one category').max(6),
  languages:       z.array(z.string()).min(1, 'Select at least one language').max(10),
  hourlyRateCents: z.number().int().min(1000).max(30000), // €10–€300
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 422 }
      )
    }

    const data = parsed.data

    // ── Mock mode ────────────────────────────────────────────────────────────
    if (process.env.MOCK_MODE === 'true') {
      const { mockGetUser } = await import('@/lib/mock/auth')
      const { mockDb } = await import('@/lib/mock/db')

      const token = cookies().get('offmap_mock_session')?.value
      const user = mockGetUser(token)
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
          { status: 401 }
        )
      }

      // Prevent duplicate profiles
      const existing = mockDb.getHostProfileByUserId(user.id)
      if (existing) {
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Host profile already exists' } },
          { status: 409 }
        )
      }

      // Create the host profile
      const profile = mockDb.createHostProfile(user.id, {
        cityId:          data.cityId,
        headline:        data.headline,
        bio:             data.bio,
        categories:      data.categories,
        languages:       data.languages,
        hostType:        'any',
        hourlyRateCents: data.hourlyRateCents,
      })

      // Update user role to 'host'
      const u = mockDb.users.get(user.id)
      if (u) { u.role = 'host'; mockDb.users.set(u.id, u) }

      return NextResponse.json({ success: true, data: { profileId: profile.id } }, { status: 201 })
    }

    // ── Production mode ───────────────────────────────────────────────────────
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Use Supabase REST API (HTTPS) instead of Drizzle (TCP) to avoid port-blocking issues
    const supabaseAdmin = await import('@/lib/supabase/server').then(m => m.createSupabaseAdminClient())

    // Resolve slug → UUID (onboarding sends e.g. "city-amsterdam", DB expects a UUID)
    const cityName = data.cityId.replace(/^city-/, '').replace(/-/g, ' ')
    const { data: cityRow, error: cityErr } = await supabaseAdmin
      .from('cities')
      .select('id')
      .ilike('name', cityName)
      .maybeSingle()
    if (cityErr || !cityRow) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `City not found: ${data.cityId}` } },
        { status: 422 }
      )
    }
    const cityUuid = cityRow.id

    // Prevent duplicate profiles
    const { data: existing } = await supabaseAdmin
      .from('host_profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Host profile already exists' } },
        { status: 409 }
      )
    }

    // Insert host profile
    const { data: profile, error: insertErr } = await supabaseAdmin
      .from('host_profiles')
      .insert({
        user_id:           authUser.id,
        city_id:           cityUuid,
        headline:          data.headline,
        bio:               data.bio,
        categories:        data.categories,
        languages:         data.languages,
        host_type:         'any',
        hourly_rate_cents: data.hourlyRateCents,
        moderation_status: 'pending',
        is_active:         true,
      })
      .select('id')
      .single()
    if (insertErr) throw new Error(insertErr.message)

    // Update user role via Supabase REST
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ role: 'host' })
      .eq('id', authUser.id)
    if (updateErr) console.warn('[host/onboarding] role update failed:', updateErr.message)

    return NextResponse.json({ success: true, data: { profileId: profile.id } }, { status: 201 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[host/onboarding] error:', msg)
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: msg || 'Something went wrong' } },
      { status: 500 }
    )
  }
}
