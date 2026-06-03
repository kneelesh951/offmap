'use client'
// Shows a small dev banner when running in mock mode
// Automatically hidden in production
export function MockBanner() {
  if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') return null
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg flex items-center gap-2 opacity-80">
      <span>🧪</span> Mock mode
    </div>
  )
}
