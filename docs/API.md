# Offmap — API Reference

All endpoints return JSON. Base URL: `https://your-domain.com` (or `http://localhost:3000` locally).

## Response envelope

Every response uses the same wrapper:

```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 143 } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }

// Validation error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "fields": { "email": ["Enter a valid email"] }
  }
}
```

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod validation failed — check `fields` |
| `AUTH_REQUIRED` | 401 | Must be logged in |
| `FORBIDDEN` | 403 | Logged in but not authorised |
| `SUBSCRIPTION_REQUIRED` | 403 | Active subscription needed |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate (e.g. email already taken) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate limiting

All `/api/*` routes: **100 requests per 60 seconds per IP** (sliding window). Returns `429 RATE_LIMITED` when exceeded. Fails open if Redis is unavailable.

---

## Authentication

### POST /api/auth/register

Create a new account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "Password1",
  "fullName": "Jane Smith",
  "role": "traveler",
  "gdprConsent": true
}
```

**Validation:**
- `email` — valid email format
- `password` — 8+ characters, at least one uppercase letter, at least one number
- `fullName` — 2–100 characters
- `role` — `"traveler"` or `"host"`
- `gdprConsent` — must be `true` (required for EU compliance)

**Success response `201`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "traveler",
      "fullName": "Jane Smith"
    }
  }
}
```

**Error responses:**
- `422` — validation failed
- `409` — email already registered
- `500` — Supabase error

---

### POST /api/auth/login

Sign in to an existing account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "Password1"
}
```

**Success response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "traveler",
      "fullName": "Jane Smith"
    }
  }
}
```

Sets an `HttpOnly + SameSite=Strict` session cookie. All subsequent requests automatically include the session.

**Error responses:**
- `401` — invalid credentials

---

### POST /api/auth/logout

Sign out. Clears the session cookie.

**Request body:** none

**Success response `200`:**
```json
{ "success": true, "data": null }
```

---

## Cities

### GET /api/cities

List all active cities, sorted by host count descending.

**Auth:** Not required

**Query params:** none

**Success response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Berlin",
      "country": "Germany",
      "countryCode": "DE",
      "flagEmoji": "🇩🇪",
      "hostCount": 214,
      "timezone": "Europe/Berlin",
      "centerLat": "52.5200",
      "centerLng": "13.4050"
    }
  ]
}
```

---

## Hosts

### GET /api/hosts/search

Search hosts with filters and pagination.

**Auth:** Not required

**Query params:**

| Param | Type | Description |
|---|---|---|
| `cityId` | uuid | Filter by city |
| `categories` | string[] | Filter by categories (comma-separated) |
| `languages` | string[] | Filter by languages spoken |
| `hostType` | string | `any` / `male` / `female` / `couple` / `family` / `group` |
| `sort` | string | `featured` (default) / `rating` / `newest` |
| `page` | number | Page number, default `1` |
| `limit` | number | Results per page, 1–50, default `20` |
| `q` | string | Free-text search (up to 100 chars) |

**Valid category values:** `food-drink` · `art-culture` · `nature` · `nightlife` · `history` · `family` · `sports` · `music`

**Valid language values:** `en` · `de` · `fr` · `es` · `it` · `pt` · `nl` · `pl` · `ru` · `ar` · `zh` · `ja` · `ko` · `hi` · `tr` · `sv` · `da` · `fi`

**Success response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "cityId": "uuid",
      "cityName": "Berlin",
      "cityCountry": "Germany",
      "flagEmoji": "🇩🇪",
      "headline": "Street food expert & underground Berlin guide",
      "bio": "Born in Lebanon, living in Berlin for 12 years...",
      "languages": ["en", "de", "ar"],
      "categories": ["food-drink", "art-culture", "nightlife"],
      "hostType": "female",
      "hourlyRateCents": 2500,
      "neighborhood": "Neukölln",
      "avgRating": "4.98",
      "reviewCount": 143,
      "responseRate": "98",
      "isPremium": true,
      "isFeatured": true,
      "fullName": "Amira Khalil",
      "avatarUrl": null,
      "primaryPhotoUrl": "https://..."
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 214 }
}
```

---

### GET /api/hosts/[id]

Get a single host profile by host profile ID (not user ID).

**Auth:** Not required

**Success response `200`:**
```json
{
  "success": true,
  "data": {
    "host": {
      "id": "uuid",
      "userId": "uuid",
      "cityId": "uuid",
      "headline": "Street food expert...",
      "bio": "...",
      "languages": ["en", "de"],
      "categories": ["food-drink"],
      "hostType": "female",
      "hourlyRateCents": 2500,
      "neighborhood": "Neukölln",
      "avgRating": "4.98",
      "reviewCount": 143,
      "availability": { "mon": ["09:00-12:00"], "tue": ["14:00-18:00"] },
      "fullName": "Amira Khalil",
      "photos": [
        { "id": "uuid", "publicUrl": "https://...", "isPrimary": true, "displayOrder": 0 }
      ],
      "reviews": [
        {
          "id": "uuid",
          "rating": 5,
          "body": "Amazing experience...",
          "reviewerName": "James K.",
          "createdAt": "2024-11-15T..."
        }
      ]
    }
  }
}
```

