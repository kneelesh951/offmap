'use client'
import { useEffect, useRef, useCallback } from 'react'
import type { Message } from '@/lib/db/schema'

/**
 * Subscribes to new messages in a conversation.
 * Production: Supabase Realtime (postgres_changes)
 * Mock mode:  Polls GET /api/conversations/[id]/messages every 3s
 */
export function useRealtimeMessages(
  conversationId: string | null,
  onMessage: (msg: Message) => void
) {
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage
  const seenIdsRef = useRef<Set<string>>(new Set())

  // Mark initial messages as seen on first render
  const markSeen = useCallback((ids: string[]) => {
    ids.forEach(id => seenIdsRef.current.add(id))
  }, [])

  useEffect(() => {
    if (!conversationId) return

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

    if (isMock) {
      // Poll for new messages every 3 seconds in mock mode
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/conversations/${conversationId}/messages`)
          const json = await res.json()
          if (json.success && Array.isArray(json.data)) {
            for (const msg of json.data) {
              if (!seenIdsRef.current.has(msg.id)) {
                seenIdsRef.current.add(msg.id)
                callbackRef.current(msg as Message)
              }
            }
          }
        } catch {
          // Silently ignore polling errors
        }
      }, 3000)

      return () => clearInterval(interval)
    }

    // Production: Supabase Realtime
    let channel: any
    const setup = async () => {
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const supabase = createSupabaseBrowserClient()
      channel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => callbackRef.current(payload.new as Message)
        )
        .subscribe()
    }
    setup()

    return () => {
      if (channel) {
        import('@/lib/supabase/client').then(({ createSupabaseBrowserClient }) => {
          createSupabaseBrowserClient().removeChannel(channel)
        })
      }
    }
  }, [conversationId])

  return { markSeen }
}
