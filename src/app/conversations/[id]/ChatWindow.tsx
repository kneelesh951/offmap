'use client'
import { useState, useRef, useEffect } from 'react'
import { useRealtimeMessages } from '@/hooks/useRealtime'
import { Send } from 'lucide-react'

interface Msg { id: string; content: string; senderId: string; createdAt: string; senderName?: string | null }

interface Props {
  conversationId: string
  currentUserId: string
  otherUserName: string
  initialMessages: Msg[]
}

export function ChatWindow({ conversationId, currentUserId, otherUserName, initialMessages }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { markSeen } = useRealtimeMessages(conversationId, (msg) => {
    setMsgs((prev) => {
      // Prevent duplicates (from both polling and optimistic sends)
      if (prev.some(m => m.id === (msg as any).id)) return prev
      return [...prev, { ...msg, id: (msg as any).id, content: (msg as any).content, senderId: (msg as any).senderId, createdAt: (msg as any).createdAt?.toString() ?? '' }]
    })
  })

  // Mark initial messages as seen so polling doesn't re-add them
  useEffect(() => {
    markSeen(initialMessages.map(m => m.id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    const optimisticId = `optimistic-${Date.now()}`
    // Optimistic render
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
        // Replace optimistic message with real one and mark seen
        markSeen([json.data.id])
        setMsgs(prev => prev.map(m => m.id === optimisticId ? { ...m, id: json.data.id } : m))
      }
    } catch {
      // Remove optimistic message on failure, restore input
      setMsgs(prev => prev.filter(m => m.id !== optimisticId))
      setInput(content)
    }
    setSending(false)
  }

  return (
    <main className="min-h-screen bg-cream pt-[66px] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-black/[0.08] px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center font-serif text-base font-bold text-white">
          {otherUserName[0]}
        </div>
        <div className="font-semibold text-ink">{otherUserName}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-3 max-w-2xl w-full mx-auto">
        {msgs.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-sm">
            Say hello to {otherUserName} 👋
          </div>
        )}
        {msgs.map((m) => {
          const isMe = m.senderId === currentUserId
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-terra text-white rounded-br-md' : 'bg-white border border-black/[0.08] text-ink rounded-bl-md'}`}>
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-black/[0.08] px-4 py-3 max-w-2xl w-full mx-auto">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Message ${otherUserName}…`}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-black/[0.12] bg-cream text-sm text-ink resize-none focus:outline-none focus:border-terra focus:ring-1 focus:ring-terra"
          />
          <button onClick={send} disabled={!input.trim() || sending}
            className="w-10 h-10 flex-shrink-0 rounded-xl bg-terra text-white flex items-center justify-center disabled:opacity-40 hover:bg-terra-dark transition-colors">
            <Send size={16} />
          </button>
        </div>
      </div>
    </main>
  )
}
