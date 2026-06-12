import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { currentPassword, newPassword } = body
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Current and new password are required' } },
      { status: 422 }
    )
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } },
      { status: 422 }
    )
  }

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

    // Verify current password
    const fullUser = mockDb.getUserById(user.id)
    if (!fullUser || fullUser.password !== currentPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } },
        { status: 403 }
      )
    }

    // Update password in mock DB
    mockDb.updateUserPassword(user.id, newPassword)

    return NextResponse.json({ success: true, data: { message: 'Password updated successfully' } })
  }

  // Production — use Supabase Auth
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.email!,
    password: currentPassword,
  })
  if (signInError) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } },
      { status: 403 }
    )
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) {
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update password' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: { message: 'Password updated successfully' } })
}
