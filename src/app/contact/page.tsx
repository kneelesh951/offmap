'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ArrowLeft, Mail, MessageSquare, HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react'

const GREEN = '#0F3D22'
const ORANGE = '#E8621A'

const TOPICS = [
  { value: 'general',     label: '💬 General question' },
  { value: 'booking',     label: '📅 Booking issue' },
  { value: 'account',     label: '👤 Account / login problem' },
  { value: 'host',        label: '🏠 Host application' },
  { value: 'payment',     label: '💳 Payment / subscription' },
  { value: 'safety',      label: '🚨 Safety concern' },
  { value: 'other',       label: '📋 Other' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.email || !form.topic || !form.message) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? 'Something went wrong.'); return }
      setSuccess(true)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[66px] bg-cream">

        {/* Header band */}
        <div className="bg-white border-b border-black/[0.07]">
          <div className="max-w-4xl mx-auto px-5 md:px-11 py-10">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs mb-5 hover:opacity-70 transition-opacity" style={{ color: GREEN }}>
              <ArrowLeft size={13} /> Back to home
            </Link>
            <p className="overline text-terra mb-2">Support</p>
            <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: GREEN, letterSpacing: '-0.03em' }}>
              Get in touch
            </h1>
            <p className="text-[14px]" style={{ color: '#4A7A5C' }}>
              We typically reply within a few hours. For urgent safety concerns, we respond within 1 hour.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-11 py-10">
          <div className="grid md:grid-cols-3 gap-8">

            {/* Left — quick links */}
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-bold mb-5" style={{ color: GREEN }}>Quick answers</h2>

              {[
                { icon: HelpCircle, title: 'FAQ', desc: 'Common questions answered', href: '/faq' },
                { icon: MessageSquare, title: 'Host guidelines', desc: 'Rules for hosting', href: '/host-guidelines' },
                { icon: Mail, title: 'Direct email', desc: 'support@offmap.com', href: 'mailto:support@offmap.com' },
              ].map(item => (
                <Link key={item.title} href={item.href}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white transition-all hover:-translate-y-0.5"
                  style={{ border: '1px solid rgba(15,61,34,0.10)', boxShadow: '0 2px 8px rgba(15,61,34,0.05)' }}>
                  <item.icon size={18} className="mt-0.5 flex-shrink-0" style={{ color: ORANGE }} />
                  <div>
                    <div className="font-bold text-[13px]" style={{ color: GREEN }}>{item.title}</div>
                    <div className="text-[12px]" style={{ color: '#4A7A5C' }}>{item.desc}</div>
                  </div>
                </Link>
              ))}

              {/* Response times */}
              <div className="rounded-2xl p-5 mt-6"
                style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #1a4a2e 100%)` }}>
                <h3 className="font-bold text-white text-[13px] mb-3">Response times</h3>
                {[
                  ['🚨 Safety', '< 1 hour'],
                  ['💳 Payments', '< 4 hours'],
                  ['💬 General', '< 24 hours'],
                ].map(([type, time]) => (
                  <div key={type} className="flex justify-between text-[12px] mb-2">
                    <span style={{ color: 'rgba(255,255,255,0.70)' }}>{type}</span>
                    <span className="font-semibold text-white">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — form */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl p-7"
                style={{ border: '1px solid rgba(15,61,34,0.10)', boxShadow: '0 2px 16px rgba(15,61,34,0.07)' }}>

                {success ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: '#EAF5EE' }}>
                      <CheckCircle size={28} style={{ color: GREEN }} />
                    </div>
                    <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN }}>Message sent!</h2>
                    <p className="text-sm text-gray-500 mb-6">
                      We've received your message and will get back to you at <strong>{form.email}</strong> shortly.
                    </p>
                    <button onClick={() => { setSuccess(false); setForm({ name: '', email: '', topic: '', message: '' }) }}
                      className="px-6 py-2.5 rounded-full text-[13px] font-semibold border transition-colors hover:bg-green-50"
                      style={{ borderColor: 'rgba(15,61,34,0.25)', color: GREEN }}>
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h2 className="font-serif text-xl font-bold mb-1" style={{ color: GREEN }}>Send us a message</h2>

                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium"
                        style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                        <AlertTriangle size={14} />
                        {error}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: GREEN }}>
                          Your name
                        </label>
                        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                          placeholder="Alex Smith" required
                          className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          style={{ borderColor: 'rgba(15,61,34,0.18)' }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: GREEN }}>
                          Email address
                        </label>
                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                          placeholder="you@example.com" required
                          className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          style={{ borderColor: 'rgba(15,61,34,0.18)' }} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: GREEN }}>
                        Topic
                      </label>
                      <select value={form.topic} onChange={e => set('topic', e.target.value)} required
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        style={{ borderColor: 'rgba(15,61,34,0.18)', color: form.topic ? '#111' : '#9CA3AF' }}>
                        <option value="" disabled>Select a topic…</option>
                        {TOPICS.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: GREEN }}>
                        Message
                      </label>
                      <textarea value={form.message} onChange={e => set('message', e.target.value)}
                        rows={5} maxLength={2000} required
                        placeholder="Tell us what's going on. The more detail you provide, the faster we can help."
                        className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                        style={{ borderColor: 'rgba(15,61,34,0.18)' }} />
                      <div className="text-right text-[11px] text-gray-400 mt-1">{form.message.length}/2000</div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all hover:-translate-y-0.5"
                      style={{ background: `linear-gradient(135deg,${ORANGE},#F07830)`, boxShadow: '0 4px 24px rgba(232,98,26,0.40)' }}>
                      {loading ? 'Sending…' : 'Send message →'}
                    </button>

                    <p className="text-center text-[11px] text-gray-400">
                      For urgent safety issues email <a href="mailto:safety@offmap.com" className="underline">safety@offmap.com</a> directly.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
