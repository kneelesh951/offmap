import { z } from 'zod'

export const VALID_CATEGORIES = ['food-drink','art-culture','nature','nightlife','history','family','sports','music'] as const
export const VALID_LANGUAGES  = ['en','de','fr','es','it','pt','nl','pl','ru','ar','zh','ja','ko','hi','tr','sv','da','fi'] as const

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8,'Min 8 characters').regex(/[A-Z]/,'Needs one uppercase').regex(/[0-9]/,'Needs one number'),
  fullName: z.string().min(2,'Min 2 characters').max(100),
  role: z.enum(['traveler','host']),
  gdprConsent: z.literal(true,{errorMap:()=>({message:'Accept the privacy policy to continue'})}),
})
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1,'Password required'),
})
export const createHostProfileSchema = z.object({
  cityId: z.string().min(1, 'City is required'),
  headline: z.string().min(10).max(80),
  bio: z.string().min(100,'Bio must be at least 100 characters').max(2000),
  languages: z.array(z.enum(VALID_LANGUAGES)).min(1).max(8),
  categories: z.array(z.enum(VALID_CATEGORIES)).min(1).max(5),
  hostType: z.enum(['any','male','female','couple','family','group']),
  hourlyRateCents: z.number().int().min(500).max(50000).optional(),
  neighborhood: z.string().max(100).optional(),
})
export const updateHostProfileSchema = createHostProfileSchema.partial()
export const searchHostsSchema = z.object({
  cityId: z.string().min(1).optional(),
  categories: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  hostType: z.enum(['any','male','female','couple','family','group']).optional(),
  minRateCents: z.coerce.number().int().min(0).optional(),
  maxRateCents: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['rating','newest','featured','price_asc','price_desc']).default('featured'),
  q: z.string().max(100).optional(),
})
export const createSubscriptionSchema = z.object({ plan: z.enum(['day','week','month','annual']) })
export const createConversationSchema = z.object({ hostId: z.string().min(1) })
export const sendMessageSchema = z.object({ content: z.string().min(1).max(5000).trim() })
export const createReviewSchema = z.object({
  conversationId: z.string().min(1),
  revieweeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(20).max(1000).optional(),
})

export const createTripRequestSchema = z.object({
  cityId: z.string().min(1, 'City is required'),
  arrivalDate: z.string().min(1, 'Arrival date required'),
  departureDate: z.string().min(1, 'Departure date required'),
  numTravelers: z.number().int().min(1).max(20).default(1),
  categories: z.array(z.enum(VALID_CATEGORIES)).min(1, 'Select at least one category').max(6),
  hostTypePreference: z.enum(['any','male','female','couple','family','group']).default('any'),
  noteToHosts: z.string().max(200, 'Max 200 characters').optional(),
  budgetRange: z.string().max(100).optional(),
})

export const createTripHostResponseSchema = z.object({
  message: z.string().max(1000).optional(),
})

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  homeCity: z.string().max(100).optional(),
  homeCountry: z.string().max(100).optional(),
  languages: z.array(z.enum(VALID_LANGUAGES)).max(8).optional(),
  interests: z.array(z.enum(VALID_CATEGORIES)).max(6).optional(),
  travelStyle: z.enum(['solo', 'couple', 'family', 'group']).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export type RegisterInput            = z.infer<typeof registerSchema>
export type LoginInput               = z.infer<typeof loginSchema>
export type CreateHostInput          = z.infer<typeof createHostProfileSchema>
export type SearchHostsInput         = z.infer<typeof searchHostsSchema>
export type CreateTripRequestInput   = z.infer<typeof createTripRequestSchema>
export type CreateTripHostRespInput  = z.infer<typeof createTripHostResponseSchema>
