/**
 * Mock email — logs to console instead of sending real emails.
 * In dev you'll see exactly what would have been sent.
 */

const box = (title: string, body: object) => {
  console.log('\n' + '─'.repeat(60))
  console.log(`📧 MOCK EMAIL: ${title}`)
  console.log('─'.repeat(60))
  Object.entries(body).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
  console.log('─'.repeat(60) + '\n')
}

export const mockEmail = {
  // 1. Welcome
  sendWelcome: (to: string, name: string, role: string) =>
    box('Welcome email', { to, name, role, subject: `Welcome to Offmap, ${name}!` }),

  // 2. Host notification (first message)
  sendHostNotification: (hostEmail: string, hostName: string, travelerName: string) =>
    box('New message notification → host', { to: hostEmail, host: hostName, from: travelerName }),

  // 3. Subscription confirmed
  sendSubscriptionConfirmation: (to: string, name: string, plan: string, expiresAt: string) =>
    box('Subscription confirmed', { to, name, plan, expiresAt }),

  // 4. Password reset
  sendPasswordReset: (to: string, resetLink: string) =>
    box('Password reset', { to, resetLink }),

  // 5. Review request
  sendReviewRequest: (to: string, name: string, otherName: string) =>
    box('Review request', { to, name, about: otherName }),

  // 6. Payment failed
  sendPaymentFailed: (to: string, name: string, plan: string) =>
    box('Payment failed', { to, name, plan }),

  // 7. Subscription expiring
  sendSubscriptionExpiring: (to: string, name: string, plan: string, expiresAt: string) =>
    box('Subscription expiring (3-day warning)', { to, name, plan, expiresAt }),

  // 8. Subscription cancelled
  sendSubscriptionCancelled: (to: string, name: string, accessUntil: string) =>
    box('Subscription cancelled', { to, name, accessUntil }),

  // 9. Booking requested (to host)
  sendBookingRequested: (to: string, hostName: string, travelerName: string, amountCents: number) =>
    box('Booking requested → host', { to, host: hostName, traveler: travelerName, amount: `€${(amountCents / 100).toFixed(2)}` }),

  // 10. Booking confirmed (to traveler)
  sendBookingConfirmed: (to: string, travelerName: string, hostName: string, totalCents: number) =>
    box('Booking confirmed → traveler', { to, traveler: travelerName, host: hostName, total: `€${(totalCents / 100).toFixed(2)}` }),

  // 11. Booking declined (to traveler)
  sendBookingDeclined: (to: string, travelerName: string, hostName: string, refundCents: number) =>
    box('Booking declined → traveler', { to, traveler: travelerName, host: hostName, refund: `€${(refundCents / 100).toFixed(2)}` }),

  // 12. Booking cancelled
  sendBookingCancelled: (to: string, recipientName: string, cancelledBy: string, refundCents: number) =>
    box('Booking cancelled', { to, recipient: recipientName, cancelledBy, refund: `€${(refundCents / 100).toFixed(2)}` }),

  // 13. Session reminder (24h)
  sendSessionReminder: (to: string, recipientName: string, otherName: string, sessionDate: string) =>
    box('Session reminder (24h)', { to, recipient: recipientName, with: otherName, date: sessionDate }),

  // 14. New message notification
  sendNewMessage: (to: string, recipientName: string, senderName: string, preview: string) =>
    box('New message notification', { to, recipient: recipientName, from: senderName, preview: preview.slice(0, 80) }),

  // 15. Account deletion confirmed
  sendAccountDeletion: (to: string, name: string) =>
    box('Account deletion confirmed', { to, name }),

  // 16. Host profile approved
  sendHostApproved: (to: string, hostName: string, city: string) =>
    box('Host profile approved', { to, host: hostName, city }),

  // 17. Host profile rejected
  sendHostRejected: (to: string, hostName: string, reason: string) =>
    box('Host profile rejected', { to, host: hostName, reason }),
}
