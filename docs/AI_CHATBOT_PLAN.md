# Offmap AI Travel Concierge — Full Plan

> Created: June 2026 | Status: Planned (build after Phase 0 launch)

---

## How the Model Knows About Offmap

### 1. System Prompt (static knowledge)
Hidden instruction sent with every message. Contains:
- Platform identity, pricing, rules
- Available cities and categories
- Behavior guidelines (never invent hosts, encourage subscriptions, be warm/concise)
- Safety guidelines (always recommend public meeting places)

### 2. Tool Calls (live data from database)
The model calls existing APIs in real-time:
- `GET /api/hosts/search` — search hosts by city, categories, languages, price, host type
- `GET /api/cities` — list available cities
- `GET /api/stats` — platform stats (host count, city count)
- `POST /api/trips` (Phase B) — post a trip on behalf of the traveler

No host data is hardcoded in the model. New hosts appear immediately, deactivated hosts disappear. Ratings and reviews are always current.

### Tech Stack
- **Model**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — cheapest, fast, sufficient for search/recommendations
- **SDK**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- **API route**: `POST /api/ai/chat` — streaming response
- **Frontend**: React chat component with message history

---

## Cost

| Model | Cost per message | 1,000 convos/month |
|-------|-----------------|-------------------|
| Haiku 4.5 | ~$0.0006 | ~$5 |
| Sonnet 4.6 | ~$0.006 | ~$50 |
| Opus 4.6 | ~$0.05 | ~$500 |

**Use Haiku.** Upgrade to Sonnet only if quality isn't sufficient.

At launch scale (50-500 users): **$1-5/month**. One extra subscription conversion ($6) covers months of API cost.

---

## Feature Phases

### Phase A — Smart Search Assistant (build first)

| Feature | How |
|---------|-----|
| Natural language search | "I want someone who speaks French and knows wine bars in Lisbon" -> parses filters, calls search API |
| Multi-criteria matching | Extracts city + interests + languages + budget + group size from conversation |
| Host recommendations | Returns 2-3 host cards with photo, rating, rate, bio snippet, "View Profile" link |
| Follow-up refinement | "Anyone cheaper?" -> re-searches with adjusted price filter |
| City suggestions | "Where for street food in Europe?" -> recommends cities by host density in food category |
| FAQ answers | "How does pricing work?" "Is it safe?" -> answers from system prompt |
| Subscribe nudge | Non-subscribers: 3 free messages, then "Subscribe from 6 to keep chatting" |

### Phase B — Trip Planner (build later)

| Feature | How |
|---------|-----|
| Multi-day itinerary | "3 days in Barcelona" -> Day 1: food, Day 2: architecture, Day 3: nightlife with host suggestions per day |
| Post a trip | "Post this trip for me" -> calls POST /api/trips with extracted details |
| Compare hosts | "Compare Amira and Marco" -> side-by-side rating, languages, rates, specialties |
| Budget planning | "I have 200 for 3 days" -> host + duration combos that fit |

### Phase C — Booking Integration (build with Phase 1 payments)

| Feature | How |
|---------|-----|
| Book a session | "Book Amira Saturday 2pm 3 hours" -> opens pre-filled booking modal |
| Check availability | "Is Amira free this weekend?" -> checks host calendar |
| Price estimate | "How much for 4 hours with Marco?" -> calculates total with service fee |

---

## Name

**[Name]** — feminine, travel-inspired, AI assistant identity.

Requirements:
- Feminine and warm
- Evokes travel/exploration/discovery
- Short (1-2 syllables ideal)
- Works across languages (no awkward meanings in German, Spanish, Portuguese)
- Pairs well with Offmap brand

Final name: TBD (see suggestions below)

---

## Placement

### 1. Floating button (every page) — primary entry point
Bottom-right corner circle. Click opens chat drawer sliding up.
On host profile page: pre-filled with "Tell me about [host name]".
Non-intrusive, familiar pattern (Intercom/Crisp style).

### 2. Homepage section — discovery
Between "How It Works" and "Featured Hosts".
Text input teaser with example queries.
"Not sure where to start? Ask [Name] what you're looking for."

### 3. Dedicated /plan page — deep planning
Full-page chat experience for serious trip planning.
Linked from navbar as "Plan a Trip" or "Ask [Name]".

All three use the same React chat component and same /api/ai/chat route.

---

## Revenue Integration

- **Free tier**: 3 messages per session (no login required)
- **Subscriber tier**: Unlimited messages (requires active subscription)
- **Gate message**: "You've used your 3 free messages. Subscribe from 6/day to continue chatting and message hosts directly."
- **Conversion tracking**: Track how many subscribers came through chatbot -> host profile -> subscribe flow

---

## Implementation Checklist

### Dependencies
```bash
npm install ai @ai-sdk/anthropic
```

### Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Files to Create
- `src/app/api/ai/chat/route.ts` — streaming API route with tool definitions
- `src/components/ai/ChatWidget.tsx` — floating button + drawer chat UI
- `src/components/ai/ChatPage.tsx` — full-page chat for /plan
- `src/app/plan/page.tsx` — dedicated planning page

