import { NextResponse } from 'next/server'

// Data endpoint — must run per-request, never prerendered at build time
// (the build sandbox has no DB connection).
export const dynamic = 'force-dynamic'

export interface FeaturedReview {
  id: string
  body: string
  rating: number
  reviewerName: string
  reviewerCity: string
  reviewerInitials: string
  reviewerGradient: string
}

const MOCK_FEATURED_REVIEWS: FeaturedReview[] = [
  {
    id: 'rev-1',
    body: 'Amira showed me a Berlin I would never have found in ten trips. Rooftop bar not on any map, döner at 2am, street art tour. One of my best travel memories.',
    rating: 5,
    reviewerName: 'Alex D.',
    reviewerCity: 'New York',
    reviewerInitials: 'AD',
    reviewerGradient: 'linear-gradient(135deg,#4A7A9E,#2A5A7E)',
  },
  {
    id: 'rev-2',
    body: 'Marco took us to a Fado restaurant his family has eaten at for decades. The owner sang for us personally. €6 subscription was the best money I spent the entire trip.',
    rating: 5,
    reviewerName: 'James M.',
    reviewerCity: 'Amsterdam',
    reviewerInitials: 'JM',
    reviewerGradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)',
  },
  {
    id: 'rev-3',
    body: "Yuki cycled with us for 4 hours through neighbourhoods I didn't know existed. We saw the city through the eyes of someone who actually lives it.",
    rating: 5,
    reviewerName: 'Priya S.',
    reviewerCity: 'London',
    reviewerInitials: 'PS',
    reviewerGradient: 'linear-gradient(135deg,#C55A28,#A64820)',
  },
  {
    id: 'rev-4',
    body: 'This changed how I travel. No tour guide comes close. Sofia knew every corner of Barcelona — the tapas bar hidden in a parking garage was unreal.',
    rating: 5,
    reviewerName: 'Tom R.',
    reviewerCity: 'Dublin',
    reviewerInitials: 'TR',
    reviewerGradient: 'linear-gradient(135deg,#2A7A4E,#1A5A3E)',
  },
]

export async function GET() {
  if (process.env.MOCK_MODE === 'true') {
    return NextResponse.json({ success: true, data: MOCK_FEATURED_REVIEWS })
  }

  // Production: pull top rated visible reviews with reviewer info
  try {
    const { db } = await import('@/lib/db')
    const { reviews, users } = await import('@/lib/db/schema')
    const { eq, and, isNotNull, desc } = await import('drizzle-orm')

    const rows = await db
      .select({
        id: reviews.id,
        body: reviews.body,
        rating: reviews.rating,
        fullName: users.fullName,
        homeCity: users.homeCity,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .where(
        and(
          eq(reviews.rating, 5),
          eq(reviews.isVisible, true),
          eq(reviews.moderationStatus, 'approved'),
          isNotNull(reviews.body),
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(5)

    const GRADIENTS = [
      'linear-gradient(135deg,#4A7A9E,#2A5A7E)',
      'linear-gradient(135deg,#7C3AED,#5B21B6)',
      'linear-gradient(135deg,#C55A28,#A64820)',
      'linear-gradient(135deg,#2A7A4E,#1A5A3E)',
      'linear-gradient(135deg,#B45309,#92400E)',
    ]

    const data: FeaturedReview[] = rows.map((r, i) => {
      const name = r.fullName ?? 'Traveler'
      const parts = name.trim().split(' ')
      const initials = parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase()
      // Abbreviate last name for privacy: "James Morrison" → "James M."
      const displayName = parts.length >= 2
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : parts[0]

      return {
        id: r.id,
        body: r.body ?? '',
        rating: r.rating,
        reviewerName: displayName,
        reviewerCity: r.homeCity ?? 'Verified traveler',
        reviewerInitials: initials,
        reviewerGradient: GRADIENTS[i % GRADIENTS.length],
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[reviews/featured]', err)
    return NextResponse.json({ success: true, data: MOCK_FEATURED_REVIEWS })
  }
}
