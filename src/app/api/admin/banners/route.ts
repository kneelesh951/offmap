import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createBannerSchema } from '@/lib/validators'
import { invalidateBannerCache } from '@/lib/banners'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    return NextResponse.json({ success: true, data: mockDb.getAllBanners() })
  }

  const { db } = await import('@/lib/db')
  const { siteBanners } = await import('@/lib/db/schema')
  const { desc } = await import('drizzle-orm')
  const rows = await db.select().from(siteBanners).orderBy(desc(siteBanners.priority))
  return NextResponse.json({ success: true, data: rows })
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = createBannerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: parsed.error.errors[0]?.message ?? 'Invalid input' } }, { status: 400 })
  }

  if (process.env.MOCK_MODE === 'true') {
    const { mockDb } = await import('@/lib/mock/db')
    const exists = mockDb.getAllBanners().find(b => b.key === parsed.data.key)
    if (exists) return NextResponse.json({ success: false, error: { code: 'DUPLICATE_KEY', message: 'A banner with that key already exists' } }, { status: 409 })
    const banner = mockDb.createBanner({ ...parsed.data, enabled: false, ctaLabel: parsed.data.ctaLabel ?? null, ctaHref: parsed.data.ctaHref ?? null, startsAt: parsed.data.startsAt ?? null, endsAt: parsed.data.endsAt ?? null })
    await invalidateBannerCache()
    return NextResponse.json({ success: true, data: banner }, { status: 201 })
  }

  const { db } = await import('@/lib/db')
  const { siteBanners } = await import('@/lib/db/schema')
  const [banner] = await db.insert(siteBanners).values({
    ...parsed.data,
    enabled: false,
    ctaLabel: parsed.data.ctaLabel ?? null,
    ctaHref: parsed.data.ctaHref ?? null,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
  }).returning()
  await invalidateBannerCache()
  return NextResponse.json({ success: true, data: banner }, { status: 201 })
}