### Tools to Define (for model to call)
```typescript
tools: {
  searchHosts: {
    description: "Search for hosts by city, categories, languages, price range",
    parameters: { cityId, categories, languages, minPrice, maxPrice, hostType, limit }
  },
  getCities: {
    description: "Get list of available cities with host counts",
    parameters: {}
  },
  getHostProfile: {
    description: "Get detailed profile of a specific host",
    parameters: { hostId }
  },
  postTrip: {
    description: "Post a trip request on behalf of the traveler",
    parameters: { cityId, arrivalDate, departureDate, numTravelers, categories, noteToHosts }
  }
}
```

### System Prompt Template
```
You are [Name], Offmap's AI travel concierge.

Offmap connects travelers with verified local hosts in European cities.
Travelers subscribe (from 6/day) to unlock direct messaging with hosts.
Hosts set their own hourly rates and travelers pay hosts directly.

Your job:
1. Understand what the traveler is looking for
2. Search for matching hosts using the searchHosts tool
3. Present 2-3 best matches with name, rating, price, and why they're a good fit
4. Link to their profiles so the traveler can message or book

Rules:
- ONLY recommend hosts returned by the search tool — never invent hosts
- If no hosts match, say so honestly and suggest broadening criteria
- Be warm, enthusiastic about travel, concise (not verbose)
- Encourage subscribing if the user isn't a subscriber
- For safety questions, reference the FAQ safety section
- Never mention competitors by name
- Respond in the language the user writes in
```

---

## Visual Design — Alma AI Assistant

### Color Palette
- **Primary bubble (Alma):** `#0C7B7B` (teal) with white text
- **User bubble:** `#F2EDE4` (cream) with `#063B3B` (deep teal) text
- **Background:** `#FDFAF6` (warm white)
- **Input bar:** white with `1.5px solid rgba(12,123,123,0.2)` border
- **Accent:** `#E8621A` (terra) for CTA buttons and links

### Floating Button (every page)
- Position: bottom-right, `right: 24px`, `bottom: 24px`
- Size: `56px` circle
- Background: `linear-gradient(135deg, #0C7B7B, #063B3B)`
- Icon: sparkle/chat icon in white
- Shadow: `0 4px 20px rgba(12,123,123,0.3)`
- Hover: scale 1.08 + shadow intensifies
- Pulse animation on first visit (subtle ring)
- Badge: "Ask Alma" tooltip on hover

### Chat Drawer
- Slides up from bottom-right corner
- Size: `400px wide × 600px tall` (desktop), full-screen on mobile
- Header: teal gradient (`#0C7B7B` → `#063B3B`) with "Alma" name + sparkle icon + close button
- Body: scrollable message area with warm white background
- Footer: text input + send button

### Message Bubbles
- **Alma:** left-aligned, teal background, white text, rounded corners (16px, top-left 4px)
- **User:** right-aligned, cream background, teal text, rounded corners (16px, top-right 4px)
- **Typing indicator:** three dots animation in teal

### Host Recommendation Cards (inline in chat)
- Compact card: host photo (48px circle) + name + rating stars + price + city
- "View Profile" button (terra/orange) links to `/hosts/[id]`
- Up to 3 cards per recommendation
- Card background: white with subtle teal border

### Subscribe Gate
- After 3 messages for non-subscribers
- Soft overlay message from Alma: "I'd love to keep helping! Subscribe from €6/day to continue chatting with me and message hosts directly."
- CTA button: "Subscribe now" (terra gradient)
- Input field disabled with lock icon

### Mobile View
- Full-screen drawer (100vw × 100vh)
- Bottom input bar stays above keyboard
- Safe area insets respected
- Swipe down to minimize

### Conversation Flow Example
```
Alma: Hey! I'm Alma, your Offmap travel assistant ✨
      I can help you find the perfect local host.
      Where are you heading?

User: I want someone who knows good food spots in Lisbon

Alma: Great taste! Let me search for food hosts in Lisbon...
      [searching animation]

      I found 3 hosts who'd be perfect:

      [Host Card: Sofia M. · ⭐ 4.9 · €25/hr · Food & Drink]
      [Host Card: João R. · ⭐ 4.7 · €20/hr · Food & Drink, Nightlife]
      [Host Card: Ana L. · ⭐ 4.8 · €30/hr · Food & Drink, Art & Culture]

      Sofia has amazing reviews for her hidden tapas bar tours!
      Want me to tell you more about any of them?
```

### Files to Create
| File | Purpose |
|------|---------|
| `src/app/api/ai/chat/route.ts` | Streaming API route with Claude Haiku + tool definitions |
| `src/components/ai/AlmaButton.tsx` | Floating button + chat drawer wrapper |
| `src/components/ai/AlmaChat.tsx` | Chat UI: messages, input, host cards, typing indicator |
| `src/app/plan/page.tsx` | Dedicated full-page `/plan` route |
