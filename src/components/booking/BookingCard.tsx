'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const GREEN  = '#0F3D22'
const ORANGE = '#E8621A'

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: 'rgba(184,92,42,0.12)',   text: '#B85C2A', label: 'Awaiting confirmation' },
  accepted:  { bg: 'rgba(45,106,79,0.12)',   text: '#2D6A4F', label: 'Confirmed'              },
  declined:  { bg: 'rgba(220,38,38,0.10)',   text: '#DC2626', label: 'Declined'               },
  completed: { bg: 'rgba(59,108,183,0.12)',  text: '#3B6CB7', label: 'Completed'              },
  cancelled: { bg: 'rgba(107,114,128,0.12)', text: '#6B7280', label: 'Cancelled'              },
  disputed:  { bg: 'rgba(220,38,38,0.10)',   text: '#DC2626', label: 'Disputed — under review'},
  refunded:  { bg: 'rgba(59,108,183,0.12)',  text: '#3B6CB7', label: 'Refunded'               },
}

interface Booking {
  id: string
  status: string
  durationHours: number
  travelerTotalCents: number
  hostPayoutCents: number
  platformCreditCents: number
  refundPercent: number | null
  refundAmountCents: number | null
  noteFromTraveler?: string | null
  sessionDate?: string | null
  createdAt: string
  cancellationReason?: string | null
  hostId?: string
  conversationId?: string | null
  // Populated server-side
  travelerName?: string
  hostName?: string
}

interface Props {
  booking: Booking
  role: 'traveler' | 'host'
}

function fmt(cents: number) { return `€${(cents / 100).toFixed(2)}` }

