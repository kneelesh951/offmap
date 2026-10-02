/**
 * Next.js Middleware — runs on every request.
 * In MOCK_MODE: skips Upstash rate limiting, uses cookie-based auth check.
 * In production: uses Upstash rate limiting + Supabase session refresh.
 */
import { NextResponse, type NextRequest } from 'next/server'
import type { RateLimitTier } from '@/lib/cache'

const PROTECTED = ['/dashboard', '/host-dashboard', '/host-onboarding', '/conversations', '/settings', '/wishlists']

// Admin IP allowlist — comma-separated IPs in env var. Empty = allow all (dev safety).
// In production set ADMIN_ALLOWED_IPS=your.ip.here in Vercel env vars.
const ADMIN_ALLOWED_IPS = (process.env.ADMIN_ALLOWED_IPS ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)

// Routes that legitimately receive cross-origin POST requests (Stripe, future webhooks).
// These already verify requests via their own signature mechanisms — no CSRF check needed.
const CSRF_EXEMPT = ['/api/webhooks/']

// Auth endpoints get a much stricter limit (5 req / 15 min) to prevent brute-force.
const AUTH_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password']
// Write routes (POST/PATCH/DELETE to resources) get 30 req / 60 s.
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function rateLimitTier(pathname: string, method: string): RateLimitTier {
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) return 'auth'
  if (WRITE_METHODS.has(method)) return 'write'
  return 'read'
}

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

  // ── Admin IP allowlist ─────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (ADMIN_ALLOWED_IPS.length > 0) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
               ?? request.headers.get('x-real-ip')
               ?? '127.0.0.1'
      const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('localhost')
      if (!isLocalhost && !ADMIN_ALLOWED_IPS.includes(ip)) {
        return NextResponse.rewrite(new URL('/not-found', request.url))
      }
    }
  }

  // ── CSRF protection (all modes) ────────────────────────────────────────────
  const csrfError = csrfCheck(request)
  if (csrfError) return csrfError

  // ── Rate limiting (production only) ────────────────────────────────────────
  if (!isMock && pathname.startsWith('/api/')) {
    try {
      const { checkRateLimit } = await import('@/lib/cache')
      const ip = (request.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim()
      const tier = rateLimitTier(pathname, request.method)
      const { success } = await checkRateLimit(tier, ip)
      if (!success) {
        return NextResponse.json(
          { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests — please slow down' } },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
    } catch { /* fail open — Redis outage must not take down the app */ }
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
  const isProtected = PROTECTED.some(r => pathname.startsWith(r)) || pathname.startsWith('/admin')

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
