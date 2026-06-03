import { NextRequest, NextResponse } from 'next/server'
export async function POST(request: NextRequest) {
  const res = NextResponse.json({ success: true })
  if (process.env.MOCK_MODE === 'true') {
    const token = request.cookies.get('offmap_mock_session')?.value
    if (token) { const { mockSignOut } = await import('@/lib/mock/auth'); mockSignOut(token) }
    res.cookies.delete('offmap_mock_session')
  } else {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    await supabase.auth.signOut()
  }
  return res
}
