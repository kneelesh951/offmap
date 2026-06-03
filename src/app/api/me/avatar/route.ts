import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 3 * 1024 * 1024 // 3MB

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INVALID_FORM', message: 'Invalid form data' } }, { status: 400 })
  }

  const file = formData.get('avatar') as File | null
  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, error: { code: 'MISSING_FILE', message: 'No avatar file provided' } }, { status: 422 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, or WebP images are accepted' } }, { status: 422 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File must be under 3MB' } }, { status: 422 })
  }

  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } }, { status: 401 })

    // Convert to base64 data URL for mock mode
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    const updated = mockDb.updateUser(user.id, { avatarUrl: dataUrl })
    if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })

    return NextResponse.json({ success: true, data: { avatarUrl: dataUrl } })
  }

  // Production: upload to Supabase Storage
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { users } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Not logged in' } }, { status: 401 })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${authUser.id}/avatar.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const adminClient = createSupabaseAdminClient()

  const { error: uploadError } = await adminClient.storage
    .from('avatars')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Failed to upload avatar' } }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage.from('avatars').getPublicUrl(storagePath)

  const [updated] = await db
    .update(users)
    .set({ avatarUrl: publicUrl })
    .where(eq(users.id, authUser.id))
    .returning()

  if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })

  return NextResponse.json({ success: true, data: { avatarUrl: publicUrl } })
}