// ── Cancel Confirmation Modal ────────────────────────────────────────────────
function CancelModal({
  booking, role, onClose, onDone,
}: {
  booking: Booking; role: 'traveler' | 'host'; onClose: () => void; onDone: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ refundAmount: string; warning: string } | null>(null)
  const [error, setError] = useState('')

  // Calculate preview on mount
  useState(() => {
    const baseAmount  = booking.travelerTotalCents
    const bookedAt    = new Date(booking.createdAt)
    const sessionDate = booking.sessionDate ? new Date(booking.sessionDate) : null
    const now         = Date.now()
    const bookingAge  = now - bookedAt.getTime()
    const msUntil     = sessionDate ? sessionDate.getTime() - now : null
    const H24 = 86400000
    const H48 = 172800000

    let refundPct = 100
    let warning   = ''

    if (role === 'host') {
      if (msUntil !== null && msUntil < H24) {
        refundPct = 100; warning = 'Cancelling <24h before session: 2 strikes + payout frozen 7 days.'
      } else if (msUntil !== null && msUntil < H48) {
        refundPct = 100; warning = 'Cancelling 24–48h before session: 1 strike applied.'
      } else {
        refundPct = 100; warning = 'Cancelling 48h+ before: warning issued, no strike.'
      }
    } else {
      if (bookingAge <= 3600000) {
        refundPct = 100; warning = 'Cooling-off period active — you\'ll receive a full refund.'
      } else if (msUntil === null || msUntil >= H48) {
        refundPct = 100; warning = 'Cancelling 48h+ before session — full refund.'
      } else if (msUntil >= H24) {
        refundPct = 50; warning = 'Cancelling 24–48h before session — 50% refund.'
      } else {
        refundPct = 0; warning = 'Cancelling <24h before session — no refund.'
      }
    }

    const refundAmountCents = Math.round(baseAmount * refundPct / 100)
    setPreview({
      refundAmount: fmt(refundAmountCents),
      warning,
    })
  })

  async function handleCancel() {
    setError(''); setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? 'Something went wrong'); return }
      onDone()
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08]"
          style={{ background: '#FEF2F2' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} color="#DC2626" />
            <h2 className="font-bold text-base" style={{ color: '#DC2626' }}>Cancel booking</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {preview && (
            <div className="rounded-xl p-4" style={{ background: '#FFF7ED', border: '1.5px solid rgba(232,98,26,0.25)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: ORANGE }}>Refund: {preview.refundAmount}</p>
              <p className="text-xs text-gray-500">{preview.warning}</p>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: GREEN }}>
              Reason <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={300}
              placeholder="Let the other party know why you're cancelling…"
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ borderColor: 'rgba(15,61,34,0.18)' }} />
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-full border text-sm font-semibold"
              style={{ borderColor: 'rgba(15,61,34,0.22)', color: GREEN }}>
              Keep booking
            </button>
            <button onClick={handleCancel} disabled={loading}
              className="flex-1 py-3 rounded-full text-white text-sm font-bold disabled:opacity-60"
              style={{ background: '#DC2626' }}>
              {loading ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main BookingCard ─────────────────────────────────────────────────────────
export function BookingCard({ booking, role }: Props) {
  const router = useRouter()
  const [showCancel, setShowCancel] = useState(false)
  const [acting, setActing] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)

  const s = STATUS_STYLE[booking.status] ?? STATUS_STYLE.pending
  const otherParty = role === 'traveler' ? booking.hostName : booking.travelerName

  async function act(action: string) {
    setActing(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (res.ok) {
        setFeedback({ msg: json.data?.message ?? `Done: ${action}`, ok: true })
        setTimeout(() => { router.refresh(); setFeedback(null) }, 1800)
      } else {
        setFeedback({ msg: json.error?.message ?? 'Error', ok: false })
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch { setFeedback({ msg: 'Network error', ok: false }) }
    finally { setActing(false) }
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.80)', border: '2px solid rgba(15,61,34,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>

        {/* Header row */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'rgba(15,61,34,0.08)', border: '1px solid rgba(15,61,34,0.12)' }}>🗓️</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px]" style={{ color: GREEN }}>
              {role === 'traveler' ? (
                <>Session with{' '}
                  <Link
                    href={booking.hostId ? `/hosts/${booking.hostId}` : '#'}
                    className="underline underline-offset-2 hover:opacity-70 transition-opacity"
                    style={{ color: GREEN }}
                  >
                    {otherParty ?? 'Host'}
                  </Link>
                </>
              ) : `Booking from ${otherParty ?? 'Traveler'}`}
            </div>
            <div className="text-[12px] text-gray-500">
              {booking.sessionDate
                ? `📅 ${new Date(booking.sessionDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(booking.sessionDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · `
                : ''}
              {booking.durationHours}h · {role === 'traveler' ? `You pay ${fmt(booking.travelerTotalCents)}` : `You earn ${fmt(booking.hostPayoutCents)}`}
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full flex-shrink-0"
            style={{ background: s.bg, color: s.text, border: `1.5px solid ${s.text}30` }}>
            {s.label}
          </span>
        </div>

        {/* Note */}
        {booking.noteFromTraveler && (
          <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl text-[12px] italic text-gray-500"
            style={{ background: 'rgba(15,61,34,0.04)', border: '1px solid rgba(15,61,34,0.08)' }}>
            "{booking.noteFromTraveler}"
          </div>
        )}

        {/* Cancellation info */}
        {booking.status === 'cancelled' && booking.refundAmountCents !== null && (
          <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl text-[12px]"
            style={{ background: '#FFF7ED', border: '1px solid rgba(232,98,26,0.20)' }}>
            <span className="font-semibold" style={{ color: ORANGE }}>Refund: {fmt(booking.refundAmountCents)}</span>
            {booking.cancellationReason && <span className="text-gray-500 ml-2">— {booking.cancellationReason}</span>}
            {(booking.platformCreditCents ?? 0) > 0 && (
              <div className="mt-1 text-green-700 font-medium">+{fmt(booking.platformCreditCents)} platform credit added to your account</div>
            )}
          </div>
        )}

        {/* Feedback flash */}
        {feedback && (
          <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-2"
            style={{ background: feedback.ok ? '#EAF5EE' : '#FEF2F2', color: feedback.ok ? GREEN : '#DC2626' }}>
            {feedback.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {feedback.msg}
          </div>
        )}

        {/* Actions */}
        {!feedback && (
          <div className="px-5 pb-5 flex gap-2 flex-wrap">
            {/* HOST actions on pending */}
            {role === 'host' && booking.status === 'pending' && (
              <>
                <button onClick={() => act('accept')} disabled={acting}
                  className="px-5 py-2 rounded-full text-white text-[13px] font-bold disabled:opacity-60 transition-all hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg,#2D6A4F,#1a4a2e)`, boxShadow: '0 2px 12px rgba(45,106,79,0.35)' }}>
                  {acting ? '…' : '✓ Accept'}
                </button>
                <button onClick={() => act('decline')} disabled={acting}
                  className="px-5 py-2 rounded-full text-[13px] font-bold disabled:opacity-60 border"
                  style={{ borderColor: 'rgba(220,38,38,0.30)', color: '#DC2626' }}>
                  {acting ? '…' : '✗ Decline'}
                </button>
              </>
            )}

            {/* Message host — traveler, booking accepted, has a conversation */}
            {role === 'traveler' && booking.status === 'accepted' && booking.conversationId && (
              <Link
                href={`/conversations/${booking.conversationId}`}
                className="px-5 py-2 rounded-full text-[13px] font-semibold border transition-colors hover:bg-green-50 inline-flex items-center gap-1.5"
                style={{ borderColor: 'rgba(15,61,34,0.25)', color: GREEN }}>
                💬 Message host
              </Link>
            )}

            {/* Report no-show — traveler, session accepted, within 2h after session time */}
            {role === 'traveler' && booking.status === 'accepted' && booking.sessionDate && (
              (() => {
                const sessionEnd = new Date(booking.sessionDate).getTime()
                const twoHoursAfter = sessionEnd + 2 * 3600000
                const now = Date.now()
                if (now >= sessionEnd && now <= twoHoursAfter) {
                  return (
                    <button onClick={() => act('report_no_show')} disabled={acting}
                      className="px-5 py-2 rounded-full text-[13px] font-bold border disabled:opacity-60"
                      style={{ borderColor: 'rgba(220,38,38,0.30)', color: '#DC2626' }}>
                      🚩 Report no-show
                    </button>
                  )
                }
                return null
              })()
            )}

            {/* Cancel — available on pending or accepted, before session time */}
            {['pending', 'accepted'].includes(booking.status) && (
              (() => {
                const sessionInFuture = !booking.sessionDate || new Date(booking.sessionDate).getTime() > Date.now()
                if (!sessionInFuture) return null
                return (
                  <button onClick={() => setShowCancel(true)}
                    className="px-5 py-2 rounded-full text-[13px] font-semibold border transition-colors hover:bg-red-50"
                    style={{ borderColor: 'rgba(220,38,38,0.25)', color: '#DC2626' }}>
                    Cancel booking
                  </button>
                )
              })()
            )}
          </div>
        )}
      </div>

      {showCancel && (
        <CancelModal
          booking={booking}
          role={role}
          onClose={() => setShowCancel(false)}
          onDone={() => { setShowCancel(false); router.refresh() }}
        />
      )}
    </>
  )
}
