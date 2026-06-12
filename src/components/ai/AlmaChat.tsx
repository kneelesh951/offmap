'use client'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, Sparkles, ExternalLink } from 'lucide-react'
import type { UIMessage } from 'ai'

interface Host {
  id: string
  name: string
  headline: string
  city: string
  flag: string
  categories: string[]
  hourlyRate: string
  rating: number
  reviewCount: number
  profileUrl: string
}

interface AlmaChatProps {
  fullPage?: boolean
}

const transport = new DefaultChatTransport({ api: '/api/ai/chat' })

export function AlmaChat({ fullPage = false }: AlmaChatProps) {
  const { messages, sendMessage, status } = useChat({
    transport,
    messages: [
      {
        id: 'welcome',
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: "Hey! I'm Alma, your Offmap travel assistant. I can help you find the perfect local host anywhere in Europe. Where are you heading?" }],
      },
    ],
  })

  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return
    setInputValue('')
    await sendMessage({ text })
  }, [inputValue, isLoading, sendMessage])

  // Extract host cards from a message's parts
  function getHostCards(m: UIMessage): Host[] {
    if (m.role !== 'assistant' || !m.parts) return []
    const hosts: Host[] = []
    for (const part of m.parts) {
      // In AI SDK v6, tool parts use dynamic type names and have output field
      if ('toolName' in part && (part as Record<string, unknown>).toolName === 'searchHosts' && 'output' in part) {
        const output = (part as Record<string, unknown>).output as { hosts?: Host[] } | undefined
        if (output?.hosts?.length) {
          hosts.push(...output.hosts.slice(0, 3))
        }
      }
    }
    return hosts
  }

  // Get text content from message
  function getTextContent(m: UIMessage): string {
    if (!m.parts) return ''
    return m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
  }

  const containerHeight = fullPage ? 'h-[calc(100vh-80px)]' : 'h-full'

  return (
    <div className={`flex flex-col ${containerHeight} bg-[#FDFAF6]`}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
        {messages.map((m) => {
          const text = getTextContent(m)
          const hostCards = getHostCards(m)
          const isUser = (m.role as string) === 'user'

          return (
            <div key={m.id}>
              {/* Message bubble */}
              {text && (
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1"
                      style={{ background: 'linear-gradient(135deg, #0C7B7B, #063B3B)' }}
                    >
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'rounded-2xl rounded-tr-md'
                        : 'rounded-2xl rounded-tl-md'
                    }`}
                    style={
                      isUser
                        ? { background: '#E8F5F5', color: '#063B3B' }
                        : { background: '#0C7B7B', color: '#fff' }
                    }
                  >
                    {text}
                  </div>
                </div>
              )}

              {/* Host cards after assistant message */}
              {hostCards.length > 0 && (
                <div className="ml-9 mt-2 space-y-2">
                  {hostCards.map((host) => (
                    <HostCard key={host.id} host={host} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start">
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-2"
              style={{ background: 'linear-gradient(135deg, #0C7B7B, #063B3B)' }}
            >
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-md" style={{ background: '#0C7B7B' }}>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex-shrink-0 px-4 pb-4 pt-2"
        style={{ borderTop: '1px solid rgba(12,123,123,0.1)' }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-2xl transition-all"
          style={{
            background: '#fff',
            border: '1.5px solid rgba(12,123,123,0.2)',
            boxShadow: '0 2px 8px rgba(12,123,123,0.06)',
          }}
        >
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend() }}
            placeholder="Ask Alma anything..."
            className="flex-1 bg-transparent text-[14px] text-[#063B3B] placeholder:text-[#084E4E]/30 outline-none font-medium"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{
              background: inputValue.trim() ? 'linear-gradient(135deg, #E8621A, #F5A623)' : '#E0E0E0',
            }}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-[11px] text-center mt-2" style={{ color: 'rgba(8,78,78,0.3)' }}>
          Alma searches real Offmap hosts. Results may vary.
        </p>
      </form>
    </div>
  )
}

function HostCard({ host }: { host: Host }) {
  return (
    <Link
      href={host.profileUrl}
      className="block rounded-xl p-3 transition-all hover:-translate-y-0.5 group"
      style={{
        background: '#fff',
        border: '1.5px solid rgba(12,123,123,0.12)',
        boxShadow: '0 2px 8px rgba(12,123,123,0.06)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #0C7B7B, #063B3B)' }}
        >
          {host.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#063B3B] truncate">{host.name}</span>
            <span className="text-[12px]">{host.flag}</span>
          </div>
          <p className="text-[12px] text-[#084E4E]/60 truncate">{host.headline}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[12px] font-semibold text-[#E8621A]">
              {'★'.repeat(Math.round(host.rating))} {host.rating.toFixed(1)}
            </span>
            <span className="text-[12px] font-bold text-[#063B3B]">{host.hourlyRate}/hr</span>
            <span className="text-[11px] text-[#084E4E]/40">{host.city}</span>
          </div>
        </div>
        <ExternalLink size={14} className="text-[#084E4E]/20 group-hover:text-[#E8621A] transition-colors mt-1" />
      </div>
    </Link>
  )
}
