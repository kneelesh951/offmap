/**
 * POST /api/hosts/intro-video   — upload 30-sec intro video
 * DELETE /api/hosts/intro-video — remove intro video
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

// ── POST — upload intro video ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INVALID_FORM', message: 'Invalid form data' } }, { status: 400 })
  }

  const file = formData.get('video') as File | null

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, error: { code: 'MISSING_FILE', message: 'No video file provided' } }, { status: 422 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only MP4, WebM, or MOV videos are accepted' } }, { status: 422 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Video must be under 50MB' } }, { status: 422 })
  }

  // ── Mock mode ──────────────────────────────────────────────────────────────
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    if (user.role !== 'host') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only hosts can upload intro videos' } }, { status: 403 })

    const profile = mockDb.getHostProfileByUserId(user.id)
    if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No host profile found' } }, { status: 404 })

    // In mock mode, create a blob URL placeholder (can't store full video as base64)
    const videoUrl = `mock://intro-video/${profile.id}/${Date.now()}.mp4`

    mockDb.updateHostProfile(profile.id, { introVideoUrl: videoUrl })

    return NextResponse.json({
      success: true,
      data: { videoUrl, message: 'Intro video uploaded successfully.' },
    })
  }

  // ── Production mode ────────────────────────────────────────────────────────
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { hostProfiles } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })

  const [profile] = await db.select({ id: hostProfiles.id }).from(hostProfiles).where(eq(hostProfiles.userId, authUser.id)).limit(1)
  if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No host profile found' } }, { status: 404 })

  const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4'
  const storagePath = `${authUser.id}/intro-video.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const adminClient = createSupabaseAdminClient()

  const { error: uploadError } = await adminClient.storage
    .from('host-videos')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Failed to upload video' } }, { status: 500 })
  }

  const { data: { publicUrl } } = adminClient.storage.from('host-videos').getPublicUrl(storagePath)

  await db.update(hostProfiles).set({
    introVideoUrl: publicUrl,
  }).where(eq(hostProfiles.id, profile.id))

  return NextResponse.json({
    success: true,
    data: { videoUrl: publicUrl, message: 'Intro video uploaded successfully.' },
  })
}

// ── DELETE — remove intro video ──────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })

    const profile = mockDb.getHostProfileByUserId(user.id)
    if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No host profile found' } }, { status: 404 })

    mockDb.updateHostProfile(profile.id, { introVideoUrl: null })
    return NextResponse.json({ success: true, data: { message: 'Intro video removed.' } })
  }

  // Production
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { hostProfiles } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })

  const [profile] = await db.select({ id: hostProfiles.id, introVideoUrl: hostProfiles.introVideoUrl })
    .from(hostProfiles).where(eq(hostProfiles.userId, authUser.id)).limit(1)
  if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No host profile found' } }, { status: 404 })

  // Remove from storage
  if (profile.introVideoUrl) {
    const adminClient = createSupabaseAdminClient()
    const storagePath = `${authUser.id}/intro-video`
    await adminClient.storage.from('host-videos').remove([`${storagePath}.mp4`, `${storagePath}.webm`, `${storagePath}.mov`])
  }

  await db.update(hostProfiles).set({ introVideoUrl: null }).where(eq(hostProfiles.id, profile.id))

  return NextResponse.json({ success: true, data: { message: 'Intro video removed.' } })
}
