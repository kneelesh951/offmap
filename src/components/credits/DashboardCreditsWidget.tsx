'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'
import { CreditPackModal } from './CreditPackModal'

const GREEN = '#084E4E'
const TERRA = '#E8621A'

interface Props {
  balance: number
  hasSub: boolean
}

export function DashboardCreditsWidget({ balance: initialBalance, hasSub }: Props) {
  const [balance, setBalance] = useState(initialBalance)
  const [showModal, setShowModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const credits = searchParams.get('credits')
    const newBalance = searchParams.get('balance')
    if (credits === 'success' && newBalance) {
      setBalance(parseInt(newBalance, 10))
      setSuccessMsg(`Credits added! Your new balance is ${newBalance} credits.`)
      setTimeout(() => setSuccessMsg(null), 6000)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  // Keep balance fresh after purchase (re-fetch)
  useEffect(() => {
    fetch('/api/credits').then(r => r.json()).then(j => {
      if (j.success) setBalance(j.data.balance)
    }).catch(() => {})
  }, [])

  return (
    <>
      {successMsg && (
        <div className="rounded-xl px-5 py-4 mb-6 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1.5px solid rgba(16,185,129,0.30)' }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ color: '#065F46', fontSize: 14, fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      <div className="rounded-2xl px-6 py-5 mb-8 flex items-center justify-between flex-wrap gap-4"
        style={{
          background: 'linear-gradient(135deg,#042626,#084E4E)',
          border: '1.5px solid rgba(255,255,255,0.10)',
          boxShadow: '0 4px 20px rgba(4,38,38,0.30)',
        }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,209,102,0.15)', border: '1.5px solid rgba(255,209,102,0.30)' }}>
            <Zap size={22} style={{ color: '#FFD166' }} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
              Credit balance
            </div>
            <div className="font-serif text-2xl font-bold" style={{ color: '#FFD166', letterSpacing: '-0.03em' }}>
              {balance} credits
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {balance >= 2
                ? `Unlock ${Math.floor(balance / 2)} more host${Math.floor(balance / 2) !== 1 ? 's' : ''} · 2 credits per connection`
                : 'Buy credits to connect without a subscription'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 rounded-full text-[13px] font-bold transition-all hover:-translate-y-0.5 flex-shrink-0"
          style={{
            background: TERRA,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(232,98,26,0.40)',
          }}
        >
          {balance > 0 ? '+ Top up credits' : 'Buy credits'}
        </button>
      </div>

      {showModal && (
        <CreditPackModal
          onClose={() => setShowModal(false)}
          currentBalance={balance}
        />
      )}
    </>
  )
}
