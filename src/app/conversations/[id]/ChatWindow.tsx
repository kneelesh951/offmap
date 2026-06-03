'use client'
import { useState, useRef, useEffect } from 'react'
import { useRealtimeMessages } from '@/hooks/useRealtime'
import { Send, Shield, CreditCard, Star, Calendar, Headphones } from 'lucide-react'

interface Msg { id: string; content: string; senderId: string; createdAt: string; senderName?: string | null }

interface Props {
  conversationId: string
  currentUserId: string
  otherUserName: string
  initialMessages: Msg[]
}

const BENEFITS = [
  {
    icon: Shield,
    title: 'Cancellation protection',
    desc: 'Full refund if your host cancels. 50-100% back if you cancel 24h+ before.',
    iconColor: '#34D399',
    cardBg: 'linear-gradient(135deg, rgba(16,185,129,0.45), rgba(6,78,59,0.65))',
    border: 'rgba(52,211,153,0.50)',
  },
  {
    icon: CreditCard,
    title: 'Secure payments',
    desc: 'Pay through Stripe — your card details are never shared with the host.',
    iconColor: '#60A5FA',
    cardBg: 'linear-gradient(135deg, rgba(59,130,246,0.45), rgba(30,64,175,0.65))',
    border: 'rgba(96,165,250,0.50)',
  },
  {
    icon: Star,
    title: 'Verified reviews',
    desc: 'Only travelers who booked can leave reviews. Real experiences, no fakes.',
    iconColor: '#FBBF24',
    cardBg: 'linear-gradient(135deg, rgba(245,158,11,0.45), rgba(146,64,14,0.65))',
    border: 'rgba(251,191,36,0.50)',
  },
  {
    icon: Calendar,
    title: 'Instant confirmation',
    desc: 'Book a date and time, get confirmed instantly. Meeting details sent 24h before.',
    iconColor: '#C084FC',
    cardBg: 'linear-gradient(135deg, rgba(168,85,247,0.45), rgba(91,33,182,0.65))',
    border: 'rgba(192,132,252,0.50)',
  },
  {
    icon: Headphones,
    title: '24/7 support',
    desc: 'Something goes wrong? We resolve disputes in 24 hours. Off-platform, you\'re on your own.',
    iconColor: '#FCD34D',
    cardBg: 'linear-gradient(135deg, rgba(234,179,8,0.50), rgba(180,120,10,0.65))',
    border: 'rgba(252,211,77,0.55)',
  },
]

