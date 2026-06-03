'use client'
import { useEffect, useState } from 'react'
import type { SubscriptionStatus } from '@/types'

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    fetch('/api/subscriptions')
      .then(r => r.json())
      .then(d => { if (d.success) setSubscription(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { subscription, isActive: subscription?.isActive ?? false, loading }
}
