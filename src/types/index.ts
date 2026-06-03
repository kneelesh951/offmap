/**
 * Shared TypeScript types used across the application.
 * DB row types are re-exported from schema.ts.
 */

// ─── API RESPONSE SHAPES ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    requestId?: string
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    fields?: Record<string, string[]> // validation errors
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── HOST SEARCH RESULT ───────────────────────────────────────────────────────
// Joined shape returned by the search endpoint

export interface HostSearchResult {
  id: string                // host_profiles.id
  userId: string
  cityId: string
  cityName: string
  cityCountry: string
  flagEmoji: string | null
  headline: string | null
  bio: string
  languages: string[]
  categories: string[]
  hostType: string
  hourlyRateCents: number | null
  neighborhood: string | null
  avgRating: string | null
  reviewCount: number
  responseRate: string | null
  isPremium: boolean
  isFeatured: boolean
  primaryPhotoUrl: string | null
  // User info
  fullName: string | null
  avatarUrl: string | null
}

// ─── SUBSCRIPTION STATUS ──────────────────────────────────────────────────────
// Cached in Redis, checked on every protected route

export interface SubscriptionStatus {
  isActive: boolean
  plan: 'day' | 'week' | 'month' | 'annual' | null
  expiresAt: string | null // ISO date string
  stripeCustomerId: string | null
}

// ─── CONVERSATION WITH PARTICIPANTS ───────────────────────────────────────────

export interface ConversationWithParticipants {
  id: string
  travelerId: string
  hostId: string
  unlockedAt: string
  lastMessageAt: string | null
  traveler: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  }
  host: {
    id: string
    fullName: string | null
    avatarUrl: string | null
    hostProfile: {
      id: string
      headline: string | null
      primaryPhotoUrl: string | null
    } | null
  }
  lastMessage: {
    content: string
    senderId: string
    createdAt: string
  } | null
  unreadCount: number
}

// ─── SESSION USER ─────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
  role: 'traveler' | 'host' | 'admin'
  fullName: string | null
  avatarUrl: string | null
}