**Error responses:**
- `404` — host not found or not approved

---

### POST /api/hosts

Create or update the authenticated user's host profile.

**Auth:** Required (host role)

**Request body:**
```json
{
  "cityId": "uuid",
  "headline": "Street food expert & underground Berlin guide",
  "bio": "Born in Lebanon, living in Berlin for 12 years...",
  "languages": ["en", "de", "ar"],
  "categories": ["food-drink", "art-culture"],
  "hostType": "female",
  "hourlyRateCents": 2500,
  "neighborhood": "Neukölln"
}
```

**Validation:**
- `headline` — 10–80 characters
- `bio` — 100–2000 characters
- `languages` — 1–8 items from valid language list
- `categories` — 1–5 items from valid category list
- `hourlyRateCents` — 500–50000 (€5–€500), optional

**Success response `200` / `201`:**
```json
{
  "success": true,
  "data": { "profileId": "uuid" }
}
```

---

## Current user

### GET /api/me

Get the currently authenticated user's profile.

**Auth:** Required

**Success response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "traveler",
    "fullName": "Jane Smith",
    "avatarUrl": null,
    "isVerified": false,
    "marketingConsent": false
  }
}
```

---

## Subscriptions

### GET /api/subscriptions

Get the current user's active subscription status.

**Auth:** Required

**Success response `200`:**
```json
{
  "success": true,
  "data": {
    "isActive": true,
    "plan": "month",
    "expiresAt": "2024-08-01T00:00:00.000Z",
    "stripeCustomerId": "cus_..."
  }
}
```

If no active subscription:
```json
{
  "success": true,
  "data": {
    "isActive": false,
    "plan": null,
    "expiresAt": null,
    "stripeCustomerId": null
  }
}
```

---

### POST /api/subscriptions/checkout

Create a Stripe Checkout session. Redirects the user to Stripe to complete payment.

**Auth:** Required (traveler role)

**Request body:**
```json
{ "plan": "month" }
```

**Valid plans:** `day` · `week` · `month` · `annual`

| Plan | Price | Duration |
|---|---|---|
| `day` | €6 | 24 hours |
| `week` | €12 | 7 days |
| `month` | €18 | 30 days |
| `annual` | €49 | 365 days |

**Success response `200`:**
```json
{
  "success": true,
  "data": { "checkoutUrl": "https://checkout.stripe.com/c/pay/..." }
}
```

Redirect the user's browser to `checkoutUrl`.

---

### POST /api/subscriptions/portal

Create a Stripe Customer Portal session. Allows the user to manage their subscription (cancel, view invoices, update payment method).

**Auth:** Required (must have an existing Stripe customer ID)

**Request body:** none

**Success response `200`:**
```json
{
  "success": true,
  "data": { "portalUrl": "https://billing.stripe.com/p/..." }
}
```

Redirect the user's browser to `portalUrl`.

---

## Conversations

### POST /api/conversations

Unlock a conversation with a host. Requires an active subscription. Creates the conversation if it doesn't exist; returns the existing ID if it does.

**Auth:** Required (traveler role + active subscription)

**Request body:**
```json
{ "hostId": "uuid" }
```

Note: `hostId` is the **user ID** of the host (not the host_profile ID).

**Success response `201` (new) / `200` (existing):**
```json
{
  "success": true,
  "data": { "conversationId": "uuid" }
}
```

**Error responses:**
- `401` — not logged in
- `403 SUBSCRIPTION_REQUIRED` — no active subscription
- `404` — host not found or not approved

---

### GET /api/conversations/[id]/messages

Fetch all messages in a conversation, ordered oldest first.

**Auth:** Required (must be a participant in the conversation)

**Success response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "senderName": "Jane Smith",
      "content": "Hi! Looking forward to exploring Berlin with you.",
      "isRead": true,
      "readAt": "2024-12-10T15:00:00Z",
      "createdAt": "2024-12-10T14:00:00Z"
    }
  ]
}
```

---

### POST /api/conversations/[id]/messages

Send a message in a conversation.

**Auth:** Required (must be a participant)

**Request body:**
```json
{ "content": "Looking forward to meeting you!" }
```

**Validation:** `content` — 1–5000 characters (trimmed)

