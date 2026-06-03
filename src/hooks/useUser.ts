'use client'
import { useEffect, useState } from 'react'
import type { SessionUser } from '@/types'

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

export function useUser() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Both mock and production use the /api/me endpoint
    // In mock mode it reads the cookie. In production it reads the Supabase session.
    fetch('/api/me')
      .then(r => r.json())
      .then(data => { if (data.success) setUser(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    if (IS_MOCK) {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      window.location.href = '/'
      return
    }
    const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
    await createSupabaseBrowserClient().auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  return { user, loading, logout }
}
