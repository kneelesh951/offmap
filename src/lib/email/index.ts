/**
 * Email sending via Resend.
 * All emails are sent from a verified domain.
 * Templates are plain HTML strings for Phase 0 simplicity.
 * Replace with @react-email/components in Phase 1.
 */
import { Resend } from 'resend'

// Lazily construct the Resend client so importing this module never throws at
// build/import time when RESEND_API_KEY is absent (e.g. Vercel build step).
// The client is only created the first time an email is actually sent.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// ─── Shared styles ───────────────────────────────────────────────────────────

const STYLES = {
  heading: 'font-size:24px;font-weight:700;margin-bottom:16px;',
  body: 'font-size:15px;line-height:1.75;margin-bottom:24px;color:#3D3428;',
  muted: 'font-size:14px;color:#6B5E4E;margin-bottom:24px;',
  small: 'margin-top:24px;font-size:13px;color:#9E8E7A;',
  cta: 'display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;',
  card: 'background:#fff;border:1px solid rgba(28,22,18,0.1);border-radius:12px;padding:16px 20px;margin:20px 0;font-size:15px;color:#3D3428;',
  warning: 'background:#FEF3C7;border:1px solid #F59E0B;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#92400E;',
  success: 'background:#D1FAE5;border:1px solid #10B981;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#065F46;',
} as const

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF7F2;color:#1C1612;">
      <div style="margin-bottom:32px;">
        <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">Off<span style="color:#C55A28;">map</span></span>
      </div>
      ${content}
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(28,22,18,0.1);font-size:12px;color:#9E8E7A;line-height:1.7;">
        <p>Offmap GmbH · Berlin, Germany</p>
        <p>You received this email because you have an account at offmap.com</p>
        <p><a href="${APP_URL}/settings" style="color:#C55A28;">Manage email preferences</a></p>
      </div>
    </div>
  `
}

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

// ─── SEND FUNCTIONS ───────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// 1. WELCOME EMAIL — sent immediately after registration
// ──────────────────────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string, role: 'traveler' | 'host') {
  const subject = role === 'host'
    ? 'Welcome to Offmap — complete your host profile'
    : 'Welcome to Offmap — find your local'

  const content = role === 'host'
    ? `
      <h1 style="${STYLES.heading}">Welcome, ${name}!</h1>
      <p style="${STYLES.body}">
        Thank you for joining Offmap as a host. Travelers from around the world will soon be
        able to discover you and connect with you directly.
      </p>
      <p style="${STYLES.muted}">
        Your next step is to complete your host profile — add your bio, the languages you speak,
        your interests, and a few photos of yourself and your city.
      </p>
      <a href="${APP_URL}/host-dashboard/profile" style="${STYLES.cta}">
        Complete your profile →
      </a>
    `
    : `
      <h1 style="${STYLES.heading}">Welcome, ${name}!</h1>
      <p style="${STYLES.body}">
        You're now part of Offmap — the platform that connects curious travelers with the people
        who know their city best.
      </p>
      <p style="${STYLES.muted}">
        Browse our verified local hosts, and when you're ready to connect, subscribe from just €6
        for a day pass.
      </p>
      <a href="${APP_URL}/search" style="${STYLES.cta}">
        Find a local host →
      </a>
    `

  await getResend().emails.send({ from: FROM, to, subject, html: baseLayout(content) })
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. HOST MESSAGE NOTIFICATION — sent when traveler unlocks and messages a host
// ──────────────────────────────────────────────────────────────────────────────
export async function sendHostMessageNotification({
  hostEmail,
  hostName,
  travelerName,
  messagePreview,
  conversationId,
}: {
  hostEmail: string
  hostName: string
  travelerName: string
  messagePreview: string
  conversationId: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">You have a new message</h1>
    <p style="${STYLES.body}">
      Hi ${hostName}, <strong>${travelerName}</strong> has connected with you on Offmap
      and sent you their first message.
    </p>
    <div style="${STYLES.card};font-style:italic;color:#6B5E4E;">
      "${messagePreview}"
    </div>
    <p style="${STYLES.muted}">
      Reply within 24 hours to maintain your response rate and keep your profile ranking high.
    </p>
    <a href="${APP_URL}/conversations/${conversationId}" style="${STYLES.cta}">
      View message and reply →
    </a>
  `

  await getResend().emails.send({
    from: FROM,
    to: hostEmail,
    subject: `New message from ${travelerName} on Offmap`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. SUBSCRIPTION CONFIRMATION — sent after successful Stripe checkout
// ──────────────────────────────────────────────────────────────────────────────
export async function sendSubscriptionConfirmationEmail({
  to,
  name,
  plan,
  expiresAt,
}: {
  to: string
  name: string
  plan: string
  expiresAt: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">You're subscribed!</h1>
    <p style="${STYLES.body}">
      Hi ${name}, your <strong>${plan}</strong> subscription is now active.
      You can connect with any verified host in any of our cities.
    </p>
    <p style="${STYLES.muted}">Your subscription is active until <strong>${expiresAt}</strong>.</p>
    <a href="${APP_URL}/search" style="${STYLES.cta}">
      Find a local host now →
    </a>
    <p style="${STYLES.small}">
      You can cancel or manage your subscription at any time via your
      <a href="${APP_URL}/dashboard/subscription" style="color:#C55A28;">account settings</a>.
      As required by EU law, you have a 14-day right of withdrawal.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Your Offmap subscription is active',
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. PASSWORD RESET — sent when user requests password reset
// ──────────────────────────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const content = `
    <h1 style="${STYLES.heading}">Reset your password</h1>
    <p style="${STYLES.body}">
      We received a request to reset the password for your Offmap account.
      Click the button below to choose a new password.
    </p>
    <a href="${resetLink}" style="${STYLES.cta}">
      Reset password →
    </a>
    <p style="${STYLES.small}">
      This link expires in 10 minutes. If you didn't request a password reset,
      you can safely ignore this email.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Reset your Offmap password',
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. REVIEW REQUEST — sent after a session to prompt reviews
// ──────────────────────────────────────────────────────────────────────────────
export async function sendReviewRequestEmail({
  to,
  name,
  otherPersonName,
  conversationId,
}: {
  to: string
  name: string
  otherPersonName: string
  conversationId: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">How was your experience?</h1>
    <p style="${STYLES.body}">
      Hi ${name}, we hope your connection with <strong>${otherPersonName}</strong> went well.
      Reviews help build trust and help both hosts and travelers on the platform.
    </p>
    <a href="${APP_URL}/conversations/${conversationId}/review" style="${STYLES.cta}">
      Leave a review →
    </a>
    <p style="${STYLES.small}">
      It only takes 2 minutes. Your review helps future travelers and keeps our community strong.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `How was your time with ${otherPersonName}?`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. PAYMENT FAILED — sent when Stripe invoice.payment_failed fires
// ──────────────────────────────────────────────────────────────────────────────
export async function sendPaymentFailedEmail({
  to,
  name,
  plan,
}: {
  to: string
  name: string
  plan: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">Your payment didn't go through</h1>
    <p style="${STYLES.body}">
      Hi ${name}, we couldn't charge your card for your <strong>${plan}</strong> subscription.
      Please update your payment method to keep your access to Offmap hosts.
    </p>
    <div style="${STYLES.warning}">
      Your subscription is now paused. Update your payment method to restore access immediately.
    </div>
    <a href="${APP_URL}/dashboard" style="${STYLES.cta}">
      Update payment method →
    </a>
    <p style="${STYLES.small}">
      If you believe this is an error, check with your bank or try a different card.
      Your subscription will be cancelled automatically if payment isn't resolved within 7 days.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Action required: your Offmap payment failed',
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. SUBSCRIPTION EXPIRING — sent 3 days before subscription ends
// ──────────────────────────────────────────────────────────────────────────────
export async function sendSubscriptionExpiringEmail({
  to,
  name,
  plan,
  expiresAt,
}: {
  to: string
  name: string
  plan: string
  expiresAt: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">Your access expires in 3 days</h1>
    <p style="${STYLES.body}">
      Hi ${name}, your <strong>${plan}</strong> subscription ends on <strong>${expiresAt}</strong>.
      Renew now to keep chatting with your local hosts without interruption.
    </p>
    <a href="${APP_URL}/pricing" style="${STYLES.cta}">
      Renew subscription →
    </a>
    <p style="${STYLES.small}">
      If your subscription is set to auto-renew, no action is needed — this is just a heads up.
      You can manage your subscription in <a href="${APP_URL}/dashboard" style="color:#C55A28;">your dashboard</a>.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Your Offmap access expires soon',
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. SUBSCRIPTION CANCELLED — sent when Stripe subscription.deleted fires
// ──────────────────────────────────────────────────────────────────────────────
export async function sendSubscriptionCancelledEmail({
  to,
  name,
  accessUntil,
}: {
  to: string
  name: string
  accessUntil: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">Your subscription has been cancelled</h1>
    <p style="${STYLES.body}">
      Hi ${name}, your Offmap subscription has been cancelled.
      You'll still have access until <strong>${accessUntil}</strong>.
    </p>
    <p style="${STYLES.muted}">
      We're sorry to see you go. If you change your mind, you can resubscribe anytime
      and pick up right where you left off.
    </p>
    <a href="${APP_URL}/pricing" style="${STYLES.cta}">
      Resubscribe →
    </a>
    <p style="${STYLES.small}">
      Your conversations and reviews are preserved. You just won't be able to start new conversations
      until you resubscribe.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Your Offmap subscription has been cancelled',
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 9. BOOKING REQUESTED — sent to host when traveler books a session
// ──────────────────────────────────────────────────────────────────────────────
export async function sendBookingRequestedEmail({
  to,
  hostName,
  travelerName,
  sessionDate,
  amountCents,
  hostPayoutCents,
  bookingId,
}: {
  to: string
  hostName: string
  travelerName: string
  sessionDate: string | null
  amountCents: number
  hostPayoutCents: number
  bookingId: string
}) {
  const dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date to be confirmed'

  const content = `
    <h1 style="${STYLES.heading}">New booking request</h1>
    <p style="${STYLES.body}">
      Hi ${hostName}, <strong>${travelerName}</strong> wants to book a session with you!
    </p>
    <div style="${STYLES.card}">
      <p style="margin:0 0 8px;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin:0 0 8px;"><strong>Session fee:</strong> ${formatEuro(amountCents)}</p>
      <p style="margin:0;"><strong>Your payout:</strong> ${formatEuro(hostPayoutCents)} (after 15% platform fee)</p>
    </div>
    <div style="${STYLES.warning}">
      Please respond within 48 hours. If you don't respond, the booking will be automatically declined
      and the traveler will receive a full refund.
    </div>
    <a href="${APP_URL}/host-dashboard" style="${STYLES.cta}">
      View and respond →
    </a>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${travelerName} wants to book a session with you`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 10. BOOKING CONFIRMED — sent to traveler when host accepts
// ──────────────────────────────────────────────────────────────────────────────
export async function sendBookingConfirmedEmail({
  to,
  travelerName,
  hostName,
  sessionDate,
  totalCents,
  bookingId,
  city,
}: {
  to: string
  travelerName: string
  hostName: string
  sessionDate: string | null
  totalCents: number
  bookingId: string
  city?: string
}) {
  const dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date to be confirmed'

  const content = `
    <h1 style="${STYLES.heading}">Your session is confirmed!</h1>
    <p style="${STYLES.body}">
      Hi ${travelerName}, great news — <strong>${hostName}</strong> has accepted your booking!
    </p>
    <div style="${STYLES.success}">
      <p style="margin:0 0 8px;"><strong>Host:</strong> ${hostName}</p>
      ${city ? `<p style="margin:0 0 8px;"><strong>City:</strong> ${city}</p>` : ''}
      <p style="margin:0 0 8px;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin:0;"><strong>Total paid:</strong> ${formatEuro(totalCents)}</p>
    </div>
    <div style="${STYLES.warning}">
      <strong>Safety checklist before your meetup:</strong><br/>
      ✓ Do a video or phone call with your host to verify each other<br/>
      ✓ Meet in a public place first<br/>
      ✓ Share your plans with someone you trust
    </div>
    <a href="${APP_URL}/dashboard" style="${STYLES.cta}">
      View booking details →
    </a>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your session with ${hostName} is confirmed!`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 11. BOOKING DECLINED — sent to traveler when host declines
// ──────────────────────────────────────────────────────────────────────────────
export async function sendBookingDeclinedEmail({
  to,
  travelerName,
  hostName,
  refundCents,
}: {
  to: string
  travelerName: string
  hostName: string
  refundCents: number
}) {
  const content = `
    <h1 style="${STYLES.heading}">Booking not accepted</h1>
    <p style="${STYLES.body}">
      Hi ${travelerName}, unfortunately <strong>${hostName}</strong> wasn't able to accept your
      session request. This can happen when hosts have scheduling conflicts.
    </p>
    <div style="${STYLES.card}">
      <p style="margin:0;"><strong>Refund:</strong> ${formatEuro(refundCents)} — being processed to your original payment method. Allow 5–10 business days.</p>
    </div>
    <p style="${STYLES.muted}">
      Don't worry — there are many other amazing hosts in the city waiting to meet you.
    </p>
    <a href="${APP_URL}/search" style="${STYLES.cta}">
      Find other hosts →
    </a>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${hostName} couldn't accept your session`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 12. BOOKING CANCELLED — sent to the other party when someone cancels
// ──────────────────────────────────────────────────────────────────────────────
export async function sendBookingCancelledEmail({
  to,
  recipientName,
  cancelledByName,
  cancelledByRole,
  sessionDate,
  refundCents,
  refundPercent,
  platformCreditCents,
  reason,
}: {
  to: string
  recipientName: string
  cancelledByName: string
  cancelledByRole: 'traveler' | 'host'
  sessionDate: string | null
  refundCents: number
  refundPercent: number
  platformCreditCents: number
  reason?: string
}) {
  const dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date not set'

  const refundLine = refundCents > 0
    ? `<p style="margin:0 0 8px;"><strong>Refund:</strong> ${formatEuro(refundCents)} (${refundPercent}%)</p>`
    : `<p style="margin:0 0 8px;"><strong>Refund:</strong> No refund (per cancellation policy)</p>`

  const creditLine = platformCreditCents > 0
    ? `<p style="margin:0;"><strong>Platform credit:</strong> ${formatEuro(platformCreditCents)} added to your account</p>`
    : ''

  const content = `
    <h1 style="${STYLES.heading}">Session cancelled</h1>
    <p style="${STYLES.body}">
      Hi ${recipientName}, your session on <strong>${dateStr}</strong> has been cancelled
      by ${cancelledByRole === 'host' ? 'your host' : 'the traveler'} ${cancelledByName}.
    </p>
    ${reason ? `<p style="${STYLES.muted}"><strong>Reason:</strong> ${reason}</p>` : ''}
    <div style="${STYLES.card}">
      ${refundLine}
      ${creditLine}
    </div>
    <a href="${APP_URL}/dashboard" style="${STYLES.cta}">
      View details →
    </a>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your session on ${dateStr} has been cancelled`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 13. SESSION REMINDER (24H) — sent to both parties 24 hours before session
// ──────────────────────────────────────────────────────────────────────────────
export async function sendSessionReminderEmail({
  to,
  recipientName,
  otherPersonName,
  sessionDate,
  role,
}: {
  to: string
  recipientName: string
  otherPersonName: string
  sessionDate: string
  role: 'traveler' | 'host'
}) {
  const dateStr = new Date(sessionDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = new Date(sessionDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const content = `
    <h1 style="${STYLES.heading}">Your session is tomorrow</h1>
    <p style="${STYLES.body}">
      Hi ${recipientName}, just a reminder that your session with <strong>${otherPersonName}</strong>
      is coming up tomorrow.
    </p>
    <div style="${STYLES.card}">
      <p style="margin:0 0 8px;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin:0;"><strong>Time:</strong> ${timeStr}</p>
    </div>
    <div style="${STYLES.warning}">
      <strong>Quick checklist:</strong><br/>
      ✓ Verification call done?<br/>
      ✓ Meeting point confirmed?<br/>
      ✓ Plans shared with a friend?
    </div>
    <a href="${APP_URL}/dashboard" style="${STYLES.cta}">
      View session details →
    </a>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Reminder: your session with ${otherPersonName} is tomorrow`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 14. NEW MESSAGE NOTIFICATION — sent when user receives a message and is offline
// ──────────────────────────────────────────────────────────────────────────────
export async function sendNewMessageEmail({
  to,
  recipientName,
  senderName,
  messagePreview,
  conversationId,
}: {
  to: string
  recipientName: string
  senderName: string
  messagePreview: string
  conversationId: string
}) {
  const preview = messagePreview.length > 120 ? messagePreview.slice(0, 120) + '...' : messagePreview

  const content = `
    <h1 style="${STYLES.heading}">New message from ${senderName}</h1>
    <p style="${STYLES.body}">
      Hi ${recipientName}, you have a new message on Offmap.
    </p>
    <div style="${STYLES.card};font-style:italic;color:#6B5E4E;">
      "${preview}"
    </div>
    <a href="${APP_URL}/conversations/${conversationId}" style="${STYLES.cta}">
      Reply →
    </a>
    <p style="${STYLES.small}">
      You're receiving this because someone sent you a message on Offmap while you were away.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `New message from ${senderName}`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 15. ACCOUNT DELETION CONFIRMED — sent after GDPR deletion
// ──────────────────────────────────────────────────────────────────────────────
export async function sendAccountDeletionEmail(to: string, name: string) {
  const content = `
    <h1 style="${STYLES.heading}">Your account has been deleted</h1>
    <p style="${STYLES.body}">
      Hi ${name}, your Offmap account and personal data have been deleted as requested.
    </p>
    <div style="${STYLES.card}">
      <p style="margin:0 0 8px;"><strong>What's been removed:</strong></p>
      <p style="margin:0 0 4px;font-size:14px;color:#6B5E4E;">• Profile information and photos</p>
      <p style="margin:0 0 4px;font-size:14px;color:#6B5E4E;">• Conversations and message content</p>
      <p style="margin:0 0 4px;font-size:14px;color:#6B5E4E;">• Wishlists and preferences</p>
      <p style="margin:0 0 12px;font-size:14px;color:#6B5E4E;">• Login credentials</p>
      <p style="margin:0;font-size:13px;color:#9E8E7A;"><strong>Retained by law:</strong> Financial transaction records are kept for 10 years as required by German tax law (AO §147).</p>
    </div>
    <p style="${STYLES.muted}">
      If you ever want to come back, you're welcome to create a new account at any time.
    </p>
    <p style="${STYLES.small}">
      This is the last email you'll receive from Offmap. If you have questions about your data,
      contact <a href="mailto:privacy@offmap.com" style="color:#C55A28;">privacy@offmap.com</a>.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Your Offmap account has been deleted',
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 16. HOST PROFILE APPROVED — sent when admin approves a host profile
// ──────────────────────────────────────────────────────────────────────────────
export async function sendHostApprovedEmail({
  to,
  hostName,
  city,
}: {
  to: string
  hostName: string
  city: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">Your host profile is live!</h1>
    <p style="${STYLES.body}">
      Congratulations ${hostName}! Your host profile has been reviewed and approved.
      Travelers can now find you when searching for hosts in <strong>${city}</strong>.
    </p>
    <div style="${STYLES.success}">
      Your profile is now visible to all Offmap travelers. Start preparing for your first connection!
    </div>
    <p style="${STYLES.muted}">
      <strong>Tips to get more connections:</strong><br/>
      • Add high-quality photos of yourself and your city<br/>
      • Write a detailed bio about what makes your city special<br/>
      • Respond quickly to messages — fast responders rank higher
    </p>
    <a href="${APP_URL}/host-dashboard" style="${STYLES.cta}">
      View your profile →
    </a>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your host profile in ${city} is live!`,
    html: baseLayout(content),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// 17. HOST PROFILE REJECTED — sent when admin rejects/requests changes
// ──────────────────────────────────────────────────────────────────────────────
export async function sendHostRejectedEmail({
  to,
  hostName,
  reason,
}: {
  to: string
  hostName: string
  reason: string
}) {
  const content = `
    <h1 style="${STYLES.heading}">Your host profile needs updates</h1>
    <p style="${STYLES.body}">
      Hi ${hostName}, we've reviewed your host profile and it needs a few changes before
      it can go live.
    </p>
    <div style="${STYLES.warning}">
      <strong>What needs to change:</strong><br/>
      ${reason}
    </div>
    <p style="${STYLES.muted}">
      Please update your profile and it will be reviewed again. Most profiles are approved
      within 24 hours of resubmission.
    </p>
    <a href="${APP_URL}/host-dashboard/profile" style="${STYLES.cta}">
      Edit your profile →
    </a>
    <p style="${STYLES.small}">
      If you have questions, reply to this email or contact <a href="mailto:support@offmap.com" style="color:#C55A28;">support@offmap.com</a>.
    </p>
  `

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Your Offmap host profile needs updates',
    html: baseLayout(content),
  })
}
