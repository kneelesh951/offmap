import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email(),
  topic:   z.enum(['general', 'booking', 'account', 'host', 'payment', 'safety', 'other']),
  message: z.string().min(10).max(2000),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please fill in all fields correctly.' } }, { status: 422 })
  }

  const { name, email, topic, message } = parsed.data

  // ── Mock mode — log to console ────────────────────────────────────────────
  if (process.env.MOCK_MODE === 'true') {
    console.log('\n📧 [Mock] Contact form submission:')
    console.log(`  Name:    ${name}`)
    console.log(`  Email:   ${email}`)
    console.log(`  Topic:   ${topic}`)
    console.log(`  Message: ${message}\n`)
    return NextResponse.json({ success: true, data: { message: 'Message received.' } })
  }

  // ── Production — send via Resend ──────────────────────────────────────────
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const topicLabels: Record<string, string> = {
      general: 'General question',
      booking: 'Booking issue',
      account: 'Account / login problem',
      host:    'Host application',
      payment: 'Payment / subscription',
      safety:  'Safety concern',
      other:   'Other',
    }

    // Send to support inbox
    await resend.emails.send({
      from:    `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to:      ['support@offmap.com'],
      reply_to: email,
      subject: `[${topicLabels[topic]}] Contact from ${name}`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Topic:</strong> ${topicLabels[topic]}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    })

    // Send confirmation to user
    await resend.emails.send({
      from:    `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to:      [email],
      subject: `We received your message — Offmap Support`,
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for reaching out. We've received your message and will get back to you shortly.</p>
        <p><strong>Topic:</strong> ${topicLabels[topic]}</p>
        <p><strong>Your message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
        <br/>
        <p>— The Offmap Team</p>
        <p style="color:#999;font-size:12px;">For urgent safety issues: safety@offmap.com</p>
      `,
    })
  } catch (err) {
    console.error('[Contact] Email send failed:', (err as Error).message)
    // Don't fail the request — message was still received
  }

  return NextResponse.json({ success: true, data: { message: 'Message received.' } })
}
