/**
 * Mock authentication — replaces Supabase Auth in local dev / Vercel demo.
 *
 * Sessions are stateless HMAC-signed tokens so they work across serverless
 * instances (no shared in-memory Map required).
 * Format: base64url(JSON payload) + "." + HMAC-SHA256 signature
 */
import crypto from 'crypto'
import { mockDb } from './db'
import { nanoid } from 'nanoid'

export const MOCK_SESSION_COOKIE = 'offmap_mock_session'

// Fallback secret is fine for a demo — real secrets go in env for staging.
const SECRET = process.env.MOCK_JWT_SECRET ?? 'offmap-mock-demo-secret-not-for-production'

function sign(payload: object): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

function verify(token: string): { sub: string } | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  if (sig !== expected) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
}

export function mockSignUp(email: string, password: string, fullName: string, role: 'traveler' | 'host') {
  const existing = mockDb.getUserByEmail(email)
  if (existing) return { error: 'Email already registered' }

  const user = {
    id: `user-${nanoid(8)}`,
    email,
    password,
    role,
    fullName,
    avatarUrl: null,
    bio: null,
    homeCity: null,
    homeCountry: null,
    languages: [] as string[],
    interests: [] as string[],
    travelStyle: null,
    profileCompleteness: 0,
    creditsBalance: 0,
    createdAt: new Date().toISOString(),
  }
  mockDb.users.set(user.id, user)

  const token = sign({ sub: user.id, iat: Date.now() })
  return { user, token, error: null }
}

export function mockSignIn(email: string, password: string) {
  const user = mockDb.getUserByEmail(email)
  if (!user) return { error: 'Invalid email or password' }
  if (user.password !== password) return { error: 'Invalid email or password' }

  const token = sign({ sub: user.id, iat: Date.now() })
  return { user, token, error: null }
}

export function mockGetUser(sessionToken: string | undefined) {
  if (!sessionToken) return null
  const claims = verify(sessionToken)
  if (!claims?.sub) return null
  return mockDb.users.get(claims.sub) ?? null
}

// Stateless tokens cannot be server-side invalidated — clearing the cookie is enough.
export function mockSignOut(_sessionToken: string) {
  // no-op: cookie deleted by the logout route
}
