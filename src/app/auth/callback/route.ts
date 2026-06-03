/**
 * /auth/callback
 * Supabase redirects here after email verification or OAuth.
 * Exchanges the code for a session and redirects to the app.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { sendWelcomeEmail } from '@/lib/email'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const redirect = url.searchParams.get('redirect') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
  }

  // ─── Sync user to our users table ─────────────────────────────────────────
  const authUser = data.user
  const role = authUser.user_metadata?.role ?? 'traveler'
  const fullName = authUser.user_metadata?.full_name ?? null

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1)

  if (!existingUser) {
    // First login — create user record and send welcome email
    await db.insert(users).values({
      id: authUser.id,
      email: authUser.email!,
      role: role as 'traveler' | 'host',
      fullName,
      gdprConsentAt: new Date(),
    })

    // Send welcome email (non-blocking)
    if (authUser.email) {
      sendWelcomeEmail(authUser.email, fullName ?? 'there', role).catch(console.error)
    }

    // If they registered as a host, redirect to profile creation
    if (role === 'host') {
      return NextResponse.redirect(new URL('/host-dashboard/profile/create', request.url))
    }
  }

  return NextResponse.redirect(new URL(redirect, request.url))
}
