'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const GREEN = '#0F3D22'

const CATEGORY_LABELS: Record<string, string> = {
  'food-drink': 'Food & Drink', 'art-culture': 'Art & Culture', 'nature': 'Nature',
  'nightlife': 'Nightlife', 'history': 'History', 'family': 'Family',
}

interface HostResponse {
  id: string
  hostId: string
  message: string | null
  status: string
  createdAt: string
  hostName: string
  hostHeadline: string
  hostAvgRating: string
  hostReviewCount: number
  hostCategories: string[]
  hostNeighborhood: string
  hostLanguages: string[]
}

interface Props {
  responses: HostResponse[]
  tripId: string
  hasSubscription: boolean
}

export function TripResponsesList({ responses, tripId, hasSubscription }: Props) {
  const router = useRouter()
  const [connectingTo, setConnectingTo] = useState<string | null>(null)
  const [error, setError] = useState('')

  const startConversation = async (hostId: string) => {
    setConnectingTo(hostId)
    setError('')
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, tripRequestId: tripId }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        router.push(`/conversations/${json.data.conversationId}`)
      } else if (json.error?.code === 'SUBSCRIPTION_REQUIRED') {
        router.push('/pricing')
      } else {
        setError(json.error?.message ?? 'Failed to connect')
        setConnectingTo(null)
      }
    } catch {
      setError('Network error — please try again')
      setConnectingTo(null)
    }
  }

  return (
    <div>
      {/* Subscription gate banner */}
      {!hasSubscription && (
        <div className="rounded-2xl p-6 mb-6 text-center"
          style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', border: '1px solid #F59E0B' }}>
          <div className="text-3xl mb-3">🔒</div>
          <h3 className="font-serif text-lg font-bold mb-2" style={{ color: '#92400E' }}>
            Subscribe to connect with hosts
          </h3>
          <p className="text-sm mb-4" style={{ color: '#78350F', lineHeight: '1.6' }}>
            {responses.length} host{responses.length > 1 ? 's have' : ' has'} responded to your trip.
            Subscribe to read their messages and start a conversation.
          </p>
          <Link href="/pricing"
            className="inline-block px-8 py-3 rounded-full text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #E8621A, #F07830)', boxShadow: '0 4px 16px rgba(232,98,26,0.35)' }}>
            Subscribe from €6 →
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-4 mb-4 text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div className="space-y-4">
        {responses.map(resp => {
          const initial = resp.hostName[0]?.toUpperCase() ?? '?'
          const rating = parseFloat(resp.hostAvgRating)
          const isBlurred = !hasSubscription

          return (
            <div key={resp.id} className="bg-white rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(15,61,34,0.10)', position: 'relative' }}>

              {/* Blur overlay for non-subscribers */}
              {isBlurred && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  background: 'rgba(250,247,242,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '16px',
                }}>
                  <div className="text-center px-6">
                    <div className="text-2xl mb-2">🔒</div>
                    <p className="text-sm font-semibold" style={{ color: GREEN }}>Subscribe to see this response</p>
                  </div>
                </div>
              )}

              <div className="p-6">
                {/* Host header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-serif text-lg font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #5A7350, #3A5230)' }}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base" style={{ color: GREEN }}>{resp.hostName}</span>
                      {rating > 0 && (
                        <span className="text-xs font-semibold" style={{ color: '#E8621A' }}>
                          ★ {rating.toFixed(1)} ({resp.hostReviewCount})
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: '#2D6B3F' }}>{resp.hostHeadline}</p>
                    {resp.hostNeighborhood && (
                      <p className="text-xs mt-0.5" style={{ color: '#4A7A5C' }}>📍 {resp.hostNeighborhood}</p>
                    )}
                  </div>
                </div>

                {/* Host categories & languages */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {resp.hostCategories.slice(0, 4).map(c => (
                    <span key={c} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
                      {CATEGORY_LABELS[c] ?? c}
                    </span>
                  ))}
                  {resp.hostLanguages.slice(0, 3).map(l => (
                    <span key={l} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                      {l.toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Host's message */}
                {resp.message && (
                  <div className="rounded-xl p-4 mb-4 text-sm leading-relaxed"
                    style={{ backgroundColor: '#FAF7F2', color: '#1a2e1a', borderLeft: '3px solid #5A7350' }}>
                    &ldquo;{resp.message}&rdquo;
                  </div>
                )}

                {/* Actions */}
                {hasSubscription && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => startConversation(resp.hostId)}
                      disabled={connectingTo === resp.hostId}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
                      style={{
                        background: connectingTo === resp.hostId ? '#9ca3af' : 'linear-gradient(135deg, #E8621A, #F07830)',
                        boxShadow: connectingTo === resp.hostId ? 'none' : '0 2px 8px rgba(232,98,26,0.25)',
                        cursor: connectingTo === resp.hostId ? 'not-allowed' : 'pointer',
                        border: 'none',
                      }}
                    >
                      {connectingTo === resp.hostId ? 'Connecting...' : 'Start conversation →'}
                    </button>
                    <Link href={`/hosts/${resp.hostId}`}
                      className="px-5 py-3 rounded-xl text-sm font-semibold flex items-center"
                      style={{ border: `1.5px solid rgba(15,61,34,0.15)`, color: GREEN, textDecoration: 'none' }}>
                      View profile
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
