'use client'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { PLAN_INFO, type Plan } from '@/lib/stripe'
import { useRouter } from 'next/navigation'

const PLANS: Plan[] = ['day', 'week', 'month', 'annual']

interface SubscribeModalProps {
  open: boolean
  onClose: () => void
}

export function SubscribeModal({ open, onClose }: SubscribeModalProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Plan>('day')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { router.push('/auth/login?redirect=/search'); return }
        setError(data.error?.message ?? 'Something went wrong')
        return
      }
      window.location.href = data.data.checkoutUrl
    } catch {
      setError('Could not connect to payment provider. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Subscribe to connect" size="md">
      <div className="p-6">
        <p className="text-ink-soft text-sm mb-5 leading-relaxed">
          Browse host profiles for free. Subscribe to unlock direct messaging — hosts negotiate their price with you directly.
        </p>

        <div className="space-y-2 mb-5">
          {PLANS.map((plan) => {
            const info = PLAN_INFO[plan]
            return (
              <button
                key={plan}
                onClick={() => setSelected(plan)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                  selected === plan
                    ? 'border-terra bg-terra-pale'
                    : 'border-black/[0.09] hover:border-black/20'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-sm">{info.name}</span>
                    {info.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-terra text-white rounded-full">{info.badge}</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">{info.description}</div>
                </div>
                <div className="font-serif text-xl font-bold text-terra">{info.price}</div>
              </button>
            )
          })}
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <Button onClick={handleSubscribe} loading={loading} className="w-full">
          Continue to payment →
        </Button>

        <p className="text-center text-xs text-ink-muted mt-3 leading-relaxed">
          Secure payment via Stripe · Cancel anytime · 14-day withdrawal right (EU law)
        </p>
      </div>
    </Modal>
  )
}
