/**
 * Zod validation schemas — shared between frontend forms and API endpoints.
 * Single source of truth for all input shapes.
 */
import { z } from 'zod'

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['traveler', 'host']),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the privacy policy to continue' }),
  }),
})

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

// ─── HOST PROFILE ─────────────────────────────────────────────────────────────

export const VALID_CATEGORIES = [
  'food-drink',
  'art-culture',
  'nature',
  'nightlife',
  'history',
  'family',
  'sports',
  'music',
] as const

export const VALID_LANGUAGES = [
  'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ru',
  'ar', 'zh', 'ja', 'ko', 'hi', 'tr', 'sv', 'da', 'fi',
] as const

export const createHostProfileSchema = z.object({
  cityId: z.string().min(1, 'City is required'),
  headline: z.string().min(10, 'At least 10 characters').max(80, 'Max 80 characters'),
  bio: z
    .string()
    .min(100, 'Bio must be at least 100 characters — tell travelers your story')
    .max(2000, 'Bio max 2000 characters'),
  languages: z
    .array(z.enum(VALID_LANGUAGES))
    .min(1, 'Select at least one language')
    .max(8),
  categories: z
    .array(z.enum(VALID_CATEGORIES))
    .min(1, 'Select at least one interest category')
    .max(5),
  hostType: z.enum(['any', 'male', 'female', 'couple', 'family', 'group']),
  hourlyRateCents: z
    .number()
    .int()
    .min(500, 'Minimum rate is €5/hr')
    .max(50000, 'Maximum rate is €500/hr')
    .optional(),
  neighborhood: z.string().max(100).optional(),
})

export const updateHostProfileSchema = createHostProfileSchema.partial()

// ─── SEARCH ───────────────────────────────────────────────────────────────────

export const searchHostsSchema = z.object({
  cityId: z.string().min(1).optional(),
  categories: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  hostType: z.enum(['any', 'male', 'female', 'couple', 'family', 'group']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['rating', 'newest', 'featured']).default('featured'),
})

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

export const createSubscriptionSchema = z.object({
  plan: z.enum(['day', 'week', 'month', 'annual']),
})

// ─── CONVERSATIONS + MESSAGES ─────────────────────────────────────────────────

export const createConversationSchema = z.object({
  hostId: z.string().min(1, 'Host ID is required'),
})

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long — max 5000 characters')
    .trim(),
})

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  conversationId: z.string().min(1),
  revieweeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(20, 'Review must be at least 20 characters').max(1000).optional(),
})

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const createReportSchema = z.object({
  reportedUserId: z.string().min(1),
  reason: z.enum([
    'inappropriate_content',
    'fake_profile',
    'harassment',
    'spam',
    'other',
  ]),
  description: z.string().max(1000).optional(),
})

// ─── TYPE EXPORTS ─────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateHostProfileInput = z.infer<typeof createHostProfileSchema>
export type SearchHostsInput = z.infer<typeof searchHostsSchema>
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
