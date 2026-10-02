import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const isMock = process.env.MOCK_MODE === 'true'
  if (!isMock) return NextResponse.json({ success: false, error: { code: 'NOT_IMPL', message: 'Production not implemented' } }, { status: 501 })

  const { mockDb } = await import('@/lib/mock/db')
  const body = await req.json() as { reportId: string; status?: string; adminNote?: string }
  if (!body.reportId) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'reportId required' } }, { status: 400 })

  const ok = mockDb.updateReport(body.reportId, {
    status: body.status as 'open' | 'reviewing' | 'resolved' | 'dismissed' | undefined,
    adminNote: body.adminNote,
  })
  if (!ok) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 })

  return NextResponse.json({ success: true })
}
