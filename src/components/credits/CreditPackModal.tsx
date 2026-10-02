'use client'
import { useState } from 'react'
import { X, Zap, Star, Check } from 'lucide-react'

const TERRA = '#E8621A'
const GREEN = '#084E4E'
const GREEN_DARK = '#042626'

const PACKS = [
  {
    id: '10' as const,
    credits: 10,
    price: '€10',
    priceNum: 10,
    perCredit: '€1.00/credit',
    badge: null,
    color: '#0E4155',
    accent: '#5ECECE',
    description: 'Great for a single trip',
    features: ['Unlock 5 local hosts', 'No expiry date', 'Use anytime'],
  },
  {
    id: '25' as const,
    credits: 30,
    price: '€25',
    priceNum: 25,
    perCredit: '€0.83/credit',
    badge: 'Best value',
    color: TERRA,
    accent: '#FFD166',
    description: 'Perfect for frequent travelers',
    features: ['Unlock 15 local hosts', 'No expiry date', 'Save 17% vs single pack'],
  },
]

interface Props {
  onClose: () => void
  currentBalance?: number
}

export function CreditPackModal({ onClose, currentBalance = 0 }: Props) {
  const [selected, setSelected] = useState<'10' | '25'>('25')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: selected }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error?.message ?? 'Something went wrong'); setLoading(false); return }
      window.location.href = json.data.checkoutUrl
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  const pack = PACKS.find(p => p.id === selected)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,38,38,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.30)' }}
      >
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})`, padding: '24px 28px 20px' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} style={{ color: '#FFD166' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.60)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Credit Packs
                </span>
              </div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
                Connect without subscribing
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '6px 0 0' }}>
                2 credits per host unlock · no expiry · use anytime
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {currentBalance > 0 && (
            <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Zap size={13} style={{ color: '#FFD166' }} />
              <span style={{ color: '#FFD166', fontSize: 13, fontWeight: 700 }}>
                You have {currentBalance} credits remaining
              </span>
            </div>
          )}
        </div>

        {/* Pack selection */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {PACKS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                border: selected === p.id ? `2px solid ${p.id === '25' ? TERRA : GREEN}` : '2px solid #E2E8F0',
                borderRadius: 14,
                padding: '16px',
                background: selected === p.id ? (p.id === '25' ? 'rgba(232,98,26,0.06)' : 'rgba(8,78,78,0.06)') : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {p.badge && (
                <div style={{ position: 'absolute', top: -10, right: 12, background: TERRA, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em' }}>
                  {p.badge}
                </div>
              )}
              <div style={{ fontSize: 26, fontWeight: 900, color: GREEN_DARK, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {p.price}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: p.id === '25' ? TERRA : GREEN, marginTop: 4 }}>
                {p.credits} credits
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>{p.perCredit}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>{p.description}</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={11} style={{ color: p.id === '25' ? TERRA : GREEN, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#475569' }}>{f}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* How it works */}
        <div style={{ margin: '0 24px', background: '#F8FAFC', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 20 }}>
          {[
            { icon: '💳', text: 'Pay once' },
            { icon: '⚡', text: '2 credits = 1 host unlock' },
            { icon: '∞', text: 'Never expires' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '20px 24px 24px' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#B91C1C' }}>
              {error}
            </div>
          )}
          <button
            onClick={handlePurchase}
            disabled={loading}
            style={{
              width: '100%', padding: '14px 0', background: loading ? '#94A3B8' : TERRA,
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.02em',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(232,98,26,0.40)',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Redirecting…' : `Buy ${pack.credits} credits for ${pack.price}`}
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 10, marginBottom: 0 }}>
            Secure payment via Stripe · No subscription required
          </p>
        </div>
      </div>
    </div>
  )
}
