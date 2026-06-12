'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function NewConversation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hostId = searchParams.get('hostId')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hostId) {
      router.replace('/conversations')
      return
    }

    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId }),
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.conversationId) {
          router.replace(`/conversations/${json.data.conversationId}`)
        } else if (json.error?.code === 'SUBSCRIPTION_REQUIRED') {
          router.replace(`/pricing?reason=messaging&hostId=${hostId}`)
        } else {
          setError(json.error?.message ?? 'Could not start conversation.')
        }
      })
      .catch(() => setError('Network error — please try again.'))
  }, [hostId, router])

  const GREEN = '#084E4E'

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center max-w-sm px-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-serif text-xl font-bold mb-2" style={{ color: GREEN }}>{error}</h2>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold border"
            style={{ borderColor: 'rgba(8,78,78,0.25)', color: GREEN }}>
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: '#084E4E', borderTopColor: 'transparent' }} />
        <p className="text-sm font-semibold" style={{ color: '#4A8E8E' }}>Starting conversation…</p>
      </div>
    </div>
  )
}

export default function NewConversationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#084E4E', borderTopColor: 'transparent' }} />
      </div>
    }>
      <NewConversation />
    </Suspense>
  )
}
