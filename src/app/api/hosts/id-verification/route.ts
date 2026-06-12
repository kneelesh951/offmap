/**
 * POST /api/hosts/id-verification  — upload ID document for verification
 * GET  /api/hosts/id-verification  — check verification status
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const VALID_DOC_TYPES = ['passport', 'drivers_license', 'national_id']

// ── GET — check verification status ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })

    const profile = mockDb.getHostProfileByUserId(user.id)
    if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No host profile found' } }, { status: 404 })

    return NextResponse.json({
      success: true,
      data: {
        status: profile.idVerificationStatus,
        documentType: profile.idDocumentType,
        verifiedAt: profile.idVerifiedAt,
        rejectionReason: profile.idRejectionReason,
      },
    })
  }

  // Production
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const { db } = await import('@/lib/db')
  const { hostProfiles } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const supabase = createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })

  const [profile] = await db.select({
    status: hostProfiles.idVerificationStatus,
    documentType: hostProfiles.idDocumentType,
    verifiedAt: hostProfiles.idVerifiedAt,
    rejectionReason: hostProfiles.idRejectionReason,
  }).from(hostProfiles).where(eq(hostProfiles.userId, authUser.id)).limit(1)

  if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No host profile found' } }, { status: 404 })

  return NextResponse.json({ success: true, data: profile })
}

// ── POST — upload ID document ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INVALID_FORM', message: 'Invalid form data' } }, { status: 400 })
  }

  const file = formData.get('document') as File | null
  const documentType = formData.get('documentType') as string | null

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, error: { code: 'MISSING_FILE', message: 'No document file provided' } }, { status: 422 })
  }

  if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_DOC_TYPE', message: 'Document type must be passport, drivers_license, or national_id' } }, { status: 422 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, WebP, or PDF files are accepted' } }, { status: 422 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File must be under 10MB' } }, { status: 422 })
  }

  // ── Mock mode ──────────────────────────────────────────────────────────────
  if (process.env.MOCK_MODE === 'true') {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = request.cookies.get('offmap_mock_session')?.value
    const user = mockGetUser(token)
    if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
    if (user.role !== 'host') return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only hosts can upload ID documents' } }, { status: 403 })

    const profile = mockDb.getHostProfileByUserId(user.id)
    if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'No host profile found' } }, { status: 404 })

    // In mock mode, store as base64 data URL
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    mockDb.updateHostProfile(profile.id, {
      idDocumentUrl: dataUrl,
      idDocumentType: documentType,
      idVerificationStatus: 'pending',
      idRejectionReason: null,
    })

    // Auto-verify in mock mode after a short delay (simulate review)
    setTimeout(() => {
      const p = mockDb.hostProfiles.get(profile.id)
      if (p && p.idVerificationStatus === 'pending') {
        mockDb.updateHostProfile(profile.id, {
          idVerificationStatus: 'verified',
          idVerifiedAt: new Date().toISOString(),
        })
      }
    }, 3000)

    return NextResponse.json({
      success: true,
      data: {
        status: 'pending',
        documentType,
        message: 'Document uploaded. Verification in progress.',
      },
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

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${authUser.id}/id-document.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const adminClient = createSupabaseAdminClient()

  // Upload to a PRIVATE bucket (ID docs should not be publicly accessible)
  const { error: uploadError } = await adminClient.storage
    .from('host-id-docs')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Failed to upload document' } }, { status: 500 })
  }

  await db.update(hostProfiles).set({
    idDocumentUrl: storagePath,
    idDocumentType: documentType,
    idVerificationStatus: 'pending',
    idRejectionReason: null,
  }).where(eq(hostProfiles.id, profile.id))

  return NextResponse.json({
    success: true,
    data: {
      status: 'pending',
      documentType,
      message: 'Document uploaded. We will review it within 24 hours.',
    },
  })
}
