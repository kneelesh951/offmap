'use client'

import { useState, useEffect } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  'food-drink': '🍴 Food & Drink', 'art-culture': '🎨 Art & Culture', 'nature': '🌿 Nature',
  'nightlife': '🌙 Nightlife', 'history': '🏛️ History', 'family': '👨‍👩‍👧 Family',
}

const HOST_TYPE_LABELS: Record<string, string> = {
  any: '🌍 Any', male: '👨 Male', female: '👩 Female',
  couple: '👫 Couple', family: '👨‍👩‍👧 Family', group: '👥 Group',
}

interface TripRequest {
  id: string
  travelerId: string
  travelerName: string | null
  cityId: string
  cityName: string
  flagEmoji: string
  arrivalDate: string
  departureDate: string
  numTravelers: number
  categories: string[]
  hostTypePreference: string
  noteToHosts: string | null
  budgetRange: string | null
  hostResponsesCount: number
  createdAt: string
}

export function HostTripFeed({ hostCityId }: { hostCityId: string }) {
  const [trips, setTrips] = useState<TripRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Response form state
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [respondedTrips, setRespondedTrips] = useState<Set<string>>(new Set())
  const [respondError, setRespondError] = useState('')

  useEffect(() => {
    fetch(`/api/trips?cityId=${hostCityId}&status=open`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setTrips(json.data.trips ?? [])
        else setError(json.error?.message ?? 'Failed to load trips')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [hostCityId])

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const handleRespond = async (tripId: string) => {
    setSubmitting(true)
    setRespondError('')
    try {
      const res = await fetch(`/api/trips/${tripId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: responseMessage || undefined }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setRespondedTrips(prev => new Set(prev).add(tripId))
        setRespondingTo(null)
        setResponseMessage('')
      } else {
        setRespondError(json.error?.message ?? 'Failed to respond')
      }
    } catch {
      setRespondError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#4A8E8E', fontSize: '14px' }}>
        Loading trip requests...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', color: '#dc2626', fontSize: '14px' }}>
        {error}
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fff', borderRadius: '16px', border: '2px dashed #d1d5db' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>✈️</div>
        <p style={{ fontWeight: 600, color: '#1a2e1a', marginBottom: '4px', fontSize: '15px' }}>No trip requests yet</p>
        <p style={{ color: '#2A8080', fontSize: '13px' }}>When travelers post trips to your city, they will appear here.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {trips.map(trip => {
        const hasResponded = respondedTrips.has(trip.id)
        const isResponding = respondingTo === trip.id
        const initial = (trip.travelerName ?? '?')[0].toUpperCase()

        return (
          <div key={trip.id} style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '20px',
            border: hasResponded ? '2px solid #bbf7d0' : '1px solid rgba(8,78,78,0.10)',
            transition: 'all 0.2s',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #5A7350, #3A5230)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '16px',
              }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#1a2e1a', fontSize: '15px' }}>
                    {trip.travelerName ?? 'Traveler'}
                  </span>
                  <span style={{ color: '#4A8E8E', fontSize: '13px' }}>
                    {trip.flagEmoji} {trip.cityName}
                  </span>
                  {hasResponded && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                      ✓ Responded
                    </span>
                  )}
                </div>
                <div style={{ color: '#2A8080', fontSize: '13px', marginTop: '2px' }}>
                  {fmt(trip.arrivalDate)} → {fmt(trip.departureDate)} · {trip.numTravelers} traveler{trip.numTravelers > 1 ? 's' : ''}
                  {trip.hostResponsesCount > 0 && ` · ${trip.hostResponsesCount} host${trip.hostResponsesCount > 1 ? 's' : ''} responded`}
                </div>
              </div>
            </div>

            {/* Categories & host type */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: trip.noteToHosts ? '12px' : '14px' }}>
              {trip.categories.map(c => (
                <span key={c} style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '12px', fontWeight: 600 }}>
                  {CATEGORY_LABELS[c] ?? c}
                </span>
              ))}
              {trip.hostTypePreference && trip.hostTypePreference !== 'any' && (
                <span style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 600 }}>
                  Prefers: {HOST_TYPE_LABELS[trip.hostTypePreference] ?? trip.hostTypePreference}
                </span>
              )}
              {trip.budgetRange && (
                <span style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fffbeb', color: '#92400e', fontSize: '12px', fontWeight: 600 }}>
                  💶 {trip.budgetRange}
                </span>
              )}
            </div>

            {/* Note from traveler */}
            {trip.noteToHosts && (
              <div style={{
                backgroundColor: '#FAF7F2', borderRadius: '10px', padding: '12px 14px',
                fontSize: '13px', color: '#1a2e1a', lineHeight: '1.6', marginBottom: '14px',
                borderLeft: '3px solid #E8621A',
              }}>
                &ldquo;{trip.noteToHosts}&rdquo;
              </div>
            )}

            {/* Response form */}
            {isResponding && !hasResponded && (
              <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '14px', border: '1px solid #e5e7eb' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#1a2e1a', marginBottom: '6px' }}>
                  Message to {trip.travelerName ?? 'traveler'} <span style={{ color: '#4A8E8E', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Introduce yourself — what makes you a great guide for this trip?"
                  value={responseMessage}
                  maxLength={1000}
                  onChange={e => setResponseMessage(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1.5px solid #d1d5db', fontSize: '14px', fontFamily: 'inherit',
                    resize: 'vertical', lineHeight: '1.5', backgroundColor: '#fff',
                  }}
                />
                {respondError && (
                  <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>{respondError}</div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => handleRespond(trip.id)}
                    disabled={submitting}
                    style={{
                      padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: '13px', color: '#fff',
                      backgroundColor: submitting ? '#9ca3af' : '#084E4E',
                    }}
                  >
                    {submitting ? 'Sending...' : 'Send Response'}
                  </button>
                  <button
                    onClick={() => { setRespondingTo(null); setResponseMessage(''); setRespondError('') }}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px', color: '#1a2e1a' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action button */}
            {!hasResponded && !isResponding && (
              <button
                onClick={() => setRespondingTo(trip.id)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                  cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#fff',
                  background: 'linear-gradient(135deg, #E8621A, #F07830)',
                  boxShadow: '0 2px 8px rgba(232,98,26,0.25)',
                  transition: 'all 0.2s',
                }}
              >
                Respond to this trip →
              </button>
            )}

            {hasResponded && (
              <div style={{ textAlign: 'center', padding: '8px', color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                ✓ You responded — the traveler will see your message when they subscribe
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
