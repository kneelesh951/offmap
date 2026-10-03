'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { BannerData } from '@/lib/banners'

const COLORS: Record<string, { bg: string; text: string; border: string; ctaColor: string }> = {
  info:    { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD', ctaColor: '#1D4ED8' },
  promo:   { bg: '#084E4E', text: '#ECFDF5', border: '#065F46', ctaColor: '#86EFAC' },
  warning: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', ctaColor: '#B45309' },
  urgent:  { bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF', ctaColor: '#BE123C' },
}

export function PromoBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null)
  const [hidden, setHidden] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    fetch('/api/banners/active')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const b = data?.data as BannerData | null
        if (!b) return
        const dismissed = typeof window !== 'undefined' && localStorage.getItem(`offmap_banner_${b.id}`) === '1'
        if (!dismissed) {
          setBanner(b)
          setHidden(false)
        }
      })
      .catch(() => {})
  }, [])

  if (!banner || hidden) return null

  const c = COLORS[banner.variant] ?? COLORS.info

  return (
    <div role="banner" style={{
      background: c.bg,
      borderBottom: `1px solid ${c.border}`,
      padding: '10px 48px 10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      fontSize: 14,
      fontWeight: 500,
      color: c.text,
      lineHeight: 1.4,
      position: 'relative',
      zIndex: 50,
    }}>
      <span>{banner.text}</span>

      {banner.ctaHref && banner.ctaLabel && (
        <Link href={banner.ctaHref} style={{
          color: c.ctaColor,
          fontWeight: 700,
          textDecoration: 'underline',
          textUnderlineOffset: 2,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {banner.ctaLabel} →
        </Link>
      )}

      {banner.dismissible && (
        <button
          onClick={() => {
            localStorage.setItem(`offmap_banner_${banner.id}`, '1')
            setHidden(true)
          }}
          aria-label="Dismiss banner"
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: c.text,
            opacity: 0.5,
            fontSize: 20,
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
