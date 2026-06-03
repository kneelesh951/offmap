/**
 * Cancellation policy engine — pure business logic, no DB or HTTP calls.
 * Used by both mock and production API routes.
 *
 * Rules are defined in docs/BOOKING_CANCELLATION_POLICY.md
 */

export type CancellationActor = 'traveler' | 'host'

export interface CancellationResult {
  refundPercent: number            // 0 | 50 | 100
  refundAmountCents: number        // actual EUR cents returned to traveler
  platformCreditCents: number      // compensation credit issued to traveler (for host cancellations)
  strikesApplied: number           // 0 | 1 | 2
  payoutFreezedays: number         // 0 | 7 | 14
  warningIssued: boolean
  reason: string                   // human-readable explanation
  cancellationType: string
}

const COOLING_OFF_MS   = 60 * 60 * 1000           // 1 hour
const H24_MS           = 24 * 60 * 60 * 1000
const H48_MS           = 48 * 60 * 60 * 1000

/**
 * Calculate what happens when a booking is cancelled.
 *
 * @param actor          Who is cancelling
 * @param bookedAt       When the booking was originally created
 * @param sessionDate    When the session is scheduled (null = not yet set)
 * @param travelerTotalCents  What the traveler originally paid
 * @param isNoShow       Whether this is a no-show (actor = host or traveler)
 */
export function calculateCancellation(
  actor: CancellationActor,
  bookedAt: Date,
  sessionDate: Date | null,
  travelerTotalCents: number,
  isNoShow = false,
): CancellationResult {
  const now = Date.now()
  const bookingAge = now - bookedAt.getTime()
  const msUntilSession = sessionDate ? sessionDate.getTime() - now : null

  // ── HOST CANCELLATION / NO-SHOW ──────────────────────────────────────────────
  if (actor === 'host') {
    if (isNoShow) {
      return {
        refundPercent: 100,
        refundAmountCents: travelerTotalCents,
        platformCreditCents: 2500, // €25
        strikesApplied: 2,
        payoutFreezedays: 14,
        warningIssued: false,
        reason: 'Host no-show: full refund + €25 platform credit issued to traveler. 2 strikes applied.',
        cancellationType: 'no_show_host',
      }
    }

    if (msUntilSession === null || msUntilSession >= H48_MS) {
      return {
        refundPercent: 100,
        refundAmountCents: travelerTotalCents,
        platformCreditCents: 0,
        strikesApplied: 0,
        payoutFreezedays: 0,
        warningIssued: true,
        reason: 'Host cancelled 48h+ before session: full refund to traveler. Warning issued.',
        cancellationType: 'host',
      }
    }

    if (msUntilSession >= H24_MS) {
      return {
        refundPercent: 100,
        refundAmountCents: travelerTotalCents,
        platformCreditCents: 1000, // €10
        strikesApplied: 1,
        payoutFreezedays: 0,
        warningIssued: false,
        reason: 'Host cancelled 24–48h before session: full refund + €10 credit to traveler. 1 strike.',
        cancellationType: 'host',
      }
    }

    // < 24h
    return {
      refundPercent: 100,
      refundAmountCents: travelerTotalCents,
      platformCreditCents: 2000, // €20
      strikesApplied: 2,
      payoutFreezedays: 7,
      warningIssued: false,
      reason: 'Host cancelled <24h before session: full refund + €20 credit. 2 strikes. Payout frozen 7 days.',
      cancellationType: 'host',
    }
  }

  // ── TRAVELER CANCELLATION / NO-SHOW ──────────────────────────────────────────
  if (isNoShow) {
    // Traveler no-show — host gets 30%, platform keeps 70%
    const hostShareCents = Math.round(travelerTotalCents * 0.30)
    return {
      refundPercent: 0,
      refundAmountCents: 0,
      platformCreditCents: 0,
      strikesApplied: 0,
      payoutFreezedays: 0,
      warningIssued: false,
      reason: 'Traveler no-show: no refund. Host receives 30% of session amount.',
      cancellationType: 'no_show_traveler',
    }
  }

  // Cooling-off: within 1 hour of original booking
  if (bookingAge <= COOLING_OFF_MS) {
    return {
      refundPercent: 100,
      refundAmountCents: travelerTotalCents,
      platformCreditCents: 0,
      strikesApplied: 0,
      payoutFreezedays: 0,
      warningIssued: false,
      reason: 'Cooling-off period: cancelled within 1 hour of booking. Full refund.',
      cancellationType: 'traveler',
    }
  }

  // No session date set or >48h remaining
  if (msUntilSession === null || msUntilSession >= H48_MS) {
    return {
      refundPercent: 100,
      refundAmountCents: travelerTotalCents,
      platformCreditCents: 0,
      strikesApplied: 0,
      payoutFreezedays: 0,
      warningIssued: false,
      reason: 'Cancelled 48h+ before session: full refund.',
      cancellationType: 'traveler',
    }
  }

  if (msUntilSession >= H24_MS) {
    const refundAmountCents = Math.round(travelerTotalCents * 0.50)
    return {
      refundPercent: 50,
      refundAmountCents,
      platformCreditCents: 0,
      strikesApplied: 0,
      payoutFreezedays: 0,
      warningIssued: false,
      reason: 'Cancelled 24–48h before session: 50% refund.',
      cancellationType: 'traveler',
    }
  }

  // < 24h — no refund
  return {
    refundPercent: 0,
    refundAmountCents: 0,
    platformCreditCents: 0,
    strikesApplied: 0,
    payoutFreezedays: 0,
    warningIssued: false,
    reason: 'Cancelled <24h before session: no refund.',
    cancellationType: 'traveler',
  }
}

/**
 * Preview — same as calculateCancellation but returns a UI-friendly summary.
 * Call this before showing the "confirm cancellation" modal to the user.
 */
export function previewCancellation(
  actor: CancellationActor,
  bookedAt: Date,
  sessionDate: Date | null,
  travelerTotalCents: number,
): {
  refundAmount: string
  refundPercent: number
  platformCredit: string | null
  warning: string
} {
  const result = calculateCancellation(actor, bookedAt, sessionDate, travelerTotalCents)
  const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`
  return {
    refundAmount: fmt(result.refundAmountCents),
    refundPercent: result.refundPercent,
    platformCredit: result.platformCreditCents > 0 ? fmt(result.platformCreditCents) : null,
    warning: result.reason,
  }
}