**Success response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "senderId": "uuid",
    "content": "Looking forward to meeting you!",
    "createdAt": "2024-12-10T14:00:00Z"
  }
}
```

---

## Reviews

### POST /api/reviews

Leave a review after a conversation. One review per direction per conversation (traveler→host and host→traveler are separate).

**Auth:** Required (must be a participant in the referenced conversation)

**Request body:**
```json
{
  "conversationId": "uuid",
  "revieweeId": "uuid",
  "rating": 5,
  "body": "Incredible experience. Amira showed me a Berlin I would never have found on my own."
}
```

**Validation:**
- `rating` — integer 1–5
- `body` — 20–1000 characters (optional)

**Success response `201`:**
```json
{
  "success": true,
  "data": { "reviewId": "uuid" }
}
```

**Error responses:**
- `403` — not a participant in this conversation
- `409` — already reviewed this person for this conversation

---

## Wishlists

### POST /api/wishlists

Toggle a host on/off the current user's wishlist. Idempotent — calling it twice removes the host.

**Auth:** Required

**Request body:**
```json
{ "hostId": "uuid" }
```

Note: `hostId` here is the **host_profile ID** (not user ID).

**Success response `200`:**
```json
{
  "success": true,
  "data": { "saved": true }
}
```
or
```json
{
  "success": true,
  "data": { "saved": false }
}
```

---

## Trips

### GET /api/trips

Browse open trip posts. Optionally filter by city.

**Auth:** Not required

**Query params:**

| Param | Type | Description |
|---|---|---|
| `cityId` | uuid | Filter by destination city |
| `status` | string | `open` (default) / `matched` / `closed` |
| `page` | number | Default `1` |
| `limit` | number | 1–50, default `20` |

**Success response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "travelerId": "uuid",
      "travelerName": "Jane Smith",
      "cityId": "uuid",
      "cityName": "Berlin",
      "title": "Looking for a food guide in Neukölln",
      "description": "Visiting for 5 days and want to eat like a local...",
      "interests": ["food-drink", "history"],
      "languages": ["en", "de"],
      "startDate": "2024-12-20T...",
      "endDate": "2024-12-25T...",
      "guestCount": 2,
      "budget": "€50–€100 total",
      "status": "open",
      "responseCount": 3,
      "createdAt": "2024-12-01T..."
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 47 }
}
```

---

### POST /api/trips

Create a trip post as a traveler.

**Auth:** Required (traveler role)

**Request body:**
```json
{
  "cityId": "uuid",
  "title": "Looking for a food guide in Neukölln",
  "description": "Visiting Berlin for 5 days and want to eat like a local. Interested in street food, hidden bars, and the Saturday market.",
  "interests": ["food-drink", "nightlife"],
  "languages": ["en", "de"],
  "startDate": "2024-12-20",
  "endDate": "2024-12-25",
  "guestCount": 2,
  "budget": "€50–€100 total"
}
```

**Validation:**
- `title` — 10–120 characters
- `description` — 30–2000 characters
- `interests` — 1–5 items from valid category list
- `languages` — 1–5 items from valid language list
- `guestCount` — 1–20

**Success response `201`:**
```json
{
  "success": true,
  "data": { "tripId": "uuid" }
}
```

---

### POST /api/trips/[id]/respond

Respond to a trip post as a host. One response per host per trip.

**Auth:** Required (host role with approved profile)

**Request body:**
```json
{
  "message": "Hi! I'd love to show you the real Neukölln. I know every hidden bar and the best döner no tourist has found. I usually do 3–4 hour sessions.",
  "proposedRateCents": 2500
}
```

**Validation:**
- `message` — 20–1000 characters
- `proposedRateCents` — 500–50000, optional

**Success response `201`:**
```json
{
  "success": true,
  "data": { "responseId": "uuid" }
}
```

---

## Webhooks

### POST /api/webhooks/stripe

Stripe event handler. Only called by Stripe — not for direct use.

**Auth:** Stripe signature verification (HMAC-SHA256)

**Headers required:** `stripe-signature`

**Events handled:**
- `checkout.session.completed` — creates subscription record, sends confirmation email
- `customer.subscription.updated` — syncs status and period dates
- `customer.subscription.deleted` — marks subscription as cancelled
- `invoice.payment_failed` — marks subscription as past_due

**Success response `200`:**
```json
{ "received": true }
```

Returns `400` if signature verification fails. Returns `500` if processing fails (Stripe will retry).

---

## Mock-only endpoints

### POST /api/mock/checkout

Instant subscription activation without payment. Only available when `MOCK_MODE=true`.

**Query params:** `?token=<mock_checkout_token>`

**Success response `302`:**
Redirects to `/dashboard?subscription=success`

---

## Pagination

Endpoints that return lists support pagination:

```
GET /api/hosts/search?page=2&limit=10
```

Response includes `meta`:
```json
{
  "meta": {
    "page": 2,
    "limit": 10,
    "total": 214
  }
}
```

Total pages = `Math.ceil(total / limit)`.
