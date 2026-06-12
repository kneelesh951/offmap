'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface HostPhotoCarouselProps {
  photos: { id: string; publicUrl: string; isPrimary: boolean }[]
  hostName: string | null
  headline: string | null
}

export function HostPhotoCarousel({ photos, hostName, headline }: HostPhotoCarouselProps) {
  const [idx, setIdx] = useState(0)

  if (photos.length === 0) {
    // Fallback: no photos
    return (
      <div className="rounded-2xl overflow-hidden relative" style={{ boxShadow: '0 8px 32px rgba(8,78,78,0.25)' }}>
        <div className="w-full h-52 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#084E4E,#0a5e5e)' }}>
          <div className="text-center">
            <div className="text-4xl mb-2">📸</div>
            <p className="text-[13px] font-semibold text-white/60">Add photos to your profile</p>
          </div>
        </div>
      </div>
    )
  }

  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx(i => (i + 1) % photos.length)

  return (
    <div className="rounded-2xl overflow-hidden relative group" style={{ boxShadow: '0 8px 32px rgba(8,78,78,0.25)' }}>
      {/* Image */}
      <div className="relative w-full h-52 overflow-hidden">
        <img
          src={photos[idx].publicUrl}
          alt={hostName ?? 'Host photo'}
          className="w-full h-full object-cover transition-all duration-500 ease-out"
          key={photos[idx].id}
        />
        {/* Bottom gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#084E4E]/90 via-[#084E4E]/30 to-transparent" />
      </div>

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        {hostName && (
          <p className="font-serif text-[18px] font-bold text-white leading-snug mb-0.5">{hostName}</p>
        )}
        {headline && (
          <p className="text-[12px] font-medium leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.70)' }}>
            {headline}
          </p>
        )}
      </div>

      {/* Arrows (show on hover, always on mobile) */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
            aria-label="Previous photo"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
            aria-label="Next photo"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-[72px] left-0 right-0 flex justify-center gap-1.5">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIdx(i)}
              className="transition-all"
              style={{
                width: i === idx ? '18px' : '6px',
                height: '6px',
                borderRadius: '99px',
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Photo counter badge */}
      {photos.length > 1 && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(8px)', color: '#fff' }}>
          {idx + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
