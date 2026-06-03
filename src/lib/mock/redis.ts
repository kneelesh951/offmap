/**
 * Mock Redis — in-memory Map replaces Upstash in local dev.
 * Rate limiting always allows requests in mock mode.
 */

const store = new Map<string, { value: string; expiresAt: number | null }>()

export const mockRedis = {
  get: async (key: string) => {
    const item = store.get(key)
    if (!item) return null
    if (item.expiresAt && item.expiresAt < Date.now()) { store.delete(key); return null }
    return item.value
  },
  set: async (key: string, value: string, ex?: number) => {
    store.set(key, { value, expiresAt: ex ? Date.now() + ex * 1000 : null })
    return 'OK'
  },
  del: async (key: string) => { store.delete(key); return 1 },
}

// Mock rate limiter — always allows in dev
export const mockRatelimit = {
  limit: async (_key: string) => ({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
}
