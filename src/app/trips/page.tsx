'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:      { label: 'Open',      color: '#15803d', bg: '#dcfce7' },
  matched:   { label: 'Matched',   color: '#1d4ed8', bg: '#dbeafe' },
  expired:   { label: 'Expired',   color: '#2D6B3F', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2' },
}

const CATEGORY_LABELS: Record<string, string> = {
  'food-drink': 'Food & Drink', 'art-culture': 'Art & Culture', 'nature': 'Nature',
  'nightlife': 'Nightlife', 'history': 'History', 'family': 'Family',
}

interface TripWithCity {
  id: string
  cityName: string
  flagEmoji: string
  arrivalDate: string
  departureDate: string
  numTravelers: number
  categories: string[]
  hostTypePreference: string
  noteToHosts: string | null
  budgetRange: string | null
  status: string
  hostResponsesCount: number
  createdAt: string
}

export default function MyTripsPage() {
  const [trips, setTrips] = useState<TripWithCity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/trips?status=')
      .then(r => r.json())
      .then(json => {
        if (json.success) setTrips(json.data.trips ?? [])
        else setError(json.error?.message ?? 'Failed to load trips')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', paddingTop: '80px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Link href="/dashboard" style={{ color: '#0F3D22', fontWeight: 700, textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              ← Back to Dashboard
            </Link>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F3D22', fontFamily: 'var(--font-fraunces), Georgia, serif', marginBottom: '6px' }}>
              My Trips
            </h1>
            <p style={{ color: '#2D6B3F', fontSize: '15px' }}>Track your trip requests and see which hosts have responded.</p>
          </div>
          <Link
            href="/trips/post"
            style={{
              padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '15px',
              backgroundColor: '#0F3D22', color: '#fff', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}
          >
            + Post New Trip
          </Link>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#2D6B3F' }}>Loading your trips...</div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', color: '#dc2626', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: '#fff', borderRadius: '16px', border: '2px dashed #d1d5db' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
            <h3 style={{ fontWeight: 700, color: '#0F3D22', marginBottom: '8px', fontSize: '18px' }}>No trips posted yet</h3>
            <p style={{ color: '#2D6B3F', marginBottom: '24px', fontSize: '15px' }}>Post your first trip and local hosts will reach out to you.</p>
            <Link
              href="/trips/post"
              style={{ padding: '12px 28px', borderRadius: '10px', backgroundColor: '#0F3D22', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '15px' }}
            >
              Post Your First Trip
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {trips.map(trip => {
            const status = STATUS_LABELS[trip.status] ?? STATUS_LABELS.open
            return (
              <div key={trip.id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px' }}>{trip.flagEmoji}</span>
                      <h3 style={{ fontWeight: 700, color: '#0F3D22', fontSize: '17px', margin: 0 }}>{trip.cityName}</h3>
                    </div>
                    <p style={{ color: '#2D6B3F', fontSize: '13px' }}>
                      {fmt(trip.arrivalDate)} → {fmt(trip.departureDate)} · {trip.numTravelers} traveler{trip.numTravelers > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                    color: status.color, backgroundColor: status.bg,
                  }}>
                    {status.label}
                  </span>
                </div>

                {trip.noteToHosts && (
                  <p style={{ color: '#0F3D22', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {trip.noteToHosts}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {trip.categories.slice(0, 3).map(c => (
                      <span key={c} style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '12px', fontWeight: 600 }}>
                        {CATEGORY_LABELS[c] ?? c}
                      </span>
                    ))}
                    {trip.budgetRange && (
                      <span style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#fffbeb', color: '#92400e', fontSize: '12px', fontWeight: 600 }}>
                        💶 {trip.budgetRange}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/trips/${trip.id}`}
                    style={{
                      fontSize: '14px', fontWeight: 700, color: '#0F3D22', textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {trip.hostResponsesCount > 0
                      ? `View ${trip.hostResponsesCount} response${trip.hostResponsesCount > 1 ? 's' : ''} →`
                      : 'View details →'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
