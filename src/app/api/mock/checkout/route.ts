import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  if (process.env.MOCK_MODE !== 'true') return NextResponse.json({ error: 'Mock mode only' }, { status: 403 })

  // Credit pack checkout
  const creditsToken = request.nextUrl.searchParams.get('credits')
  if (creditsToken) {
    const { mockCompleteCreditCheckout } = await import('@/lib/mock/stripe')
    const result = mockCompleteCreditCheckout(creditsToken)
    if (!result.success) return NextResponse.redirect(new URL('/dashboard?credits=error', request.url))
    return NextResponse.redirect(new URL(`/dashboard?credits=success&balance=${result.newBalance}`, request.url))
  }

  // Subscription checkout
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/pricing?error=invalid', request.url))
  const { mockCompleteCheckout } = await import('@/lib/mock/stripe')
  const result = mockCompleteCheckout(token)
  if (!result.success) return NextResponse.redirect(new URL('/pricing?error=failed', request.url))
  return NextResponse.redirect(new URL('/dashboard?subscription=success', request.url))
}
