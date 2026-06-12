'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GREEN = '#084E4E'

const PLANS = [
  { key: 'day',    name: 'Day Pass',   price: '€6',  period: 'day',   desc: '24 hrs of unlimited connections',  badge: null },
  { key: 'week',   name: 'Week Pass',  price: '€12', period: 'week',  desc: '7 days across any city',           badge: null },
  { key: 'month',  name: 'Month Pass', price: '€18', period: 'month', desc: 'Best for longer trips',            badge: 'Popular' },
  { key: 'annual', name: 'Annual',     price: '€49', period: 'year',  desc: 'For the frequent traveler',        badge: 'Best value' },
]

export function PricingCards({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe(plan: string) {
    if (!isLoggedIn) {
      router.push('/auth/register')
      return
    }

    setLoading(plan)
    setError(null)

    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()

      if (!json.success) {
        if (json.error?.code === 'AUTH_REQUIRED') {
          router.push('/auth/login?redirect=/pricing')
          return
        }
        setError(json.error?.message || 'Something went wrong')
        return
      }

      // Redirect to checkout (mock or Stripe)
      window.location.href = json.data.checkoutUrl
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mb-12">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => (
          <div key={plan.key}
            className="bg-white rounded-2xl p-6 relative flex flex-col card-hover"
            style={{
              border: plan.badge === 'Best value' ? `2px solid ${GREEN}` : '1px solid rgba(8,78,78,0.10)',
              boxShadow: plan.badge === 'Best value'
                ? '0 4px 24px rgba(8,78,78,0.14), 0 1px 4px rgba(8,78,78,0.08)'
                : '0 2px 8px rgba(8,78,78,0.06)',
            }}>
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
                style={{
                  background: plan.badge === 'Best value'
                    ? `linear-gradient(135deg, ${GREEN}, #2A8080)`
                    : 'linear-gradient(135deg,#E8621A,#F07830)',
                  boxShadow: plan.badge === 'Best value'
                    ? '0 2px 10px rgba(8,78,78,0.35)'
                    : '0 2px 10px rgba(232,98,26,0.40)',
                }}>
                {plan.badge}
              </div>
            )}
            <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>{plan.name}</div>
            <div className="font-serif text-4xl font-bold mb-0.5 text-gradient-terra">{plan.price}</div>
            <div className="text-[11px] font-semibold mb-4" style={{ color: '#6EA880' }}>per {plan.period}</div>
            <p className="text-[13px] leading-relaxed mb-6 flex-1" style={{ color: '#4A8E8E' }}>{plan.desc}</p>
            <button
              onClick={() => handleSubscribe(plan.key)}
              disabled={loading === plan.key}
              className="block w-full text-center py-3 rounded-full text-[13px] font-bold transition-all disabled:opacity-60"
              style={plan.badge === 'Best value'
                ? { background: `linear-gradient(135deg, ${GREEN}, #2A8080)`, color: '#fff', boxShadow: '0 4px 16px rgba(8,78,78,0.30)' }
                : plan.badge === 'Popular'
                  ? { background: 'linear-gradient(135deg,#E8621A,#F07830)', color: '#fff', boxShadow: '0 4px 16px rgba(232,98,26,0.35)' }
                  : { border: '1px solid rgba(8,78,78,0.18)', color: GREEN, backgroundColor: '#FAF7F2' }
              }>
              {loading === plan.key ? 'Processing...' : isLoggedIn ? 'Subscribe now' : 'Get started'}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-center text-[13px] font-medium px-4 py-3 rounded-xl"
          style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}
    </div>
  )
}
