/**
 * Banner service — fetches active site banners with Redis caching.
 *
 * Cache key: site:banners:active  TTL: 60s
 * Call invalidateBannerCache() on any admin create/update/delete.
 */
import { cacheGet, cacheSet, cacheDel } from '@/lib/cache'
import { IS_MOCK } from '@/lib/mock'

export type BannerVariant = 'info' | 'promo' | 'warning' | 'urgent'
export type BannerTarget  = 'all' | 'travelers' | 'hosts' | 'unsubscribed' | 'subscribed'

export interface BannerData {
  id: string
  key: string
  variant: BannerVariant
  text: string
  ctaLabel: string | null
  ctaHref: string | null
  target: BannerTarget
  priority: number
  dismissible: boolean
}

const CACHE_KEY = 'site:banners:active'
const CACHE_TTL = 60

export async function getActiveBanners(): Promise<BannerData[]> {
  const cached = await cacheGet(CACHE_KEY)
  if (cached) return JSON.parse(cached) as BannerData[]

  let banners: BannerData[]

  if (IS_MOCK) {
    const { mockDb } = await import('@/lib/mock/db')
    banners = mockDb.getActiveBanners().map(b => ({
      id: b.id, key: b.key, variant: b.variant, text: b.text,
      ctaLabel: b.ctaLabel, ctaHref: b.ctaHref, target: b.target,
      priority: b.priority, dismissible: b.dismissible,
    }))
  } else {
    const { db } = await import('@/lib/db')
    const { siteBanners } = await import('@/lib/db/schema')
    const { and, eq, or, isNull, lte, gte, desc } = await import('drizzle-orm')
    const now = new Date()
    const rows = await db.select().from(siteBanners)
      .where(and(
        eq(siteBanners.enabled, true),
        or(isNull(siteBanners.startsAt), lte(siteBanners.startsAt, now)),
        or(isNull(siteBanners.endsAt),   gte(siteBanners.endsAt,   now)),
      ))
      .orderBy(desc(siteBanners.priority))
    banners = rows.map(r => ({
      id: r.id, key: r.key, variant: r.variant, text: r.text,
      ctaLabel: r.ctaLabel, ctaHref: r.ctaHref, target: r.target,
      priority: r.priority, dismissible: r.dismissible,
    }))
  }

  await cacheSet(CACHE_KEY, JSON.stringify(banners), CACHE_TTL)
  return banners
}

export async function invalidateBannerCache(): Promise<void> {
  await cacheDel(CACHE_KEY)
}
