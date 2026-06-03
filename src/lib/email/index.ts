/**
 * Email sending via Resend.
 * All emails are sent from a verified domain.
 * Templates are plain HTML strings for Phase 0 simplicity.
 * Replace with @react-email/components in Phase 1.
 */
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

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

// ─── SEND FUNCTIONS ───────────────────────────────────────────────────────────

/**
 * Welcome email — sent immediately after registration
 */
export async function sendWelcomeEmail(to: string, name: string, role: 'traveler' | 'host') {
  const subject = role === 'host'
    ? 'Welcome to Offmap — complete your host profile'
    : 'Welcome to Offmap — find your local'

  const content = role === 'host'
    ? `
      <h1 style="font-size:28px;font-weight:700;margin-bottom:16px;">Welcome, ${name}!</h1>
      <p style="font-size:16px;line-height:1.75;margin-bottom:24px;color:#3D3428;">
        Thank you for joining Offmap as a host. Travelers from around the world will soon be
        able to discover you and connect with you directly.
      </p>
      <p style="font-size:15px;line-height:1.75;margin-bottom:32px;color:#6B5E4E;">
        Your next step is to complete your host profile — add your bio, the languages you speak,
        your interests, and a few photos of yourself and your city.
      </p>
      <a href="${APP_URL}/host-dashboard/profile" style="display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;">
        Complete your profile →
      </a>
    `
    : `
      <h1 style="font-size:28px;font-weight:700;margin-bottom:16px;">Welcome, ${name}!</h1>
      <p style="font-size:16px;line-height:1.75;margin-bottom:24px;color:#3D3428;">
        You're now part of Offmap — the platform that connects curious travelers with the people
        who know their city best.
      </p>
      <p style="font-size:15px;line-height:1.75;margin-bottom:32px;color:#6B5E4E;">
        Browse our verified local hosts, and when you're ready to connect, subscribe from just €6
        for a day pass.
      </p>
      <a href="${APP_URL}/search" style="display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;">
        Find a local host →
      </a>
    `

  await resend.emails.send({ from: FROM, to, subject, html: baseLayout(content) })
}

/**
 * Sent to host when a traveler unlocks their profile and sends a first message
 */
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
    <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;">You have a new message</h1>
    <p style="font-size:15px;line-height:1.75;margin-bottom:8px;color:#3D3428;">
      Hi ${hostName}, <strong>${travelerName}</strong> has connected with you on Offmap
      and sent you their first message.
    </p>
    <div style="background:#fff;border:1px solid rgba(28,22,18,0.1);border-radius:12px;padding:16px 20px;margin:20px 0;font-size:15px;color:#6B5E4E;font-style:italic;">
      "${messagePreview}"
    </div>
    <p style="font-size:14px;color:#6B5E4E;margin-bottom:24px;">
      Reply within 24 hours to maintain your response rate and keep your profile ranking high.
    </p>
    <a href="${APP_URL}/conversations/${conversationId}" style="display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;">
      View message and reply →
    </a>
  `

  await resend.emails.send({
    from: FROM,
    to: hostEmail,
    subject: `New message from ${travelerName} on Offmap`,
    html: baseLayout(content),
  })
}

/**
 * Sent to traveler confirming their subscription is active
 */
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
    <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;">You're subscribed! 🎉</h1>
    <p style="font-size:15px;line-height:1.75;margin-bottom:8px;color:#3D3428;">
      Hi ${name}, your <strong>${plan}</strong> subscription is now active.
      You can connect with any verified host in any of our cities.
    </p>
    <p style="font-size:14px;color:#6B5E4E;margin-bottom:24px;">Your subscription is active until <strong>${expiresAt}</strong>.</p>
    <a href="${APP_URL}/search" style="display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;">
      Find a local host now →
    </a>
    <p style="margin-top:24px;font-size:13px;color:#9E8E7A;">
      You can cancel or manage your subscription at any time via your
      <a href="${APP_URL}/dashboard/subscription" style="color:#C55A28;">account settings</a>.
      As required by EU law, you have a 14-day right of withdrawal.
    </p>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Offmap subscription is active',
    html: baseLayout(content),
  })
}

/**
 * Password reset email
 */
export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const content = `
    <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;">Reset your password</h1>
    <p style="font-size:15px;line-height:1.75;margin-bottom:24px;color:#3D3428;">
      We received a request to reset the password for your Offmap account.
      Click the button below to choose a new password.
    </p>
    <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;">
      Reset password →
    </a>
    <p style="margin-top:24px;font-size:13px;color:#9E8E7A;">
      This link expires in 10 minutes. If you didn't request a password reset,
      you can safely ignore this email.
    </p>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Offmap password',
    html: baseLayout(content),
  })
}

/**
 * Review request — sent 24 hours after a conversation was first opened
 */
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
    <h1 style="font-size:24px;font-weight:700;margin-bottom:16px;">How was your experience?</h1>
    <p style="font-size:15px;line-height:1.75;margin-bottom:24px;color:#3D3428;">
      Hi ${name}, we hope your connection with <strong>${otherPersonName}</strong> went well.
      Reviews help build trust and help both hosts and travelers on the platform.
    </p>
    <a href="${APP_URL}/conversations/${conversationId}/review" style="display:inline-block;padding:14px 28px;background:#C55A28;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:100px;">
      Leave a review →
    </a>
    <p style="margin-top:24px;font-size:13px;color:#9E8E7A;">
      It only takes 2 minutes. Your review helps future travelers and keeps our community strong.
    </p>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `How was your time with ${otherPersonName}?`,
    html: baseLayout(content),
  })
}
