/**
 * Mock in-memory database — replaces Supabase + Postgres in local dev.
 *
 * Uses simple JavaScript Maps and arrays.
 * Data resets on every server restart (that's fine for local dev).
 * Seeded with realistic sample data so the UI is immediately useful.
 */

import { nanoid } from 'nanoid'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface MockUser {
  id: string
  email: string
  password: string   // plain text in mock only — never do this in production
  role: 'traveler' | 'host' | 'admin'
  fullName: string
  avatarUrl: string | null
  bio: string | null
  homeCity: string | null
  homeCountry: string | null
  languages: string[]
  interests: string[]
  travelStyle: string | null
  profileCompleteness: number
  createdAt: string
}

export interface MockCity {
  id: string
  name: string
  country: string
  countryCode: string
  flagEmoji: string
  isActive: boolean
  hostCount: number
  timezone: string
}

export interface MockHostProfile {
  id: string
  userId: string
  cityId: string
  headline: string
  bio: string
  languages: string[]
  categories: string[]
  hostType: string
  hourlyRateCents: number
  neighborhood: string
  avgRating: string
  reviewCount: number
  isPremium: boolean
  isFeatured: boolean
  moderationStatus: 'pending' | 'approved' | 'rejected'
  isActive: boolean
  primaryPhotoUrl: string | null
  idDocumentUrl: string | null
  idDocumentType: string | null
  idVerificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected'
  idVerifiedAt: string | null
  idRejectionReason: string | null
  introVideoUrl: string | null
  strikeCount: number
  cancellationCount: number
  noShowCount: number
  payoutFrozenUntil: string | null
  createdAt: string
}

export interface MockSubscription {
  id: string
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: 'day' | 'week' | 'month' | 'annual'
  status: 'active' | 'past_due' | 'cancelled'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
}

export interface MockConversation {
  id: string
  travelerId: string
  hostId: string
  subscriptionId: string | null
  tripRequestId?: string | null
  unlockedAt: string
  lastMessageAt: string | null
}

export interface MockMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  isRead: boolean
  createdAt: string
}

export interface MockReview {
  id: string
  reviewerId: string
  revieweeId: string
  conversationId: string
  rating: number
  body: string | null
  createdAt: string
}

export interface MockTripRequest {
  id: string
  travelerId: string
  cityId: string
  arrivalDate: string
  departureDate: string
  numTravelers: number
  categories: string[]
  hostTypePreference: string
  noteToHosts: string | null
  budgetRange: string | null
  status: 'open' | 'matched' | 'expired' | 'cancelled'
  hostResponsesCount: number
  expiresAt: string | null
  isVisible: boolean
  createdAt: string
}

export interface MockTripHostResponse {
  id: string
  tripId: string
  hostId: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface MockBooking {
  id: string
  travelerId: string
  hostId: string
  conversationId: string | null
  sessionDate: string | null
  durationHours: number
  noteFromTraveler: string | null
  sessionRateCents: number
  serviceFeePercent: number
  platformCommissionPercent: number
  travelerTotalCents: number
  hostPayoutCents: number
  platformFeeCents: number
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'disputed' | 'refunded'
  // Cancellation fields
  cancellationType: string | null
  cancellationReason: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  refundPercent: number | null
  refundAmountCents: number | null
  platformCreditCents: number
  // Reschedule
  rescheduleCount: number
  originalSessionDate: string | null
  // No-show / dispute
  noShowReportedAt: string | null
  noShowReportedBy: string | null
  createdAt: string
}

export interface MockHostPhoto {
  id: string
  hostId: string        // host_profiles.id
  publicUrl: string
  isPrimary: boolean
  displayOrder: number
  createdAt: string
}

export interface MockNotification {
  id: string
  userId: string
  type: 'new_message' | 'trip_response' | 'review_received' | 'subscription_expiring' | 'host_approved' | 'host_rejected' | 'system'
  title: string
  body: string | null
  resourceType: string | null
  resourceId: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function computeCompleteness(user: MockUser): number {
  let score = 0
  if (user.avatarUrl) score += 30
  if (user.fullName && user.fullName.trim().length > 1) score += 20
  if (user.bio && user.bio.trim().length > 20) score += 20
  if (user.homeCity) score += 10
  if (user.languages && user.languages.length > 0) score += 10
  if (user.interests && user.interests.length > 0) score += 10
  return score
}

// ─── IN-MEMORY STORE ─────────────────────────────────────────────────────────

class MockDatabase {
  users: Map<string, MockUser> = new Map()
  cities: Map<string, MockCity> = new Map()
  hostProfiles: Map<string, MockHostProfile> = new Map()
  subscriptions: Map<string, MockSubscription> = new Map()
  conversations: Map<string, MockConversation> = new Map()
  messages: Map<string, MockMessage> = new Map()
  reviews: Map<string, MockReview> = new Map()
  wishlists: Map<string, { userId: string; hostId: string }> = new Map()
  tripRequests: Map<string, MockTripRequest> = new Map()
  tripHostResponses: Map<string, MockTripHostResponse> = new Map()
  notifications: Map<string, MockNotification> = new Map()
  bookings: Map<string, MockBooking> = new Map()
  hostPhotos: Map<string, MockHostPhoto> = new Map()

