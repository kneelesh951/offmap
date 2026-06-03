/**
 * Next.js Middleware — runs on every request.
 * In MOCK_MODE: skips Upstash rate limiting, uses cookie-based auth check.
 * In production: uses Upstash rate limiting + Supabase session refresh.
 */
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/host-dashboard', '/host-onboarding', '/conversations', '/settings']

// Routes that legitimately receive cross-origin POST requests (Stripe, future webhooks).
// These already verify requests via their own signature mechanisms — no CSRF check needed.
const CSRF_EXEMPT = ['/api/webhooks/']

/**
 * CSRF protection via Origin header check.
 * Rejects state-mutating requests (POST/PUT/PATCH/DELETE) whose Origin header
 * does not match the app's own host. This stops malicious third-party sites
 * from sending requests on behalf of a logged-in user.
 *
 * Safe requests (GET, HEAD, OPTIONS) are never checked.
 * Requests with no Origin header (server-to-server, curl) are allowed through
 * so that legitimate API clients and CLI tools are not blocked.
 */
function csrfCheck(request: NextRequest): NextResponse | null {
  const method = request.method
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null

  const { pathname } = request.nextUrl
  if (CSRF_EXEMPT.some(p => pathname.startsWith(p))) return null

  const origin = request.headers.get('origin')
  if (!origin) return null // allow server-to-server requests (no Origin header)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const allowedHost = new URL(appUrl).host

  // Also allow localhost on any port during development
  const originHost = new URL(origin).host
  const isLocalhost = originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1')

  if (originHost !== allowedHost && !isLocalhost) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Invalid request origin' } },
      { status: 403 }
    )
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isMock = process.env.MOCK_MODE === 'true'

  // ── CSRF protection (all modes) ────────────────────────────────────────────
  const csrfError = csrfCheck(request)
  if (csrfError) return csrfError

  // ── Rate limiting (production only) ────────────────────────────────────────
  if (!isMock && pathname.startsWith('/api/')) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit')
      const { Redis } = await import('@upstash/redis')
      const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
      const limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(100, '60 s'), prefix: 'rl:api' })
      const { success } = await limiter.limit(ip)
      if (!success) return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, { status: 429 })
    } catch { /* fail open — don't block requests if Redis is unavailable */ }
  }

  // ── Session refresh (production only) ──────────────────────────────────────
  if (!isMock) {
    try {
      const { updateSession } = await import('@/lib/supabase/middleware')
      return await updateSession(request)
    } catch { return NextResponse.next() }
  }

  // ── Mock mode: protect routes based on cookie presence ─────────────────────
  // Note: we only check cookie existence here, not validity.
  // Session validity is checked server-side in each page/API route via mockGetUser().
  // If the cookie is stale (server restarted), the page will redirect to login
  // and the login page will clear the old cookie on successful re-login.
  const mockSession = request.cookies.get('offmap_mock_session')?.value
  const isProtected = PROTECTED.some(r => pathname.startsWith(r))

  if (isProtected && !mockSession) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
