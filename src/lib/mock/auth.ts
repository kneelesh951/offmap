/**
 * Mock authentication — replaces Supabase Auth in local dev.
 * Uses a simple cookie-based session stored in the mock DB.
 */
import { mockDb } from './db'
import { nanoid } from 'nanoid'

export const MOCK_SESSION_COOKIE = 'offmap_mock_session'

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
    createdAt: new Date().toISOString(),
  }
  mockDb.users.set(user.id, user)

  const token = mockDb.createSession(user.id)
  return { user, token, error: null }
}

export function mockSignIn(email: string, password: string) {
  const user = mockDb.getUserByEmail(email)
  if (!user) return { error: 'Invalid email or password' }
  if (user.password !== password) return { error: 'Invalid email or password' }

  const token = mockDb.createSession(user.id)
  return { user, token, error: null }
}

export function mockGetUser(sessionToken: string | undefined) {
  if (!sessionToken) return null
  return mockDb.getUserBySession(sessionToken) ?? null
}

export function mockSignOut(sessionToken: string) {
  mockDb.sessions.delete(sessionToken)
}