  // Session store: sessionToken → userId
  sessions: Map<string, string> = new Map()

  constructor() {
    this.seed()
  }

  seed() {
    // ── Cities ──────────────────────────────────────────────────────────────
    const cityData: MockCity[] = [
      { id: 'city-berlin',     name: 'Berlin',     country: 'Germany',        countryCode: 'DE', flagEmoji: '🇩🇪', isActive: true,  hostCount: 4,  timezone: 'Europe/Berlin' },
      { id: 'city-lisbon',     name: 'Lisbon',     country: 'Portugal',       countryCode: 'PT', flagEmoji: '🇵🇹', isActive: true,  hostCount: 2,  timezone: 'Europe/Lisbon' },
      { id: 'city-amsterdam',  name: 'Amsterdam',  country: 'Netherlands',    countryCode: 'NL', flagEmoji: '🇳🇱', isActive: true,  hostCount: 2,  timezone: 'Europe/Amsterdam' },
      { id: 'city-barcelona',  name: 'Barcelona',  country: 'Spain',          countryCode: 'ES', flagEmoji: '🇪🇸', isActive: true,  hostCount: 2,  timezone: 'Europe/Madrid' },
      { id: 'city-munich',     name: 'Munich',     country: 'Germany',        countryCode: 'DE', flagEmoji: '🇩🇪', isActive: true,  hostCount: 1,  timezone: 'Europe/Berlin' },
      { id: 'city-vienna',     name: 'Vienna',     country: 'Austria',        countryCode: 'AT', flagEmoji: '🇦🇹', isActive: true,  hostCount: 1,  timezone: 'Europe/Vienna' },
      { id: 'city-prague',     name: 'Prague',     country: 'Czech Republic', countryCode: 'CZ', flagEmoji: '🇨🇿', isActive: true,  hostCount: 1,  timezone: 'Europe/Prague' },
      { id: 'city-rome',       name: 'Rome',       country: 'Italy',          countryCode: 'IT', flagEmoji: '🇮🇹', isActive: true,  hostCount: 1,  timezone: 'Europe/Rome' },
      { id: 'city-hamburg',    name: 'Hamburg',    country: 'Germany',        countryCode: 'DE', flagEmoji: '🇩🇪', isActive: true,  hostCount: 1,  timezone: 'Europe/Berlin' },
      { id: 'city-cologne',    name: 'Cologne',    country: 'Germany',        countryCode: 'DE', flagEmoji: '🇩🇪', isActive: true,  hostCount: 1,  timezone: 'Europe/Berlin' },
      { id: 'city-frankfurt',  name: 'Frankfurt',  country: 'Germany',        countryCode: 'DE', flagEmoji: '🇩🇪', isActive: true,  hostCount: 1,  timezone: 'Europe/Berlin' },
      { id: 'city-dusseldorf', name: 'Düsseldorf', country: 'Germany',        countryCode: 'DE', flagEmoji: '🇩🇪', isActive: true,  hostCount: 1,  timezone: 'Europe/Berlin' },
      { id: 'city-stuttgart',  name: 'Stuttgart',  country: 'Germany',        countryCode: 'DE', flagEmoji: '🇩🇪', isActive: true,  hostCount: 1,  timezone: 'Europe/Berlin' },
    ]
    cityData.forEach(c => this.cities.set(c.id, c))

    // ── Demo users ───────────────────────────────────────────────────────────
    const demoTraveler: MockUser = {
      id: 'user-traveler-demo',
      email: 'traveler@demo.com',
      password: 'demo1234',
      role: 'traveler',
      fullName: 'Alex Demo',
      avatarUrl: null,
      bio: 'Curious traveler from London. I love exploring cities through food, street art, and conversations with locals. Always looking for the places that don\'t show up on Google Maps.',
      homeCity: 'London',
      homeCountry: 'United Kingdom',
      languages: ['en', 'fr'],
      interests: ['food-drink', 'art-culture', 'nightlife'],
      travelStyle: 'solo',
      profileCompleteness: 70,
      createdAt: new Date().toISOString(),
    }
    const demoHost: MockUser = {
      id: 'user-host-demo',
      email: 'host@demo.com',
      password: 'demo1234',
      role: 'host',
      fullName: 'Amira Khalil',
      avatarUrl: null,
      bio: null,
      homeCity: null,
      homeCountry: null,
      languages: [],
      interests: [],
      travelStyle: null,
      profileCompleteness: 0,
      createdAt: new Date().toISOString(),
    }
    this.users.set(demoTraveler.id, demoTraveler)
    this.users.set(demoHost.id, demoHost)

    // ── Host profiles ─────────────────────────────────────────────────────
    const profiles: MockHostProfile[] = [
      {
        id: 'host-1', userId: 'user-host-demo', cityId: 'city-berlin',
        headline: 'Berlin street food expert & nightlife guide',
        bio: 'Born in Lebanon, living in Berlin for 12 years. I know every hidden bar in Neukölln, the best döner no tourist has found, and the street art that changes every week. I speak 5 languages and love showing curious travelers the Berlin that doesn\'t appear in guidebooks.',
        languages: ['en', 'de', 'ar', 'fr', 'tr'], categories: ['food-drink', 'art-culture', 'nightlife'],
        hostType: 'female', hourlyRateCents: 2500, neighborhood: 'Neukölln',
        avgRating: '4.98', reviewCount: 143, isPremium: true, isFeatured: true,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-2', userId: 'user-host-2', cityId: 'city-berlin',
        headline: 'Photographer & urban explorer in Berlin-Mitte',
        bio: 'I\'ve photographed Berlin for 8 years. Every alley, rooftop, and forgotten courtyard. I\'ll take you through the city with a photographer\'s eye — seeing light, texture, and stories where other tourists see monuments.',
        languages: ['en', 'de', 'ru'], categories: ['art-culture', 'history', 'nature'],
        hostType: 'male', hourlyRateCents: 3000, neighborhood: 'Mitte',
        avgRating: '4.85', reviewCount: 67, isPremium: false, isFeatured: true,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-3', userId: 'user-host-3', cityId: 'city-lisbon',
        headline: 'Alfama local — Fado, food and hidden viewpoints',
        bio: 'Born and raised in Alfama. My grandfather was a Fado singer. I\'ll show you the Lisbon that exists beneath the tourist surface — the real tascas, the old neighbourhood stories, the viewpoints locals actually go to. Ask me about the best pastel de nata in the city.',
        languages: ['en', 'pt', 'es'], categories: ['food-drink', 'history', 'art-culture'],
        hostType: 'male', hourlyRateCents: 3000, neighborhood: 'Alfama',
        avgRating: '4.96', reviewCount: 98, isPremium: true, isFeatured: true,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-4', userId: 'user-host-4', cityId: 'city-amsterdam',
        headline: 'I cycle 40km/day — Amsterdam by wheel',
        bio: 'I cycle 40km every day and know Amsterdam by wheel. Canal houses not in any guide, markets locals actually shop at, galleries showing the next generation of artists. I\'ll take you to a brown café that\'s been open since 1786 and hasn\'t changed.',
        languages: ['en', 'nl', 'jp'], categories: ['nature', 'art-culture', 'food-drink'],
        hostType: 'female', hourlyRateCents: 2200, neighborhood: 'Jordaan',
        avgRating: '5.0', reviewCount: 211, isPremium: true, isFeatured: true,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-5', userId: 'user-host-5', cityId: 'city-barcelona',
        headline: 'Barcelona local for 28 years — the real city',
        bio: 'Barcelona local for 28 years. I\'ll show you the tapas bar my family has eaten at for 3 generations, the Gaudí building nobody visits, and where locals actually swim in summer. I hate tourist Barcelona as much as you do — let\'s find the real one.',
        languages: ['en', 'es', 'ca', 'it'], categories: ['food-drink', 'history', 'art-culture'],
        hostType: 'female', hourlyRateCents: 2800, neighborhood: 'Gràcia',
        avgRating: '4.97', reviewCount: 76, isPremium: false, isFeatured: false,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-6', userId: 'user-host-6', cityId: 'city-berlin',
        headline: 'Berlin jazz scene & underground music guide',
        bio: 'I play saxophone in three bands and know every venue from tiny jazz clubs to legendary clubs. I\'ll take you to a concert that will change your relationship with music. Monday night jam sessions, Thursday vinyl listening parties, weekend warehouse shows.',
        languages: ['en', 'de', 'fr'], categories: ['nightlife', 'art-culture', 'music'],
        hostType: 'male', hourlyRateCents: 2000, neighborhood: 'Friedrichshain',
        avgRating: '4.91', reviewCount: 44, isPremium: false, isFeatured: false,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-7', userId: 'user-host-7', cityId: 'city-hamburg',
        headline: 'Hamburg harbour local — fish markets, Reeperbahn & the real port city',
        bio: 'Born 200 metres from the Elbe. Hamburg is a port city first — gritty, unpretentious, proud. I\'ll take you to the Fischmarkt at 5am when the real action happens, show you the warehouse district that became the coolest neighbourhood in Germany, and explain why Hamburg has the best live music scene outside London.',
        languages: ['en', 'de', 'da'], categories: ['nightlife', 'history', 'food-drink'],
        hostType: 'male', hourlyRateCents: 2800, neighborhood: 'Altona',
        avgRating: '4.93', reviewCount: 41, isPremium: false, isFeatured: true,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1560250097-0dc05329d0ea?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-8', userId: 'user-host-8', cityId: 'city-cologne',
        headline: 'Cologne local — the cathedral, Kölsch culture & hidden Altstadt gems',
        bio: 'Born in Cologne, never left. This city has the friendliest people in Germany and the best beer — Kölsch, served in tiny 200ml glasses by waiters who replace them before you even ask. I\'ll show you the Roman history, the view from across the Rhine, and jazz bars in the Altstadt that have been playing since the 1950s.',
        languages: ['en', 'de', 'nl'], categories: ['history', 'food-drink', 'art-culture'],
        hostType: 'female', hourlyRateCents: 2400, neighborhood: 'Altstadt',
        avgRating: '4.91', reviewCount: 33, isPremium: false, isFeatured: false,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-9', userId: 'user-host-9', cityId: 'city-frankfurt',
        headline: 'Frankfurt — beyond the banks: cider houses & Sachsenhausen nights',
        bio: 'Everyone thinks Frankfurt is just banks and the airport. They are wrong. The Sachsenhausen district alone is worth a trip — cobblestone streets, apple wine taverns unchanged since 1890, and a contemporary art museum that would fit in New York. I work in finance but live for the local side of Frankfurt.',
        languages: ['en', 'de', 'fr'], categories: ['food-drink', 'art-culture', 'nightlife'],
        hostType: 'male', hourlyRateCents: 3000, neighborhood: 'Sachsenhausen',
        avgRating: '4.88', reviewCount: 22, isPremium: false, isFeatured: false,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-10', userId: 'user-host-10', cityId: 'city-dusseldorf',
        headline: 'Düsseldorf fashion & art — the Rhine city nobody expects to love',
        bio: 'Düsseldorf is Germany\'s secret fashion capital and one of the best art cities in Europe. I\'m a fashion designer and know every concept store, gallery opening, and rooftop bar. The Altstadt has 300 bars in one square kilometre — they call it the longest bar in the world. Come for a day and you\'ll book a longer trip.',
        languages: ['en', 'de', 'ja'], categories: ['art-culture', 'nightlife', 'food-drink'],
        hostType: 'female', hourlyRateCents: 2600, neighborhood: 'Altstadt',
        avgRating: '4.96', reviewCount: 18, isPremium: false, isFeatured: false,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'host-11', userId: 'user-host-11', cityId: 'city-stuttgart',
        headline: 'Stuttgart — Porsche, Swabian food & vineyards you can walk to',
        bio: 'Stuttgart sits in a valley surrounded by vineyards — the only major German city where you can walk from the city centre into a working vineyard in 20 minutes. I know the Swabian food culture deeply: Maultaschen, Spätzle, wine taverns pouring local wine since the 1800s. And yes, I can get you into the Porsche Museum.',
        languages: ['en', 'de', 'sv'], categories: ['food-drink', 'nature', 'art-culture'],
        hostType: 'couple', hourlyRateCents: 2200, neighborhood: 'Stuttgarter Mitte',
        avgRating: '4.90', reviewCount: 14, isPremium: false, isFeatured: false,
        moderationStatus: 'approved', isActive: true, idDocumentUrl: null, idDocumentType: null, idVerificationStatus: 'verified' as const, idVerifiedAt: new Date().toISOString(), idRejectionReason: null, introVideoUrl: null, strikeCount: 0, cancellationCount: 0, noShowCount: 0, payoutFrozenUntil: null,
        primaryPhotoUrl: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=400&h=300&fit=crop',
        createdAt: new Date().toISOString(),
      },
    ]

    // Create user records for seeded hosts
    const hostUsers = [
      { id: 'user-host-2',  email: 'berlin2@demo.com',     fullName: 'Lars Bauer' },
      { id: 'user-host-3',  email: 'lisbon@demo.com',       fullName: 'Marco Vasquez' },
      { id: 'user-host-4',  email: 'amsterdam@demo.com',    fullName: 'Yuki Tanaka' },
      { id: 'user-host-5',  email: 'barcelona@demo.com',    fullName: 'Sofia Reyes' },
      { id: 'user-host-6',  email: 'berlin3@demo.com',      fullName: 'Jonas Klein' },
      { id: 'user-host-7',  email: 'hamburg@demo.com',      fullName: 'Jan Bremer' },
      { id: 'user-host-8',  email: 'cologne@demo.com',      fullName: 'Petra Hoffmann' },
      { id: 'user-host-9',  email: 'frankfurt@demo.com',    fullName: 'Thomas Becker' },
      { id: 'user-host-10', email: 'dusseldorf@demo.com',   fullName: 'Nina Schreiber' },
      { id: 'user-host-11', email: 'stuttgart@demo.com',    fullName: 'Erik & Laura Stein' },
    ]
    hostUsers.forEach(u => this.users.set(u.id, { ...u, password: 'demo1234', role: 'host', avatarUrl: null, bio: null, homeCity: null, homeCountry: null, languages: [], interests: [], travelStyle: null, profileCompleteness: 0, createdAt: new Date().toISOString() }))
    profiles.forEach(p => this.hostProfiles.set(p.id, p))

    // ── Host photos (gallery, 2-4 per host) ───────────────────────────────
    const hostPhotoSeed: MockHostPhoto[] = [
      // host-1 (Berlin street food — Amira)
      { id: 'photo-1a', hostId: 'host-1', publicUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-1b', hostId: 'host-1', publicUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 1, createdAt: new Date().toISOString() },
      { id: 'photo-1c', hostId: 'host-1', publicUrl: 'https://images.unsplash.com/photo-1560439513-74b037a25d84?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 2, createdAt: new Date().toISOString() },
      // host-2 (Berlin photographer — Lars)
      { id: 'photo-2a', hostId: 'host-2', publicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-2b', hostId: 'host-2', publicUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 1, createdAt: new Date().toISOString() },
      { id: 'photo-2c', hostId: 'host-2', publicUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 2, createdAt: new Date().toISOString() },
      { id: 'photo-2d', hostId: 'host-2', publicUrl: 'https://images.unsplash.com/photo-1527866959252-deab85ef7d1b?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 3, createdAt: new Date().toISOString() },
      // host-3 (Lisbon — Marco)
      { id: 'photo-3a', hostId: 'host-3', publicUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-3b', hostId: 'host-3', publicUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 1, createdAt: new Date().toISOString() },
      { id: 'photo-3c', hostId: 'host-3', publicUrl: 'https://images.unsplash.com/photo-1513735492246-483525079186?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 2, createdAt: new Date().toISOString() },
      // host-4 (Amsterdam — Yuki)
      { id: 'photo-4a', hostId: 'host-4', publicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-4b', hostId: 'host-4', publicUrl: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 1, createdAt: new Date().toISOString() },
      { id: 'photo-4c', hostId: 'host-4', publicUrl: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 2, createdAt: new Date().toISOString() },
      // host-5 (Barcelona — Sofia)
      { id: 'photo-5a', hostId: 'host-5', publicUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-5b', hostId: 'host-5', publicUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop', isPrimary: false, displayOrder: 1, createdAt: new Date().toISOString() },
      // host-6 through host-11: primary photo only
      { id: 'photo-6a', hostId: 'host-6', publicUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-7a', hostId: 'host-7', publicUrl: 'https://images.unsplash.com/photo-1560250097-0dc05329d0ea?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-8a', hostId: 'host-8', publicUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-9a', hostId: 'host-9', publicUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-10a', hostId: 'host-10', publicUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
      { id: 'photo-11a', hostId: 'host-11', publicUrl: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=600&h=400&fit=crop', isPrimary: true, displayOrder: 0, createdAt: new Date().toISOString() },
    ]
    hostPhotoSeed.forEach(p => this.hostPhotos.set(p.id, p))

    // ── Sample reviews ─────────────────────────────────────────────────────
    const sampleReviews: MockReview[] = [
      { id: 'rev-1', reviewerId: 'user-traveler-demo', revieweeId: 'user-host-demo', conversationId: 'conv-seed-1', rating: 5, body: 'Amira showed me a Berlin I would never have found in ten trips. Rooftop bar not on any map, döner at 2am, street art tour. One of my best travel memories.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 'rev-2', reviewerId: 'user-r2', revieweeId: 'user-host-3', conversationId: 'conv-seed-2', rating: 5, body: 'Marco took us to a Fado restaurant his family has eaten at for decades. The owner sang for us personally. €6 subscription was the best money I spent the entire trip.', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
      { id: 'rev-3', reviewerId: 'user-r3', revieweeId: 'user-host-4', conversationId: 'conv-seed-3', rating: 5, body: 'Yuki cycled with us for 4 hours through neighbourhoods I didn\'t know existed. We saw the city through the eyes of someone who actually lives it.', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
    ]
    sampleReviews.forEach(r => this.reviews.set(r.id, r))

    // ── Trip request travelers ────────────────────────────────────────────
    const tripTravelers = [
      { id: 'user-sarah', email: 'sarah@demo.com', fullName: 'Sarah K.' },
      { id: 'user-james', email: 'james@demo.com', fullName: 'James T.' },
      { id: 'user-priya', email: 'priya@demo.com', fullName: 'Priya M.' },
    ]
    tripTravelers.forEach(u => this.users.set(u.id, { ...u, password: 'demo1234', role: 'traveler', avatarUrl: null, bio: null, homeCity: null, homeCountry: null, languages: [], interests: [], travelStyle: null, profileCompleteness: 0, createdAt: new Date().toISOString() }))

    // ── Seeded trip requests (match homepage ticker) ──────────────────────
    const seedTrips: MockTripRequest[] = [
      {
        id: 'trip-sarah-berlin',
        travelerId: 'user-sarah',
        cityId: 'city-berlin',
        arrivalDate: '2026-06-12T00:00:00.000Z',
        departureDate: '2026-06-16T00:00:00.000Z',
        numTravelers: 2,
        categories: ['food-drink', 'art-culture'],
        hostTypePreference: 'female',
        noteToHosts: 'Looking for authentic street food spots and hidden galleries in Neukölln or Kreuzberg!',
        budgetRange: null,
        status: 'open',
        hostResponsesCount: 3,
        expiresAt: '2026-06-12T00:00:00.000Z',
        isVisible: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'trip-james-lisbon',
        travelerId: 'user-james',
        cityId: 'city-lisbon',
        arrivalDate: '2026-06-20T00:00:00.000Z',
        departureDate: '2026-06-25T00:00:00.000Z',
        numTravelers: 1,
        categories: ['history', 'art-culture'],
        hostTypePreference: 'any',
        noteToHosts: 'Big Fado fan — would love someone who knows the real Fado scene beyond the tourist spots.',
        budgetRange: null,
        status: 'open',
        hostResponsesCount: 5,
        expiresAt: '2026-06-20T00:00:00.000Z',
        isVisible: true,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'trip-priya-amsterdam',
        travelerId: 'user-priya',
        cityId: 'city-amsterdam',
        arrivalDate: '2026-07-03T00:00:00.000Z',
        departureDate: '2026-07-07T00:00:00.000Z',
        numTravelers: 2,
        categories: ['nature', 'food-drink'],
        hostTypePreference: 'couple',
        noteToHosts: 'We love cycling and local markets — looking for a couple who can show us around!',
        budgetRange: null,
        status: 'open',
        hostResponsesCount: 2,
        expiresAt: '2026-07-03T00:00:00.000Z',
        isVisible: true,
        createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
      },
    ]
    seedTrips.forEach(t => this.tripRequests.set(t.id, t))

    // ── Demo traveler subscription (for testing conversation flow) ────
    const demoSub: MockSubscription = {
      id: 'sub-demo',
      userId: 'user-traveler-demo',
      stripeCustomerId: 'cus_mock_demo',
      stripeSubscriptionId: 'sub_mock_demo',
      plan: 'month',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
    }
    this.subscriptions.set(demoSub.id, demoSub)

    // ── Seed conversation + wishlists for demo traveler ─────────────────
    const seedConv: MockConversation = {
      id: 'conv-seed-1',
      travelerId: 'user-traveler-demo',
      hostId: 'user-host-demo',
      subscriptionId: 'sub-demo',
      unlockedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      lastMessageAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    }
    this.conversations.set(seedConv.id, seedConv)

    // Seed a couple of wishlist items for demo traveler
    this.wishlists.set('user-traveler-demo:host-3', { userId: 'user-traveler-demo', hostId: 'host-3' })
    this.wishlists.set('user-traveler-demo:host-5', { userId: 'user-traveler-demo', hostId: 'host-5' })

    console.log('🌱 Mock database seeded with sample data')
    console.log('   Demo accounts:')
    console.log('   Traveler → traveler@demo.com / demo1234')
    console.log('   Host     → host@demo.com / demo1234')
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getUserByEmail(email: string): MockUser | undefined {
    return Array.from(this.users.values()).find(u => u.email === email)
  }

  getUserById(id: string): MockUser | undefined {
    return this.users.get(id)
  }

  updateUser(userId: string, data: Partial<Pick<MockUser, 'fullName' | 'bio' | 'homeCity' | 'homeCountry' | 'languages' | 'interests' | 'travelStyle' | 'avatarUrl'>>): MockUser | undefined {
    const user = this.users.get(userId)
    if (!user) return undefined
    const updated = { ...user, ...data }
    updated.profileCompleteness = computeCompleteness(updated)
    this.users.set(userId, updated)
    return updated
  }

  updateUserPassword(userId: string, newPassword: string): boolean {
    const user = this.users.get(userId)
    if (!user) return false
    user.password = newPassword
    this.users.set(userId, user)
    return true
  }

  getHostProfileByUserId(userId: string): MockHostProfile | undefined {
    return Array.from(this.hostProfiles.values()).find(h => h.userId === userId)
  }

  getHostPhotos(hostProfileId: string): MockHostPhoto[] {
    return Array.from(this.hostPhotos.values())
      .filter(p => p.hostId === hostProfileId)
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }

  getActiveSubscription(userId: string): MockSubscription | undefined {
    return Array.from(this.subscriptions.values()).find(
      s => s.userId === userId && s.status === 'active' && new Date(s.currentPeriodEnd) > new Date()
    )
  }

  createBooking(data: Omit<MockBooking, 'id' | 'createdAt'>): MockBooking {
    const booking: MockBooking = {
      id: `booking-${nanoid(8)}`,
      ...data,
      createdAt: new Date().toISOString(),
    }
    this.bookings.set(booking.id, booking)
    return booking
  }

  updateBooking(id: string, patch: Partial<MockBooking>): MockBooking | null {
    const b = this.bookings.get(id)
    if (!b) return null
    const updated = { ...b, ...patch }
    this.bookings.set(id, updated)
    return updated
  }

  updateHostProfile(profileId: string, patch: Partial<MockHostProfile>): MockHostProfile | null {
    const profile = this.hostProfiles.get(profileId)
    if (!profile) return null
    Object.assign(profile, patch)
    this.hostProfiles.set(profileId, profile)
    return profile
  }

  applyStrikesToHost(hostUserId: string, strikes: number, payoutFreezeDays: number): void {
    const profile = this.getHostProfileByUserId(hostUserId)
    if (!profile) return
    profile.strikeCount = (profile.strikeCount ?? 0) + strikes
    profile.cancellationCount = (profile.cancellationCount ?? 0) + 1
    if (payoutFreezeDays > 0) {
      profile.payoutFrozenUntil = new Date(Date.now() + payoutFreezeDays * 86400000).toISOString()
    }
    this.hostProfiles.set(profile.id, profile)
  }

  getBookingsByTraveler(travelerId: string): MockBooking[] {
    return Array.from(this.bookings.values())
      .filter(b => b.travelerId === travelerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  getBookingsByHost(hostId: string): MockBooking[] {
    return Array.from(this.bookings.values())
      .filter(b => b.hostId === hostId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  createSession(userId: string): string {
    const token = nanoid(32)
    this.sessions.set(token, userId)
    return token
  }

  getUserBySession(token: string): MockUser | undefined {
    const userId = this.sessions.get(token)
    if (!userId) return undefined
    return this.users.get(userId)
  }

  searchHosts(filters: { cityId?: string; categories?: string[]; languages?: string[]; hostType?: string; minRateCents?: number; maxRateCents?: number; minRating?: number; q?: string; sort?: string; page: number; limit: number }) {
    let results = Array.from(this.hostProfiles.values()).filter(h => h.isActive && h.moderationStatus === 'approved')

    if (filters.cityId) results = results.filter(h => h.cityId === filters.cityId)
    if (filters.hostType && filters.hostType !== 'any') results = results.filter(h => h.hostType === filters.hostType)
    if (filters.categories?.length) results = results.filter(h => filters.categories!.some(c => h.categories.includes(c)))
    if (filters.languages?.length) results = results.filter(h => filters.languages!.some(l => h.languages.includes(l)))
    if (filters.minRateCents != null) results = results.filter(h => (h.hourlyRateCents ?? 0) >= filters.minRateCents!)
    if (filters.maxRateCents != null) results = results.filter(h => (h.hourlyRateCents ?? 0) <= filters.maxRateCents!)
    if (filters.minRating != null) results = results.filter(h => parseFloat(h.avgRating) >= filters.minRating!)
    if (filters.q) {
      const q = filters.q.toLowerCase()
      results = results.filter(h => {
        const user = this.users.get(h.userId)
        return h.bio.toLowerCase().includes(q) || h.headline.toLowerCase().includes(q) || user?.fullName?.toLowerCase().includes(q)
      })
    }

    // Sort
    if (filters.sort === 'rating') results.sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating))
    else if (filters.sort === 'newest') results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    else if (filters.sort === 'price_asc') results.sort((a, b) => (a.hourlyRateCents ?? 0) - (b.hourlyRateCents ?? 0))
    else if (filters.sort === 'price_desc') results.sort((a, b) => (b.hourlyRateCents ?? 0) - (a.hourlyRateCents ?? 0))
    else results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || parseFloat(b.avgRating) - parseFloat(a.avgRating))

    const total = results.length
    const offset = (filters.page - 1) * filters.limit
    const paginated = results.slice(offset, offset + filters.limit)

    return {
      hosts: paginated.map(h => {
        const user = this.users.get(h.userId)
        const city = this.cities.get(h.cityId)
        return {
          id: h.id, userId: h.userId, cityId: h.cityId,
          cityName: city?.name ?? '', flagEmoji: city?.flagEmoji ?? '',
          headline: h.headline, bio: h.bio, languages: h.languages,
          categories: h.categories, hostType: h.hostType,
          hourlyRateCents: h.hourlyRateCents, neighborhood: h.neighborhood,
          avgRating: h.avgRating, reviewCount: h.reviewCount,
          responseRate: '95', isPremium: h.isPremium, isFeatured: h.isFeatured,
          idVerificationStatus: h.idVerificationStatus,
          primaryPhotoUrl: h.primaryPhotoUrl,
          fullName: user?.fullName ?? null, avatarUrl: user?.avatarUrl ?? null,
        }
      }),
      total,
    }
  }

  createTripRequest(travelerId: string, data: {
    cityId: string; arrivalDate: string; departureDate: string
    numTravelers: number; categories: string[]
    hostTypePreference?: string; noteToHosts?: string; budgetRange?: string
  }): MockTripRequest {
    const expiresAt = new Date(data.arrivalDate).toISOString()
    const trip: MockTripRequest = {
      id: `trip-${nanoid(8)}`,
      travelerId,
      cityId: data.cityId,
      arrivalDate: data.arrivalDate,
      departureDate: data.departureDate,
      numTravelers: data.numTravelers,
      categories: data.categories,
      hostTypePreference: data.hostTypePreference ?? 'any',
      noteToHosts: data.noteToHosts ?? null,
      budgetRange: data.budgetRange ?? null,
      status: 'open',
      hostResponsesCount: 0,
      expiresAt,
      isVisible: true,
      createdAt: new Date().toISOString(),
    }
    this.tripRequests.set(trip.id, trip)
    return trip
  }

  createTripHostResponse(hostId: string, data: {
    tripId: string; message?: string
  }): MockTripHostResponse {
    const response: MockTripHostResponse = {
      id: `resp-${nanoid(8)}`,
      tripId: data.tripId,
      hostId,
      message: data.message ?? null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    this.tripHostResponses.set(response.id, response)
    const trip = this.tripRequests.get(data.tripId)
    if (trip) { trip.hostResponsesCount += 1; this.tripRequests.set(trip.id, trip) }
    return response
  }

  createNotification(data: {
    userId: string; type: MockNotification['type']; title: string
    body?: string; resourceType?: string; resourceId?: string
  }): MockNotification {
    const notif: MockNotification = {
      id: `notif-${nanoid(8)}`,
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      resourceType: data.resourceType ?? null,
      resourceId: data.resourceId ?? null,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    }
    this.notifications.set(notif.id, notif)
    return notif
  }

  getNotifications(userId: string): MockNotification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  markNotificationRead(id: string, userId: string): boolean {
    const notif = this.notifications.get(id)
    if (!notif || notif.userId !== userId) return false
    notif.isRead = true
    notif.readAt = new Date().toISOString()
    return true
  }

  markAllNotificationsRead(userId: string): number {
    let count = 0
    this.notifications.forEach(n => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true
        n.readAt = new Date().toISOString()
        count++
      }
    })
    return count
  }

  getUserData(userId: string) {
    const user = this.users.get(userId)
    if (!user) return null
    const hostProfile = this.getHostProfileByUserId(userId)
    const subs = Array.from(this.subscriptions.values()).filter(s => s.userId === userId)
    const convos = Array.from(this.conversations.values()).filter(c => c.travelerId === userId || c.hostId === userId)
    const msgs = Array.from(this.messages.values()).filter(m => m.senderId === userId)
    const revGiven = Array.from(this.reviews.values()).filter(r => r.reviewerId === userId)
    const revReceived = Array.from(this.reviews.values()).filter(r => r.revieweeId === userId)
    const trips = Array.from(this.tripRequests.values()).filter(t => t.travelerId === userId)
    const tripResps = Array.from(this.tripHostResponses.values()).filter(r => r.hostId === userId)
    const notifs = this.getNotifications(userId)
    return {
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName, createdAt: user.createdAt },
      hostProfile: hostProfile ?? null,
      subscriptions: subs,
      conversations: convos,
      messagesSent: msgs,
      reviewsGiven: revGiven,
      reviewsReceived: revReceived,
      tripRequests: trips,
      tripHostResponses: tripResps,
      notifications: notifs,
    }
  }

  deleteUserData(userId: string): boolean {
    const user = this.users.get(userId)
    if (!user) return false
    // Anonymize user data (GDPR: keep financial records, anonymize PII)
    user.email = `deleted-${userId}@anonymized.local`
    user.fullName = 'Deleted User'
    user.avatarUrl = null
    user.password = ''
    // Remove host profile
    const profile = this.getHostProfileByUserId(userId)
    if (profile) this.hostProfiles.delete(profile.id)
    // Remove wishlists
    Array.from(this.wishlists.entries()).forEach(([k, v]) => {
      if (v.userId === userId) this.wishlists.delete(k)
    })
    // Remove notifications
    Array.from(this.notifications.entries()).forEach(([k, v]) => {
      if (v.userId === userId) this.notifications.delete(k)
    })
    // Clear sessions
    Array.from(this.sessions.entries()).forEach(([k, v]) => {
      if (v === userId) this.sessions.delete(k)
    })
    // Keep conversations, messages, reviews, subscriptions for audit trail
    // but anonymize message content from this user
    this.messages.forEach(m => {
      if (m.senderId === userId) m.content = '[deleted]'
    })
    return true
  }

  createHostProfile(userId: string, data: {
    cityId: string; headline: string; bio: string; languages: string[]
    categories: string[]; hostType: string; hourlyRateCents?: number; neighborhood?: string
  }): MockHostProfile {
    const profile: MockHostProfile = {
      id: `host-${nanoid(8)}`,
      userId,
      cityId: data.cityId,
      headline: data.headline,
      bio: data.bio,
      languages: data.languages,
      categories: data.categories,
      hostType: data.hostType,
      hourlyRateCents: data.hourlyRateCents ?? 0,
      neighborhood: data.neighborhood ?? '',
      avgRating: '0',
      reviewCount: 0,
      isPremium: false,
      isFeatured: false,
      moderationStatus: 'pending',
      isActive: true,
      primaryPhotoUrl: null,
      idDocumentUrl: null,
      idDocumentType: null,
      idVerificationStatus: 'not_submitted',
      idVerifiedAt: null,
      idRejectionReason: null,
      introVideoUrl: null,
      strikeCount: 0,
      cancellationCount: 0,
      noShowCount: 0,
      payoutFrozenUntil: null,
      createdAt: new Date().toISOString(),
    }
    this.hostProfiles.set(profile.id, profile)
    return profile
  }
}

// Singleton — persists across hot-reloads in dev
const globalForMock = globalThis as unknown as { mockDb: MockDatabase }
export const mockDb = globalForMock.mockDb ?? new MockDatabase()
if (process.env.NODE_ENV !== 'production') globalForMock.mockDb = mockDb
