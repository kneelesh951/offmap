'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, ChevronDown, ChevronUp, X, MapPin } from 'lucide-react'

const GREEN = '#0F3D22'
const ORANGE = '#E8621A'
const SERVICE_FEE_PCT = 5
const COMMISSION_PCT = 15

function formatCents(cents: number) {
  return `€${(cents / 100).toFixed(2)}`
}

// Min date = tomorrow
function minDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

interface Props {
  hostUserId: string
  hostName: string
  sessionRateCents: number
  conversationId?: string
}

export function BookSessionButton({ hostUserId, hostName, sessionRateCents, conversationId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(1)
  const [sessionDate, setSessionDate] = useState('')
  const [sessionTime, setSessionTime] = useState('10:00')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [interests, setInterests] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const baseAmount     = sessionRateCents * duration
  const serviceFee     = Math.round(baseAmount * SERVICE_FEE_PCT / 100)
  const travelerTotal  = baseAmount + serviceFee
  const commission     = Math.round(baseAmount * COMMISSION_PCT / 100)
  const hostPayout     = baseAmount - commission

  async function handleBook() {
    setError('')
    if (!sessionDate) { setError('Please pick a date for your session.'); return }
    setLoading(true)
    const sessionDateTime = sessionDate && sessionTime
      ? new Date(`${sessionDate}T${sessionTime}:00`).toISOString()
      : null
    const fullNote = [
      interests ? `Interests: ${interests}` : '',
      meetingPoint ? `Meeting point: ${meetingPoint}` : '',
      note ? `Note: ${note}` : '',
    ].filter(Boolean).join(' · ') || undefined
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostUserId,
          sessionRateCents,
          durationHours: duration,
          sessionDate: sessionDateTime,
          noteFromTraveler: fullNote,
          conversationId,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error?.code === 'SUBSCRIPTION_REQUIRED') {
          setError('You need an active subscription to book sessions.')
        } else {
          setError(json.error?.message ?? 'Something went wrong.')
        }
        return
      }
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        router.refresh()
      }, 2000)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5"
        style={{ background: `linear-gradient(135deg, ${ORANGE}, #F07830)`, color: '#fff', boxShadow: '0 4px 20px rgba(232,98,26,0.40)' }}
      >
        <Calendar size={15} />
        Book a session
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08]"
              style={{ background: 'linear-gradient(135deg,#0C3520,#0F3D22)' }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(245,166,35,0.85)' }}>Book a session</p>
                <h2 className="font-serif text-lg font-bold text-white">with {hostName}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {success ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🎉</div>
                  <h3 className="font-serif text-xl font-bold mb-1" style={{ color: GREEN }}>Booking requested!</h3>
                  <p className="text-sm text-gray-500">{hostName} will confirm shortly.</p>
                  {sessionDate && (
                    <p className="text-sm font-semibold mt-2" style={{ color: GREEN }}>
                      📅 {new Date(`${sessionDate}T${sessionTime}`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {sessionTime}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                        <Calendar size={11} className="inline mr-1" />Date <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={sessionDate}
                        min={minDate()}
                        onChange={e => setSessionDate(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        style={{ borderColor: 'rgba(15,61,34,0.18)', color: GREEN }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                        <Clock size={11} className="inline mr-1" />Start time
                      </label>
                      <input
                        type="time"
                        value={sessionTime}
                        onChange={e => setSessionTime(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        style={{ borderColor: 'rgba(15,61,34,0.18)', color: GREEN }}
                      />
                    </div>
                  </div>

                  {/* Duration picker */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                      <Clock size={11} className="inline mr-1" />Duration
                    </label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setDuration(d => Math.max(1, d - 1))}
                        className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold transition-colors hover:border-orange-400"
                        style={{ borderColor: 'rgba(15,61,34,0.20)', color: GREEN }}>
                        <ChevronDown size={16} />
                      </button>
                      <span className="font-serif text-2xl font-bold w-16 text-center" style={{ color: GREEN }}>
                        {duration}h
                      </span>
                      <button onClick={() => setDuration(d => Math.min(8, d + 1))}
                        className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold transition-colors hover:border-orange-400"
                        style={{ borderColor: 'rgba(15,61,34,0.20)', color: GREEN }}>
                        <ChevronUp size={16} />
                      </button>
                      <span className="text-sm text-gray-400 ml-1">max 8h</span>
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                      What do you want to experience? <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={interests}
                      onChange={e => setInterests(e.target.value)}
                      maxLength={150}
                      placeholder="e.g. street food, hidden bars, local markets, history…"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ borderColor: 'rgba(15,61,34,0.18)' }}
                    />
                  </div>

                  {/* Meeting point */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                      <MapPin size={11} className="inline mr-1" />Preferred meeting point <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={meetingPoint}
                      onChange={e => setMeetingPoint(e.target.value)}
                      maxLength={150}
                      placeholder="e.g. my hotel lobby, a metro station, city centre…"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ borderColor: 'rgba(15,61,34,0.18)' }}
                    />
                  </div>

                  {/* Extra note */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                      Anything else for {hostName}? <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      maxLength={300}
                      rows={2}
                      placeholder="Dietary restrictions, mobility needs, group size, languages…"
                      className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ borderColor: 'rgba(15,61,34,0.18)' }}
                    />
                  </div>

                  {/* Fee breakdown */}
                  <div className="rounded-xl p-4 space-y-2" style={{ background: '#F9F7F4', border: '1.5px solid rgba(15,61,34,0.10)' }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: GREEN }}>Price breakdown</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Session rate ({duration}h × {formatCents(sessionRateCents)})</span>
                      <span className="font-medium" style={{ color: GREEN }}>{formatCents(baseAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Service fee ({SERVICE_FEE_PCT}%)</span>
                      <span className="font-medium" style={{ color: GREEN }}>{formatCents(serviceFee)}</span>
                    </div>
                    <div className="border-t border-black/[0.08] pt-2 mt-1 flex justify-between">
                      <span className="font-bold text-sm" style={{ color: GREEN }}>You pay</span>
                      <span className="font-bold text-lg" style={{ color: ORANGE }}>{formatCents(travelerTotal)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Host receives {formatCents(hostPayout)} after platform commission
                    </p>
                  </div>

                  {error && (
                    <div className="text-[13px] px-4 py-3 rounded-xl font-medium"
                      style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                      {error}
                    </div>
                  )}

                  {/* Confirm button */}
                  <button
                    onClick={handleBook}
                    disabled={loading}
                    className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: '0 4px 24px rgba(232,98,26,0.40)' }}
                  >
                    {loading ? 'Sending request…' : `Confirm booking — ${formatCents(travelerTotal)}`}
                  </button>

                  <p className="text-center text-[11px] text-gray-400">
                    No payment charged yet — {hostName} must accept first
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
