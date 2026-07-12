import { NextResponse } from 'next/server'
import { IS_MOCK } from '@/lib/mock'
import { MOCK_CITIES } from '@/lib/mock/data'

// Data endpoint — must run per-request, never prerendered at build time
// (the build sandbox has no DB connection).
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_MOCK) {
    return NextResponse.json({ success: true, data: MOCK_CITIES })
  }
  const { db } = await import('@/lib/db')
  const { cities } = await import('@/lib/db/schema')
  const { eq, desc } = await import('drizzle-orm')
  const result = await db.select().from(cities).where(eq(cities.isActive, true)).orderBy(desc(cities.hostCount))
  return NextResponse.json({ success: true, data: result })
}
