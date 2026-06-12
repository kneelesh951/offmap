import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

export const maxDuration = 30

const SYSTEM_PROMPT = `You are Alma, Offmap's AI travel concierge.

Offmap connects travelers with verified local hosts in European cities.
Travelers subscribe (from €6/day) to unlock direct messaging with hosts.
Hosts set their own hourly rates and travelers pay hosts directly.

Your job:
1. Understand what the traveler is looking for
2. Search for matching hosts using the searchHosts tool
3. Present 2-3 best matches with their name, rating, price, and why they're a good fit
4. Link to their profiles so the traveler can message or book

Rules:
- ONLY recommend hosts returned by the search tool — never invent hosts
- If no hosts match, say so honestly and suggest broadening criteria
- Be warm, enthusiastic about travel, concise (not verbose)
- Encourage subscribing if the user asks about messaging hosts
- For safety questions, remind users to do a verification call, meet in public, and share plans with someone they trust
- Never mention competitors by name
- Respond in the language the user writes in
- Keep responses short — 2-3 sentences max unless the user asks for detail
- When presenting hosts, format each as: **Name** · ⭐ rating · €price/hr · specialties
- Use the getCities tool if you need to check which cities are available
- Use the getStats tool to answer questions about the platform size`

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Build the base URL from the request
  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      searchHosts: {
        description: 'Search for hosts by city, categories, languages, price range, and host type. Use this whenever a traveler asks about hosts or wants recommendations.',
        inputSchema: z.object({
          cityId: z.string().optional().describe('City ID to filter by'),
          categories: z.string().optional().describe('Comma-separated category slugs: food-drink, art-culture, nightlife, history, outdoor, shopping, wellness, music'),
          languages: z.string().optional().describe('Comma-separated language codes: en, de, pt, es, nl, fr, it, tr, ar, ja, zh'),
          minRateCents: z.number().optional().describe('Minimum hourly rate in cents'),
          maxRateCents: z.number().optional().describe('Maximum hourly rate in cents'),
          hostType: z.enum(['any', 'male', 'female', 'couple', 'family', 'group']).optional().describe('Host type preference'),
          limit: z.number().optional().default(5).describe('Max results to return'),
        }),
        execute: async ({ cityId, categories, languages, minRateCents, maxRateCents, hostType, limit }: {
          cityId?: string
          categories?: string
          languages?: string
          minRateCents?: number
          maxRateCents?: number
          hostType?: string
          limit?: number
        }) => {
          const params = new URLSearchParams()
          if (cityId) params.set('cityId', cityId)
          if (categories) params.set('categories', categories)
          if (languages) params.set('languages', languages)
          if (minRateCents) params.set('minRateCents', String(minRateCents))
          if (maxRateCents) params.set('maxRateCents', String(maxRateCents))
          if (hostType && hostType !== 'any') params.set('hostType', hostType)
          params.set('limit', String(limit || 5))
          params.set('page', '1')

          const res = await fetch(`${baseUrl}/api/hosts/search?${params}`)
          const json = await res.json()
          if (!json.success) return { hosts: [] as Record<string, unknown>[], error: json.error?.message as string }

          return {
            hosts: json.data.map((h: Record<string, unknown>) => ({
              id: h.id,
              name: h.fullName,
              headline: h.headline,
              bio: h.bio,
              city: h.cityName,
              flag: h.flagEmoji,
              categories: h.categories,
              languages: h.languages,
              hourlyRate: `€${((h.hourlyRateCents as number) / 100).toFixed(0)}`,
              rating: h.avgRating,
              reviewCount: h.reviewCount,
              responseRate: h.responseRate,
              hostType: h.hostType,
              profileUrl: `/hosts/${h.id}`,
            })),
            total: (json.meta?.total || json.data.length) as number,
          }
        },
      },
      getCities: {
        description: 'Get list of available cities on Offmap with host counts. Use when a traveler asks which cities are available or needs help choosing a destination.',
        inputSchema: z.object({}),
        execute: async () => {
          const res = await fetch(`${baseUrl}/api/cities`)
          const json = await res.json()
          if (!json.success) return { cities: [] as Record<string, unknown>[], error: json.error?.message as string }
          return {
            cities: json.data.map((c: Record<string, unknown>) => ({
              id: c.id,
              name: c.name,
              country: c.country,
              flag: c.flagEmoji,
              hostCount: c.hostCount,
            })),
          }
        },
      },
      getStats: {
        description: 'Get platform statistics like total host count and city count.',
        inputSchema: z.object({}),
        execute: async () => {
          const res = await fetch(`${baseUrl}/api/stats`)
          const json = await res.json()
          return json.data || { hostCount: 0, cityCount: 0 }
        },
      },
    },
  })

  return result.toUIMessageStreamResponse()
}
