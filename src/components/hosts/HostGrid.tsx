import { HostCard } from './HostCard'
import type { HostSearchResult } from '@/types'

interface HostGridProps {
  hosts: HostSearchResult[]
  onConnectClick?: (host: HostSearchResult) => void
  loading?: boolean
}

export function HostGrid({ hosts, onConnectClick, loading }: HostGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(8,78,78,0.08)', boxShadow: '0 2px 8px rgba(8,78,78,0.06)' }}>
            <div className="h-52 shimmer" />
            <div className="p-4 pt-8 space-y-2.5">
              <div className="h-4 shimmer rounded-lg w-2/3" />
              <div className="h-3 shimmer rounded-lg w-1/2" />
              <div className="h-3 shimmer rounded-lg w-1/3" />
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-16 shimmer rounded-full" />
                <div className="h-5 w-14 shimmer rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!hosts.length) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-5">🔍</div>
        <h3 className="font-serif text-2xl font-bold text-ink mb-2">No hosts found</h3>
        <p className="text-ink-muted text-sm">Try adjusting your filters or browse all cities.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {hosts.map((host) => (
        <HostCard key={host.id} host={host} onConnectClick={onConnectClick} />
      ))}
    </div>
  )
}
