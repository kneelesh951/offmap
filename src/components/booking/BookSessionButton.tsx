'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, ChevronLeft, ChevronDown, ChevronUp, X, MapPin, Check } from 'lucide-react'
import AvailabilityCalendar from './AvailabilityCalendar'

const GREEN = '#084E4E'
const ORANGE = '#E8621A'
const SERVICE_FEE_PCT = 5
const COMMISSION_PCT = 15

function formatCents(cents: number) {
  return `€${(cents / 100).toFixed(2)}`
}

function friendlyDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

interface SlotData {
  window: { start: string; end: string } | null
  slots: string[]
  maxSessionHours: number
  bookedSlots: { start: string; end: string; status: string }[]
}

interface Props {
  hostUserId: string
  hostName: string
  sessionRateCents: number
  conversationId?: string
}

type Step = 'calendar' | 'slots' | 'details' | 'confirm'

export function BookSessionButton({ hostUserId, hostName, sessionRateCents, conversationId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('calendar')

  // Step 1 — date
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Step 2 — slot + duration
  const [slotData, setSlotData] = useState<SlotData | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [duration, setDuration] = useState(1)

  // Step 3 — details
  const [interests, setInterests] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [note, setNote] = useState('')

  // Step 4 — confirm
  const [safetyChecks, setSafetyChecks] = useState([false, false, false, false, false, false])
  const allSafetyChecked = safetyChecks.every(Boolean)

  // Submit
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const maxDuration = slotData?.maxSessionHours ?? 4

  const baseAmount = sessionRateCents * duration
  const serviceFee = Math.round(baseAmount * SERVICE_FEE_PCT / 100)
  const travelerTotal = baseAmount + serviceFee
  const hostPayout = baseAmount - Math.round(baseAmount * COMMISSION_PCT / 100)

  // Fetch slots whenever date is selected
  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSlotData(null)
    setSelectedSlot(null)
    setDuration(1)
    fetch(`/api/hosts/${hostUserId}/slots?date=${selectedDate}`)
      .then(r => r.json())
      .then(j => { if (j.success) setSlotData(j.data) })
      .catch(() => {})
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, hostUserId])

  function resetAndClose() {
    setOpen(false)
    setStep('calendar')
    setSelectedDate(null)
    setSlotData(null)
    setSelectedSlot(null)
    setDuration(1)
    setInterests('')
    setMeetingPoint('')
    setNote('')
    setSafetyChecks([false, false, false])
    setError('')
    setSuccess(false)
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date)
  }

  function goToSlots() {
    if (!selectedDate) return
    setStep('slots')
  }

  function goToDetails() {
    if (!selectedSlot) return
    setStep('details')
  }

  function goToConfirm() {
    setStep('confirm')
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedSlot) return
    setError('')
    setLoading(true)

    const sessionDateTime = `${selectedDate}T${selectedSlot}`
    const fullNote = [
      interests ? `Interests: ${interests}` : '',
      note ? `Note: ${note}` : '',
    ].filter(Boolean).join(' · ') || undefined

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostUserId,
          sessionDate: sessionDateTime,
          sessionRateCents,
          durationHours: duration,
          noteFromTraveler: fullNote,
          meetingPoint: meetingPoint || undefined,
          conversationId,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Something went wrong.')
        return
      }
      setSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard?booked=true&host=${encodeURIComponent(hostName)}`)
      }, 1800)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    calendar: 'Choose a date',
    slots: 'Choose time & duration',
    details: 'Share your interests',
    confirm: 'Review & confirm',
  }

  const stepNumbers: Record<Step, number> = {
    calendar: 1, slots: 2, details: 3, confirm: 4,
  }

  function StepBack() {
    const back: Record<Step, Step | null> = {
      calendar: null, slots: 'calendar', details: 'slots', confirm: 'details',
    }
    const prev = back[step]
    if (!prev) return null
    return (
      <button onClick={() => setStep(prev)} className="text-white/60 hover:text-white transition-colors" aria-label="Back">
        <ChevronLeft size={20} />
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5"
        style={{ background: `linear-gradient(135deg, ${ORANGE}, #F07830)`, color: '#fff', boxShadow: '0 4px 20px rgba(232,98,26,0.40)' }}
      >
        <Calendar size={15} />
        Book a session
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-[80px]"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) resetAndClose() }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 160px)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#0C3520,#084E4E)' }}>
              <div className="flex items-center gap-3">
                <StepBack />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(245,166,35,0.85)' }}>
                    Step {stepNumbers[step]} of 4 — {stepTitles[step]}
                  </p>
                  <h2 className="font-serif text-lg font-bold text-white">with {hostName}</h2>
                </div>
              </div>
              <button onClick={resetAndClose} className="text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">

              {/* ── Success ──────────────────────────────────────────────────── */}
              {success && (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🎉</div>
                  <h3 className="font-serif text-xl font-bold mb-1" style={{ color: GREEN }}>Request sent!</h3>
                  <p className="text-sm text-gray-500">{hostName} will confirm within the response window.</p>
                  {selectedDate && selectedSlot && (
                    <p className="text-sm font-semibold mt-3" style={{ color: GREEN }}>
                      📅 {friendlyDate(selectedDate)} at {selectedSlot}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Your card will only be charged once {hostName} accepts.</p>
                </div>
              )}

              {/* ── Step 1: Calendar ─────────────────────────────────────────── */}
              {!success && step === 'calendar' && (
                <div className="space-y-5">
                  <AvailabilityCalendar
                    hostUserId={hostUserId}
                    selectedDate={selectedDate}
                    onSelect={handleDateSelect}
                  />
                  {selectedDate && (
                    <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: GREEN }}>
                      Selected: <strong>{friendlyDate(selectedDate)}</strong>
                    </div>
                  )}
                  <button
                    onClick={goToSlots}
                    disabled={!selectedDate}
                    className="w-full py-3.5 rounded-full text-white font-bold text-sm disabled:opacity-40 transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: selectedDate ? '0 4px 20px rgba(232,98,26,0.35)' : 'none' }}
                  >
                    Next: Choose time →
                  </button>
                </div>
              )}

              {/* ── Step 2: Time slots + duration ───────────────────────────── */}
              {!success && step === 'slots' && (
                <div className="space-y-5">
                  <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: GREEN }}>
                    📅 {selectedDate && friendlyDate(selectedDate)}
                  </div>

                  {slotsLoading && (
                    <div className="py-8 text-center text-sm text-gray-400">Loading available times…</div>
                  )}

                  {!slotsLoading && slotData && slotData.slots.length === 0 && (
                    <div className="py-6 text-center">
                      <p className="text-sm font-medium text-gray-600">No times available for this date.</p>
                      <p className="text-xs text-gray-400 mt-1">The host&apos;s schedule may be full. Try another day.</p>
                      <button onClick={() => setStep('calendar')} className="mt-4 text-sm font-semibold underline" style={{ color: ORANGE }}>
                        ← Back to calendar
                      </button>
                    </div>
                  )}

                  {!slotsLoading && slotData && slotData.slots.length > 0 && (
                    <>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: GREEN }}>
                          <Clock size={11} className="inline mr-1" />Available start times
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {slotData.slots.map(slot => (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                                selectedSlot === slot
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-gray-200 text-gray-700 hover:border-emerald-400'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: GREEN }}>
                          <Clock size={11} className="inline mr-1" />Duration
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setDuration(d => Math.max(1, d - 1))}
                            className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold hover:border-orange-400"
                            style={{ borderColor: 'rgba(8,78,78,0.20)', color: GREEN }}
                          >
                            <ChevronDown size={16} />
                          </button>
                          <span className="font-serif text-2xl font-bold w-16 text-center" style={{ color: GREEN }}>{duration}h</span>
                          <button
                            onClick={() => setDuration(d => Math.min(maxDuration, d + 1))}
                            className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold hover:border-orange-400"
                            style={{ borderColor: 'rgba(8,78,78,0.20)', color: GREEN }}
                          >
                            <ChevronUp size={16} />
                          </button>
                          <span className="text-sm text-gray-400 ml-1">max {maxDuration}h</span>
                        </div>
                      </div>

                      {selectedSlot && (
                        <div className="text-sm rounded-xl px-4 py-3" style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#92400E' }}>
                          ⏰ {selectedSlot} → {
                            (() => {
                              const [h, m] = selectedSlot.split(':').map(Number)
                              const end = h * 60 + m + duration * 60
                              return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
                            })()
                          } ({duration}h session · {formatCents(travelerTotal)} total)
                        </div>
                      )}

                      <button
                        onClick={goToDetails}
                        disabled={!selectedSlot}
                        className="w-full py-3.5 rounded-full text-white font-bold text-sm disabled:opacity-40 transition-all hover:-translate-y-0.5"
                        style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: selectedSlot ? '0 4px 20px rgba(232,98,26,0.35)' : 'none' }}
                      >
                        Next: Add details →
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── Step 3: Details ─────────────────────────────────────────── */}
              {!success && step === 'details' && (
                <div className="space-y-5">
                  <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: GREEN }}>
                    📅 {selectedDate && friendlyDate(selectedDate)} at {selectedSlot} · {duration}h
                  </div>

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
                      style={{ borderColor: 'rgba(8,78,78,0.18)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                      <MapPin size={11} className="inline mr-1" />Preferred meeting point <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={meetingPoint}
                      onChange={e => setMeetingPoint(e.target.value)}
                      maxLength={150}
                      placeholder="e.g. hotel lobby, metro station, city centre…"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ borderColor: 'rgba(8,78,78,0.18)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>
                      Anything else for {hostName}? <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      maxLength={300}
                      rows={2}
                      placeholder="Dietary restrictions, mobility needs, group size…"
                      className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ borderColor: 'rgba(8,78,78,0.18)' }}
                    />
                  </div>

                  <button
                    onClick={goToConfirm}
                    className="w-full py-3.5 rounded-full text-white font-bold text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: '0 4px 20px rgba(232,98,26,0.35)' }}
                  >
                    Next: Review & confirm →
                  </button>
                </div>
              )}

              {/* ── Step 4: Confirm ──────────────────────────────────────────── */}
              {!success && step === 'confirm' && (
                <div className="space-y-5">
                  {/* Booking summary */}
                  <div className="rounded-xl px-4 py-4 space-y-2" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>Booking summary</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date</span>
                      <span className="font-medium" style={{ color: GREEN }}>{selectedDate && friendlyDate(selectedDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Time</span>
                      <span className="font-medium" style={{ color: GREEN }}>{selectedSlot} ({duration}h)</span>
                    </div>
                    {meetingPoint && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Meeting point</span>
                        <span className="font-medium text-right max-w-[180px]" style={{ color: GREEN }}>{meetingPoint}</span>
                      </div>
                    )}
                  </div>

                  {/* Fee breakdown */}
                  <div className="rounded-xl p-4 space-y-2" style={{ background: '#F9F7F4', border: '1.5px solid rgba(8,78,78,0.10)' }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: GREEN }}>Price breakdown</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{duration}h × {formatCents(sessionRateCents)}/h</span>
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
                    <p className="text-[11px] font-medium" style={{ color: '#065F46' }}>
                      <Check size={10} className="inline mr-1" />Your card is authorised now but only charged when {hostName} accepts.
                    </p>
                  </div>

                  {/* Safety acknowledgment */}
                  <div className="rounded-xl p-4 space-y-3" style={{ background: '#FFFBEB', border: '1.5px solid #F59E0B' }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#92400E' }}>Before you confirm</p>
                    {[
                      'I confirm I am 18 years of age or older',
                      'I will verify my host via a video or phone call before meeting, and meet in a public place first',
                      'I have shared (or will share) my plans with someone I trust',
                      'I understand Offmap does not background-check or endorse hosts — I am meeting this person at my own discretion and risk',
                      'I understand Offmap\'s dispute resolution covers payments only — conduct or incidents during in-person meetups are outside the platform\'s scope',
                      <>I have read and agree to Offmap&apos;s <a href="/terms#meetings" target="_blank" className="underline font-semibold" style={{ color: '#92400E' }}>Terms of Service</a>, including the section on in-person meetings</>,
                    ].map((label, i) => (
                      <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={safetyChecks[i]}
                          onChange={() => setSafetyChecks(prev => prev.map((v, j) => j === i ? !v : v))}
                          className="mt-0.5 accent-amber-600 w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-[12px] leading-snug" style={{ color: '#78350F' }}>{label}</span>
                      </label>
                    ))}
                  </div>

                  {error && (
                    <div className="text-[13px] px-4 py-3 rounded-xl font-medium"
                      style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={loading || !allSafetyChecked}
                    className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: '0 4px 24px rgba(232,98,26,0.40)' }}
                  >
                    {loading ? 'Sending request…' : `Send booking request — ${formatCents(travelerTotal)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
