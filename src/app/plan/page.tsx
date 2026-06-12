import { Sparkles } from 'lucide-react'
import { AlmaChat } from '@/components/ai/AlmaChat'

export const metadata = {
  title: 'Plan Your Trip — Alma AI | Offmap',
  description: 'Ask Alma to find the perfect local host for your next trip. AI-powered travel planning on Offmap.',
}

export default function PlanPage() {
  return (
    <div className="min-h-screen bg-[#FDFAF6]">
      {/* Header */}
      <div
        className="pt-[82px] pb-6 px-6 text-center"
        style={{
          background: 'linear-gradient(180deg, #0C7B7B 0%, #063B3B 50%, #042D2D 100%)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Plan your trip with Alma
        </h1>
        <p className="text-[14px] mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Tell me where you&apos;re going and what you love — I&apos;ll find the perfect local host.
        </p>
      </div>

      {/* Full-page chat */}
      <div className="max-w-2xl mx-auto" style={{ height: 'calc(100vh - 200px)' }}>
        <AlmaChat fullPage />
      </div>
    </div>
  )
}
