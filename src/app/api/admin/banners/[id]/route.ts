import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { updateBannerSchema } from '@/lib/validators'
import { invalidateBannerCache } from '@/lib/banners'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateBannerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: parsed.error.errors[0]?.message ?? 'Invalid input' } }, { status: 400 })
  }

  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const updated = mockDb.updateBanner(id, {
      ...parsed.data,
      ctaLabel: parsed.data.ctaLabel ?? null,
      ctaHref: parsed.data.ctaHref ?? null,
      startsAt: parsed.data.startsAt ?? null,
      endsAt: parsed.data.endsAt ?? null,
    })
    if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } }, { status: 404 })
    await invalidateBannerCache()
    return NextResponse.json({ success: true, data: updated })
  }

  const { db } = await import('@/lib/db')
  const { siteBanners } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const patch: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() }
  if (parsed.data.startsAt !== undefined) patch.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null
  if (parsed.data.endsAt !== undefined)   patch.endsAt   = parsed.data.endsAt   ? new Date(parsed.data.endsAt)   : null
  const [updated] = await db.update(siteBanners).set(patch).where(eq(siteBanners.id, id)).returning()
  if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } }, { status: 404 })
  await invalidateBannerCache()
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params

  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const ok = mockDb.deleteBanner(id)
    if (!ok) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } }, { status: 404 })
    await invalidateBannerCache()
    return NextResponse.json({ success: true, data: { id } })
  }

  const { db } = await import('@/lib/db')
  const { siteBanners } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const [deleted] = await db.delete(siteBanners).where(eq(siteBanners.id, id)).returning()
  if (!deleted) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } }, { status: 404 })
  await invalidateBannerCache()
  return NextResponse.json({ success: true, data: { id } })
}
