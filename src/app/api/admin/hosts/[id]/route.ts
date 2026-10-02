import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return NextResponse.json({ success: false, error: { code: 'NOT_IMPL', message: 'Production not implemented' } }, { status: 501 })

  const { mockDb } = await import('@/lib/mock/db')
  const { id } = await params
  const profile = mockDb.hostProfiles.get(id)
  if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } }, { status: 404 })

  const user = mockDb.users.get(profile.userId)
  const city = mockDb.cities.get(profile.cityId)
  const adminNotes = mockDb.getAdminNotes(profile.userId)
  const bookings = mockDb.getBookingsByHost(profile.userId)

  return NextResponse.json({
    success: true,
    data: {
      profile: { ...profile, cityName: city?.name ?? null, flagEmoji: city?.flagEmoji ?? null },
      user: { fullName: user?.fullName ?? '', email: user?.email ?? '', createdAt: user?.createdAt ?? '' },
      adminNotes,
      bookingCount: bookings.length,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return NextResponse.json({ success: false, error: { code: 'NOT_IMPL', message: 'Production not implemented' } }, { status: 501 })

  const { mockDb } = await import('@/lib/mock/db')
  const { id } = await params
  const body = await req.json() as { action: 'approve' | 'reject' | 'suspend' | 'note'; note?: string }

  const profile = mockDb.hostProfiles.get(id)
  if (!profile) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Host not found' } }, { status: 404 })

  if (body.action === 'approve') {
    mockDb.approveHost(id)
    mockDb.createNotification({ userId: profile.userId, type: 'host_approved', title: 'Your host profile has been approved!', body: 'Welcome to Offmap — your profile is now live and discoverable by travelers.' })
    const user = mockDb.users.get(profile.userId)
    if (user) {
      const { mockEmail } = await import('@/lib/mock/email')
      mockEmail.sendHostApproved(user.email, user.fullName, profile.cityId)
    }
    return NextResponse.json({ success: true, data: { status: 'approved' } })
  }

  if (body.action === 'reject') {
    mockDb.rejectHost(id, body.note)
    mockDb.createNotification({ userId: profile.userId, type: 'host_rejected', title: 'Host application update', body: body.note ?? 'Your application was not approved at this time. Please review our host guidelines and reapply.' })
    const user = mockDb.users.get(profile.userId)
    if (user) {
      const { mockEmail } = await import('@/lib/mock/email')
      mockEmail.sendHostRejected(user.email, user.fullName, body.note ?? 'Your application was not approved at this time.')
    }
    return NextResponse.json({ success: true, data: { status: 'rejected' } })
  }

  if (body.action === 'suspend') {
    mockDb.suspendHost(id)
    mockDb.createNotification({ userId: profile.userId, type: 'system', title: 'Your profile has been temporarily suspended', body: 'Please contact support for more information.' })
    return NextResponse.json({ success: true, data: { status: 'suspended' } })
  }

  if (body.action === 'note') {
    if (!body.note?.trim()) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'Note cannot be empty' } }, { status: 400 })
    const adminId = isMock ? 'user-admin-demo' : (admin as { id: string }).id
    const note = mockDb.addAdminNote(profile.userId, adminId, body.note)
    return NextResponse.json({ success: true, data: { note } })
  }

  return NextResponse.json({ success: false, error: { code: 'BAD_ACTION', message: 'Unknown action' } }, { status: 400 })
}
