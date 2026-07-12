'use client'
import { useEffect, useState } from 'react'
import type { PlatformStats } from '@/app/api/stats/route'

const FALLBACK: PlatformStats = { hostCount: 47, cityCount: 8, topCityFlags: ['🇩🇪', '🇵🇹', '🇳🇱', '🇪🇸'] }

/**
 * Fetches platform stats from /api/stats once on mount.
 * Returns a stable fallback while loading so social-proof panels
 * never render blank or "0 hosts".
 *
 * Format helper: pass through hostCount when small (<100), append "+"
 * when ≥100 so marketing rounds nicely ("147+ hosts" instead of "147").
 */
export function usePlatformStats(): PlatformStats {
  const [stats, setStats] = useState<PlatformStats>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats')
      .then(r => r.json())
      .then(j => {
        if (!cancelled && j.success && j.data) setStats(j.data)
      })
      .catch(() => {
        // Silently fall back — already initialized with sensible defaults
      })
    return () => {
      cancelled = true
    }
  }, [])

  return stats
}

export function formatHostCount(n: number): string {
  if (n >= 100) return `${n}+`
  return String(n)
}
