/**
 * Offmap Database Schema
 * PostgreSQL via Supabase + Drizzle ORM
 *
 * Tables:
 *   users            — all accounts (travelers + hosts + admins)
 *   cities           — supported cities
 *   host_profiles    — host listing data
 *   host_photos      — host gallery images
 *   subscriptions    — traveler subscription records
 *   conversations    — unlocked traveler↔host channels
 *   messages         — individual messages in a conversation
 *   reviews          — post-meetup ratings (bidirectional)
 *   wishlists        — traveler saved hosts
 *   reports          — safety reports
 *   notifications    — in-app notification system
 *   audit_logs       — every data change, for GDPR + debugging
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── TIMESTAMPS helper ────────────────────────────────────────────────────────
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['traveler', 'host', 'admin'])

export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified',
  'pending',
  'verified',
  'rejected',
])

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'day',
  'week',
  'month',
  'annual',
])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'cancelled',
  'incomplete',
])

export const hostTypeEnum = pgEnum('host_type', [
  'any',
  'male',
  'female',
  'couple',
  'family',
  'group',
])

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'approved',
  'rejected',
  'flagged',
])

export const reportReasonEnum = pgEnum('report_reason', [
  'inappropriate_content',
  'fake_profile',
  'harassment',
  'spam',
  'other',
])

// ─── USERS ────────────────────────────────────────────────────────────────────
// NOTE: auth.users is managed by Supabase Auth.
// This table stores the additional profile data linked to the auth user.
export const users = pgTable(
  'users',
  {
    // Matches the UUID from Supabase auth.users
    id: uuid('id').primaryKey(),
    email: text('email').unique().notNull(),
    role: userRoleEnum('role').default('traveler').notNull(),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    phone: text('phone'),

    // Traveler profile
    bio: text('bio'),
    homeCity: text('home_city'),
    homeCountry: text('home_country'),
    languages: text('languages').array().default([]),
    interests: text('interests').array().default([]),
    travelStyle: text('travel_style'),
    profileCompleteness: integer('profile_completeness').default(0),

    // Verification
    isVerified: boolean('is_verified').default(false).notNull(),
    verificationStatus: verificationStatusEnum('verification_status')
      .default('unverified')
      .notNull(),

    // GDPR
    gdprConsentAt: timestamp('gdpr_consent_at', { withTimezone: true }),
    marketingConsent: boolean('marketing_consent').default(false).notNull(),
    dataDeleteRequestedAt: timestamp('data_delete_requested_at', { withTimezone: true }),

    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
    roleIdx: index('users_role_idx').on(t.role),
  })
)

// ─── CITIES ───────────────────────────────────────────────────────────────────
export const cities = pgTable(
  'cities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    country: text('country').notNull(),
    countryCode: text('country_code').notNull(), // ISO 3166-1 alpha-2 e.g. "DE"
    timezone: text('timezone').notNull(),         // e.g. "Europe/Berlin"
    flagEmoji: text('flag_emoji'),                // e.g. "🇩🇪"
    isActive: boolean('is_active').default(false).notNull(),
    // Denormalised for display — updated by DB trigger when host_profiles change
    hostCount: integer('host_count').default(0).notNull(),
    // Approximate center point for map display (stored as lat/lng for simplicity)
    centerLat: numeric('center_lat', { precision: 10, scale: 7 }),
    centerLng: numeric('center_lng', { precision: 10, scale: 7 }),
    ...timestamps,
  },
  (t) => ({
    activeIdx: index('cities_active_idx').on(t.isActive),
    countryIdx: index('cities_country_idx').on(t.countryCode),
  })
)

// ─── HOST PROFILES ────────────────────────────────────────────────────────────
export const hostProfiles = pgTable(
  'host_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(), // one profile per user
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id),

    // Profile content
    headline: text('headline'), // short tagline, e.g. "Berlin street food expert"
    bio: text('bio').notNull(),
    languages: text('languages').array().notNull().default([]),    // ['en','de','ar']
    categories: text('categories').array().notNull().default([]),  // ['food','art','nightlife']
    hostType: hostTypeEnum('host_type').default('any').notNull(),

    // Pricing (stored in cents to avoid floating point issues)
    hourlyRateCents: integer('hourly_rate_cents'),

    // Location (stored as separate columns, PostGIS extension optional)
    lat: numeric('lat', { precision: 10, scale: 7 }),
    lng: numeric('lng', { precision: 10, scale: 7 }),
    neighborhood: text('neighborhood'),

    // Availability — stored as JSONB for flexibility
    // Shape: { mon: ['09:00-12:00','14:00-18:00'], tue: [...], ... }
    availability: jsonb('availability'),

    // Calculated stats — updated by triggers / background jobs
    avgRating: numeric('avg_rating', { precision: 3, scale: 2 }),
    reviewCount: integer('review_count').default(0).notNull(),
    responseRate: numeric('response_rate', { precision: 5, scale: 2 }),
    responseTimeHours: numeric('response_time_hours', { precision: 5, scale: 2 }),

    // Tier
    isPremium: boolean('is_premium').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),

    // Cancellation & reliability tracking
    cancellationCount: integer('cancellation_count').default(0).notNull(),
    noShowCount: integer('no_show_count').default(0).notNull(),
    strikeCount: integer('strike_count').default(0).notNull(),
    strikesResetAt: timestamp('strikes_reset_at', { withTimezone: true }),
    payoutFrozenUntil: timestamp('payout_frozen_until', { withTimezone: true }),

    // ID verification (free, mandatory for hosts)
    idDocumentUrl: text('id_document_url'),             // storage path or URL of uploaded ID
    idDocumentType: text('id_document_type'),            // 'passport' | 'drivers_license' | 'national_id'
    idVerificationStatus: text('id_verification_status').default('not_submitted'), // 'not_submitted' | 'pending' | 'verified' | 'rejected'
    idVerifiedAt: timestamp('id_verified_at', { withTimezone: true }),
    idRejectionReason: text('id_rejection_reason'),

    // Intro video (optional, 30 sec max)
    introVideoUrl: text('intro_video_url'),

    // Moderation
    moderationStatus: moderationStatusEnum('moderation_status')
      .default('pending')
      .notNull(),
    moderationNotes: text('moderation_notes'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => users.id),

    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (t) => ({
    cityIdx: index('host_profiles_city_idx').on(t.cityId),
    userIdx: index('host_profiles_user_idx').on(t.userId),
    // Compound index for the most common search query:
    // "find active, approved hosts in city X, ordered by featured + rating"
    searchIdx: index('host_profiles_search_idx').on(
      t.cityId,
      t.isActive,
      t.moderationStatus,
      t.isFeatured,
      t.avgRating
    ),
    premiumIdx: index('host_profiles_premium_idx').on(t.isPremium),
  })
)

// ─── HOST PHOTOS ──────────────────────────────────────────────────────────────
export const hostPhotos = pgTable(
  'host_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostId: uuid('host_id')
      .notNull()
      .references(() => hostProfiles.id, { onDelete: 'cascade' }),
    // Path in Supabase Storage, e.g. "host-photos/[host_id]/photo-1.webp"
    storagePath: text('storage_path').notNull(),
    // Public CDN URL (set after upload)
    publicUrl: text('public_url'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    // Free tier: max 3 photos. Premium: unlimited. Enforced at API layer.
    ...timestamps,
  },
  (t) => ({
    hostIdx: index('host_photos_host_idx').on(t.hostId),
  })
)

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Stripe references
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),

    plan: subscriptionPlanEnum('plan').notNull(),
    status: subscriptionStatusEnum('status').notNull(),

    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    // Price paid (in cents) — for audit/revenue reporting
    amountCents: integer('amount_cents'),
    currency: text('currency').default('eur').notNull(),

    ...timestamps,
  },
  (t) => ({
    // The most important index — checked on EVERY protected route
    userStatusIdx: index('subscriptions_user_status_idx').on(
      t.userId,
      t.status,
      t.currentPeriodEnd
    ),
    stripeSubIdx: index('subscriptions_stripe_sub_idx').on(t.stripeSubscriptionId),
    stripeCustomerIdx: index('subscriptions_stripe_customer_idx').on(t.stripeCustomerId),
  })
)

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────
// Created when a subscribed traveler unlocks a host
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    travelerId: uuid('traveler_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Which subscription was active when unlocked — for audit trail
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
    // Which trip request started this conversation (nullable — not all convos come from trips)
    tripRequestId: uuid('trip_request_id').references(() => tripRequests.id),

    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),

    // Soft delete — conversations are never hard-deleted (legal audit trail)
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (t) => ({
    // Prevent duplicate conversations between same pair
    uniquePair: uniqueIndex('conversations_unique_pair').on(t.travelerId, t.hostId),
    travelerIdx: index('conversations_traveler_idx').on(t.travelerId),
    hostIdx: index('conversations_host_idx').on(t.hostId),
    lastMsgIdx: index('conversations_last_msg_idx').on(t.lastMessageAt),
  })
)

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Content is stored plaintext here.
    // For production Phase 2: add column-level encryption via Supabase Vault.
    content: text('content').notNull(),

    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),

    // Soft delete — messages are never hard-deleted
    isDeleted: boolean('is_deleted').default(false).notNull(),
    ...timestamps,
  },
  (t) => ({
    // Primary query: "get all messages for conversation X, newest first"
    convMsgIdx: index('messages_conv_msg_idx').on(t.conversationId, t.createdAt),
    senderIdx: index('messages_sender_idx').on(t.senderId),
    unreadIdx: index('messages_unread_idx').on(t.conversationId, t.isRead),
  })
)

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
// Bidirectional: travelers review hosts, hosts review travelers
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // The user leaving the review
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // The user being reviewed
    revieweeId: uuid('reviewee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Which meetup this review is about — enforces "must have talked" rule
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),

    rating: integer('rating').notNull(), // 1–5
    body: text('body'),

    isVisible: boolean('is_visible').default(true).notNull(),
    moderationStatus: moderationStatusEnum('moderation_status')
      .default('approved')
      .notNull(),
    ...timestamps,
  },
  (t) => ({
    // One review per direction per conversation
    uniqueReview: uniqueIndex('reviews_unique_review').on(
      t.reviewerId,
      t.conversationId
    ),
    revieweeIdx: index('reviews_reviewee_idx').on(t.revieweeId, t.isVisible),
    convIdx: index('reviews_conv_idx').on(t.conversationId),
  })
)

// ─── WISHLISTS ────────────────────────────────────────────────────────────────
export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hostId: uuid('host_id')
      .notNull()
      .references(() => hostProfiles.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => ({
    uniqueWishlist: uniqueIndex('wishlists_unique').on(t.userId, t.hostId),
    userIdx: index('wishlists_user_idx').on(t.userId),
  })
)

// ─── REPORTS ──────────────────────────────────────────────────────────────────
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedUserId: uuid('reported_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: reportReasonEnum('reason').notNull(),
    description: text('description'),
    status: text('status').default('pending').notNull(), // pending | reviewed | resolved
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    statusIdx: index('reports_status_idx').on(t.status),
    reportedIdx: index('reports_reported_idx').on(t.reportedUserId),
  })
)

// ─── TRIP REQUESTS ────────────────────────────────────────────────────────────
// Travelers post upcoming trips — hosts browse and respond
export const tripRequestStatusEnum = pgEnum('trip_request_status', ['open', 'matched', 'expired', 'cancelled'])

export const tripRequests = pgTable(
  'trip_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    travelerId: uuid('traveler_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cityId: uuid('city_id')
      .notNull()
      .references(() => cities.id),

    arrivalDate: timestamp('arrival_date', { withTimezone: true }).notNull(),
    departureDate: timestamp('departure_date', { withTimezone: true }).notNull(),
    numTravelers: integer('num_travelers').default(1).notNull(),
    categories: text('categories').array().notNull().default([]),       // ['food-drink','history']
    hostTypePreference: hostTypeEnum('host_type_preference').default('any'),
    noteToHosts: text('note_to_hosts'),                                 // optional, max 200 chars
    budgetRange: text('budget_range'),                                  // e.g. "€50–€100 total"

    status: tripRequestStatusEnum('status').default('open').notNull(),
    hostResponsesCount: integer('host_responses_count').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isVisible: boolean('is_visible').default(true).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    travelerIdx: index('trip_requests_traveler_idx').on(t.travelerId),
    cityIdx: index('trip_requests_city_idx').on(t.cityId),
    statusIdx: index('trip_requests_status_idx').on(t.status),
    searchIdx: index('trip_requests_search_idx').on(t.cityId, t.status, t.arrivalDate),
  })
)

// ─── TRIP HOST RESPONSES ──────────────────────────────────────────────────────
// Hosts respond to a traveler's trip request
export const tripHostResponseStatusEnum = pgEnum('trip_host_response_status', [
  'pending', 'accepted', 'declined',
])

export const tripHostResponses = pgTable(
  'trip_host_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => tripRequests.id, { onDelete: 'cascade' }),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    message: text('message'),               // optional intro message from host
    status: tripHostResponseStatusEnum('status').default('pending').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueResponse: index('trip_host_responses_unique_idx').on(t.tripId, t.hostId),
    tripIdx: index('trip_host_responses_trip_idx').on(t.tripId),
    hostIdx: index('trip_host_responses_host_idx').on(t.hostId),
  })
)

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
// Created when a subscribed traveler books a paid session with a host
export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',    // traveler confirmed, waiting for host to accept
  'accepted',   // host accepted
  'declined',   // host declined
  'completed',  // session happened, payment captured
  'cancelled',  // cancelled by either party
  'disputed',   // no-show reported, under review
  'refunded',   // refund issued after dispute
])

export const cancellationTypeEnum = pgEnum('cancellation_type', [
  'traveler',       // traveler cancelled
  'host',           // host cancelled
  'extenuating',    // extenuating circumstances (either side)
  'no_show_host',   // host no-show
  'no_show_traveler', // traveler no-show
  'auto_declined',  // host didn't respond in 48h
])

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    travelerId: uuid('traveler_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id),

    // Session details
    sessionDate: timestamp('session_date', { withTimezone: true }),
    durationHours: integer('duration_hours').default(1).notNull(),
    noteFromTraveler: text('note_from_traveler'),

    // Financials (all in cents)
    sessionRateCents: integer('session_rate_cents').notNull(),      // host's rate
    serviceFeePercent: integer('service_fee_percent').default(5).notNull(),   // % charged to traveler on top
    platformCommissionPercent: integer('platform_commission_percent').default(15).notNull(), // % kept from host
    travelerTotalCents: integer('traveler_total_cents').notNull(),  // what traveler pays (rate + service fee)
    hostPayoutCents: integer('host_payout_cents').notNull(),        // what host receives (rate - commission)
    platformFeeCents: integer('platform_fee_cents').notNull(),      // platform keeps this

    status: bookingStatusEnum('status').default('pending').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledBy: uuid('cancelled_by').references(() => users.id),

    // Cancellation details
    cancellationType: cancellationTypeEnum('cancellation_type'),
    cancellationReason: text('cancellation_reason'),
    refundPercent: integer('refund_percent'),          // 0, 50, or 100
    refundAmountCents: integer('refund_amount_cents'), // actual refund in cents
    platformCreditCents: integer('platform_credit_cents').default(0), // credit issued to traveler

    // No-show / dispute
    noShowReportedAt: timestamp('no_show_reported_at', { withTimezone: true }),
    noShowReportedBy: uuid('no_show_reported_by').references(() => users.id),
    disputeResolvedAt: timestamp('dispute_resolved_at', { withTimezone: true }),
    disputeResolvedBy: uuid('dispute_resolved_by').references(() => users.id),
    disputeNotes: text('dispute_notes'),

    // Rescheduling
    rescheduleCount: integer('reschedule_count').default(0).notNull(),
    originalSessionDate: timestamp('original_session_date', { withTimezone: true }),

    ...timestamps,
  },
  (t) => ({
    travelerIdx: index('bookings_traveler_idx').on(t.travelerId),
    hostIdx: index('bookings_host_idx').on(t.hostId),
    statusIdx: index('bookings_status_idx').on(t.status),
  })
)

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────
export const notificationTypeEnum = pgEnum('notification_type', [
  'new_message',
  'trip_response',
  'review_received',
  'subscription_expiring',
  'host_approved',
  'host_rejected',
  'system',
])

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    resourceType: text('resource_type'),  // 'conversation' | 'trip' | 'review' | 'subscription'
    resourceId: text('resource_id'),
    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    userUnreadIdx: index('notifications_user_unread_idx').on(t.userId, t.isRead, t.createdAt),
    userIdx: index('notifications_user_idx').on(t.userId),
  })
)

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
// Required for GDPR — tracks every significant data change
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    action: text('action').notNull(), // e.g. 'host.profile.updated', 'subscription.created'
    tableName: text('table_name'),
    recordId: uuid('record_id'),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    // Stored as hashed value after 7 days (GDPR)
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => ({
    userIdx: index('audit_logs_user_idx').on(t.userId),
    actionIdx: index('audit_logs_action_idx').on(t.action),
    tableIdx: index('audit_logs_table_idx').on(t.tableName, t.recordId),
  })
)

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  hostProfile: one(hostProfiles, {
    fields: [users.id],
    references: [hostProfiles.userId],
  }),
  subscriptions: many(subscriptions),
  travellerConversations: many(conversations, { relationName: 'traveler' }),
  hostConversations: many(conversations, { relationName: 'host' }),
  wishlists: many(wishlists),
  reviewsGiven: many(reviews, { relationName: 'reviewer' }),
  reviewsReceived: many(reviews, { relationName: 'reviewee' }),
}))

export const hostProfilesRelations = relations(hostProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [hostProfiles.userId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [hostProfiles.cityId],
    references: [cities.id],
  }),
  photos: many(hostPhotos),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  traveler: one(users, {
    fields: [conversations.travelerId],
    references: [users.id],
    relationName: 'traveler',
  }),
  host: one(users, {
    fields: [conversations.hostId],
    references: [users.id],
    relationName: 'host',
  }),
  messages: many(messages),
  reviews: many(reviews),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

// ─── TYPE EXPORTS ─────────────────────────────────────────────────────────────
// These give you fully typed row objects throughout the app

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type City = typeof cities.$inferSelect
export type HostProfile = typeof hostProfiles.$inferSelect
export type NewHostProfile = typeof hostProfiles.$inferInsert
export type HostPhoto = typeof hostPhotos.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Review = typeof reviews.$inferSelect
export type Wishlist = typeof wishlists.$inferSelect
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type TripRequest = typeof tripRequests.$inferSelect
export type NewTripRequest = typeof tripRequests.$inferInsert
export type TripHostResponse = typeof tripHostResponses.$inferSelect
export type NewTripHostResponse = typeof tripHostResponses.$inferInsert
export type Booking = typeof bookings.$inferSelect
export type NewBooking = typeof bookings.$inferInsert
