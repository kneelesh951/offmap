/**
 * Unified cache + rate-limit module.
 *
 * In mock mode: delegates to in-memory mockRedis (no real connections).
 * In production: uses Upstash Redis singletons — one client, one Ratelimit
 * instance per tier. Creating these once at module load avoids the overhead
 * of re-instantiating on every request.
 *
 * Rate limit tiers:
 *   auth   — 5 req / 15 min  (login, register, forgot-password)
 *   write  — 30 req / 60 s   (POST/PATCH to resource routes)
 *   read   — 100 req / 60 s  (search, profile loads — global fallback)
 */

import { IS_MOCK } from '@/lib/mock'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type RateLimitTier = 'auth' | 'write' | 'read'

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

interface CacheClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ex?: number): Promise<unknown>
  del(key: string): Promise<unknown>
}

// ─── MOCK PATH ────────────────────────────────────────────────────────────────

let _mockCache: CacheClient | null = null

async function getMockCache(): Promise<CacheClient> {
  if (!_mockCache) {
    const { mockRedis } = await import('@/lib/mock/redis')
    _mockCache = mockRedis
  }
  return _mockCache
}

async function mockRateLimit(_tier: RateLimitTier, _ip: string): Promise<RateLimitResult> {
  return { success: true, remaining: 99, reset: Date.now() + 60_000 }
}

// ─── PRODUCTION SINGLETONS ────────────────────────────────────────────────────

// These are initialised once on first use (module-level lazy init).
// Vercel serverless: each cold start creates them fresh — warm invocations reuse.
let _redis: import('@upstash/redis').Redis | null = null
let _limiters: Record<RateLimitTier, import('@upstash/ratelimit').Ratelimit> | null = null

async function getProdRedis() {
  if (_redis) return _redis
  const { Redis } = await import('@upstash/redis')
  _redis = Redis.fromEnv()
  return _redis
}

async function getProdLimiters() {
  if (_limiters) return _limiters
  const { Ratelimit } = await import('@upstash/ratelimit')
  const redis = await getProdRedis()
  _limiters = {
    auth:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,   '900 s'), prefix: 'rl:auth' }),
    write: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30,  '60 s'),  prefix: 'rl:write' }),
    read:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '60 s'),  prefix: 'rl:read' }),
  }
  return _limiters
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/** Check rate limit for an IP. Returns { success } — false means 429. */
export async function checkRateLimit(tier: RateLimitTier, ip: string): Promise<RateLimitResult> {
  if (IS_MOCK) return mockRateLimit(tier, ip)
  try {
    const limiters = await getProdLimiters()
    const { success, remaining, reset } = await limiters[tier].limit(ip)
    return { success, remaining, reset }
  } catch {
    // Redis unavailable — fail open so a Redis outage doesn't take down the site
    return { success: true, remaining: -1, reset: 0 }
  }
}

/** Get a cached value. Returns null on miss or Redis error. */
export async function cacheGet(key: string): Promise<string | null> {
  if (IS_MOCK) return (await getMockCache()).get(key)
  try {
    const redis = await getProdRedis()
    return (await redis.get<string>(key)) ?? null
  } catch {
    return null
  }
}

/** Set a cached value with optional TTL in seconds. */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (IS_MOCK) { await (await getMockCache()).set(key, value, ttlSeconds); return }
  try {
    const redis = await getProdRedis()
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value)
    } else {
      await redis.set(key, value)
    }
  } catch { /* fail open */ }
}

/** Delete a cache key (call on mutations to invalidate stale data). */
export async function cacheDel(key: string): Promise<void> {
  if (IS_MOCK) { await (await getMockCache()).del(key); return }
  try {
    const redis = await getProdRedis()
    await redis.del(key)
  } catch { /* fail open */ }
}

// ─── CACHE KEY HELPERS ────────────────────────────────────────────────────────
// Centralised here so route files and webhook handlers share the same key format.

export function subscriptionCacheKey(userId: string) {
  return `sub:${userId}`
}

/** Delete all keys matching a glob pattern (e.g. 'search:*'). */
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (IS_MOCK) return // mock has no pattern del — individual keys expire naturally
  try {
    const redis = await getProdRedis()
    // Upstash supports SCAN — use it to avoid KEYS on large datasets
    let cursor = 0
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
      cursor = Number(nextCursor)
      if (keys.length) await redis.del(...keys)
    } while (cursor !== 0)
  } catch { /* fail open */ }
}
