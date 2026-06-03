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
  sendWelcome: (to: string, name: string, role: string) =>
    box('Welcome email', { to, name, role, subject: `Welcome to Offmap, ${name}!` }),

  sendHostNotification: (hostEmail: string, hostName: string, travelerName: string) =>
    box('New message notification → host', { to: hostEmail, host: hostName, from: travelerName }),

  sendSubscriptionConfirmation: (to: string, name: string, plan: string, expiresAt: string) =>
    box('Subscription confirmed', { to, name, plan, expiresAt }),

  sendPasswordReset: (to: string, resetLink: string) =>
    box('Password reset', { to, resetLink }),

  sendReviewRequest: (to: string, name: string, otherName: string) =>
    box('Review request', { to, name, about: otherName }),
}