export function ChatWindow({ conversationId, currentUserId, otherUserName, initialMessages }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { markSeen } = useRealtimeMessages(conversationId, (msg) => {
    setMsgs((prev) => {
      if (prev.some(m => m.id === (msg as any).id)) return prev
      return [...prev, { ...msg, id: (msg as any).id, content: (msg as any).content, senderId: (msg as any).senderId, createdAt: (msg as any).createdAt?.toString() ?? '' }]
    })
  })

  useEffect(() => {
    markSeen(initialMessages.map(m => m.id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    const optimisticId = `optimistic-${Date.now()}`
    setMsgs(prev => [...prev, { id: optimisticId, content, senderId: currentUserId, createdAt: new Date().toISOString() }])
    setInput('')
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (json.success && json.data?.id) {
        markSeen([json.data.id])
        setMsgs(prev => prev.map(m => m.id === optimisticId ? { ...m, id: json.data.id } : m))
      }
    } catch {
      setMsgs(prev => prev.filter(m => m.id !== optimisticId))
      setInput(content)
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 66px)', marginTop: '66px', backgroundColor: '#EDE6DA' }}>

      {/* ══ LEFT: Benefits panel ══════════════════════════════ */}
      <div style={{ width: '45%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Base gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg, #0A2E1B 0%, #0C3520 35%, #122B40 100%)' }} />

        {/* Background travel image — faded, on top of gradient */}
        <img
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1000&q=80"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.22, mixBlendMode: 'luminosity' }}
        />

        {/* Orange glow top-right */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '350px', height: '350px', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 65%)', transform: 'translate(20%,-30%)' }} />

        {/* Teal glow bottom-left */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', height: '300px', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 65%)', transform: 'translate(-30%,30%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 32px', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '12px', color: 'rgba(245,166,35,0.85)' }}>
              Why book on Offmap?
            </div>
            <h2 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: '12px' }}>
              Your experience is<br />protected with us
            </h2>
            <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(255,255,255,0.55)' }}>
              Booking through Offmap means every session is covered by our protection policy.
              Off-platform arrangements have zero safety net.
            </p>
          </div>

          {/* Benefits list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {BENEFITS.map((b) => (
              <div key={b.title} style={{ display: 'flex', gap: '14px', borderRadius: '14px', padding: '16px 18px', background: b.cardBg, border: `1px solid ${b.border}`, backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.10)', border: `1.5px solid ${b.border}` }}>
                  <b.icon size={18} style={{ color: b.iconColor }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '4px', letterSpacing: '-0.01em' }}>{b.title}</div>
                  <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)', fontWeight: 500 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div style={{ marginTop: '28px', borderRadius: '12px', padding: '18px 20px', background: 'linear-gradient(135deg, rgba(232,98,26,0.18), rgba(232,98,26,0.08))', border: '1px solid rgba(232,98,26,0.25)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', color: '#F5A623' }}>
              Ready to meet {otherUserName}?
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '10px', color: 'rgba(255,255,255,0.70)' }}>
              Book a session and get instant confirmation with full cancellation protection.
            </div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
              🔒 Secured by Stripe &middot; GDPR compliant &middot; EU consumer protection
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Chat ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Chat header — rich dark green */}
        <div style={{ background: 'linear-gradient(135deg, #0B2E1A 0%, #14432A 50%, #0E3A24 100%)', padding: '18px 28px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '3px solid #E8621A' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '19px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#E8621A,#D4540F)', boxShadow: '0 4px 14px rgba(232,98,26,0.45)', border: '2.5px solid rgba(255,255,255,0.2)' }}>
              {otherUserName[0]}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.02em' }}>{otherUserName}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#F5A623', letterSpacing: '0.04em' }}>Offmap Host</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(232,98,26,0.20), rgba(232,98,26,0.10))', border: '1.5px solid rgba(232,98,26,0.35)' }}>
            <Shield size={13} style={{ color: '#F5A623' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5A623', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Protected</span>
          </div>
        </div>

        {/* Messages area — subtle pattern background */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px 28px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'linear-gradient(180deg, #F5F1EB 0%, #EDE8E0 50%, #E8E3DA 100%)' }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 40px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#E8621A,#D4540F)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 10px 30px rgba(232,98,26,0.30)' }}>
                <Send size={28} style={{ color: '#fff', transform: 'rotate(-15deg)' }} />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F3D22', marginBottom: '10px', fontFamily: 'var(--font-fraunces), Georgia, serif', letterSpacing: '-0.02em' }}>
                Start your conversation
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#6B8F7B', lineHeight: 1.7, maxWidth: '300px', margin: '0 auto' }}>
                Say hello to {otherUserName} and start planning your local experience together
              </div>
            </div>
          )}
          {msgs.map((m, i) => {
            const isMe = m.senderId === currentUserId
            const time = new Date(m.createdAt)
            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const showAvatar = !isMe && (i === 0 || msgs[i - 1]?.senderId === currentUserId)
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: (i > 0 && msgs[i - 1]?.senderId !== m.senderId) ? '12px' : '2px' }}>
                {showAvatar && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', marginLeft: '4px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '10px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#E8621A,#D4540F)' }}>
                      {otherUserName[0]}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F3D22' }}>{otherUserName}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <div
                    style={{
                      maxWidth: '65%',
                      padding: '12px 18px',
                      fontSize: '14.5px',
                      lineHeight: 1.7,
                      fontWeight: 450,
                      letterSpacing: '0.01em',
                      ...(isMe
                        ? { background: 'linear-gradient(135deg,#E8621A,#D4540F)', color: '#fff', borderRadius: '20px 20px 6px 20px', boxShadow: '0 4px 18px rgba(232,98,26,0.25)' }
                        : { background: '#fff', color: '#1A2B1F', borderRadius: '20px 20px 20px 6px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(15,61,34,0.06)' }
                      ),
                    }}
                  >
                    {m.content}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 500, color: '#9CA89F', marginBottom: '4px', flexShrink: 0 }}>{timeStr}</span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input bar — elevated */}
        <div style={{ backgroundColor: '#fff', borderTop: '1px solid rgba(15,61,34,0.08)', padding: '18px 24px', boxShadow: '0 -6px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, borderRadius: '16px', border: '2px solid rgba(15,61,34,0.10)', backgroundColor: '#F8F5F0', overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={`Write a message to ${otherUserName}…`}
                rows={1}
                style={{ width: '100%', padding: '14px 20px', backgroundColor: 'transparent', color: '#1A2B1F', fontSize: '14.5px', resize: 'none', outline: 'none', fontFamily: 'inherit', border: 'none', lineHeight: 1.5 }}
                onFocus={(e) => { const p = e.target.parentElement!; p.style.borderColor = '#E8621A'; p.style.boxShadow = '0 0 0 3px rgba(232,98,26,0.08)'; p.style.backgroundColor = '#fff' }}
                onBlur={(e) => { const p = e.target.parentElement!; p.style.borderColor = 'rgba(15,61,34,0.10)'; p.style.boxShadow = 'none'; p.style.backgroundColor = '#F8F5F0' }}
              />
            </div>
            <button onClick={send} disabled={!input.trim() || sending}
              style={{ width: '50px', height: '50px', flexShrink: 0, borderRadius: '16px', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#E8621A,#D4540F)', boxShadow: '0 6px 20px rgba(232,98,26,0.35)', opacity: (!input.trim() || sending) ? 0.3 : 1, transition: 'opacity 0.2s' }}>
              <Send size={20} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px', fontWeight: 600, color: '#B0B8B2', letterSpacing: '0.03em' }}>
            Messages are monitored for safety. Keep conversations on Offmap for full protection.
          </div>
        </div>
      </div>
    </div>
  )
}
