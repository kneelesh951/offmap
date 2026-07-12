import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GREEN = '#084E4E'
const TERRA = '#E8621A'

interface CityRow {
  id: string
  name: string
  country: string
  countryCode: string
  flagEmoji: string | null
  hostCount: number
}

async function loadCities(): Promise<CityRow[]> {
  if (process.env.MOCK_MODE === 'true') {
    const { MOCK_CITIES } = await import('@/lib/mock/data')
    return MOCK_CITIES.map(c => ({
      id: c.id,
      name: c.name,
      country: c.country,
      countryCode: c.countryCode,
      flagEmoji: c.flagEmoji,
      hostCount: c.hostCount,
    }))
  }
  try {
    const { db } = await import('@/lib/db')
    const { cities } = await import('@/lib/db/schema')
    const { eq, desc } = await import('drizzle-orm')
    const rows = await db.select().from(cities).where(eq(cities.isActive, true)).orderBy(desc(cities.hostCount))
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      country: r.country,
      countryCode: r.countryCode,
      flagEmoji: r.flagEmoji,
      hostCount: r.hostCount,
    }))
  } catch {
    return []
  }
}

export const metadata = {
  title: 'All cities — Offmap',
  description: 'Browse every city Offmap operates in. Find a verified local host in any active destination.',
}

export default async function CitiesPage() {
  const cities = await loadCities()

  // Group by country for scannability
  const byCountry = new Map<string, { country: string; flag: string; cities: CityRow[] }>()
  for (const c of cities) {
    const key = c.countryCode
    if (!byCountry.has(key)) {
      byCountry.set(key, { country: c.country, flag: c.flagEmoji ?? '🌍', cities: [] })
    }
    byCountry.get(key)!.cities.push(c)
  }
  // Sort countries by total host count desc, cities within country same
  const countries = Array.from(byCountry.values())
    .map(g => ({ ...g, totalHosts: g.cities.reduce((sum, c) => sum + c.hostCount, 0) }))
    .sort((a, b) => b.totalHosts - a.totalHosts)

  const totalHosts = cities.reduce((sum, c) => sum + c.hostCount, 0)

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[66px] bg-cream">

        {/* Hero */}
        <div className="py-16 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
          <div className="max-w-5xl mx-auto">
            <p className="overline mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>Live cities</p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4" style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Every city,{' '}
              <em className="italic text-gradient-sunrise">every local.</em>
            </h1>
            <p className="text-base leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.70)' }}>
              {cities.length} {cities.length === 1 ? 'city' : 'cities'} live across {countries.length} {countries.length === 1 ? 'country' : 'countries'} — {totalHosts}+ verified hosts ready to show you their corner of Europe.
            </p>
          </div>
        </div>

        {/* Empty state */}
        {cities.length === 0 && (
          <div className="py-20 px-5 md:px-11 text-center">
            <p className="text-sm" style={{ color: '#4A8E8E' }}>No active cities yet. Check back soon.</p>
          </div>
        )}

        {/* Cities grid, grouped by country */}
        {cities.length > 0 && (
          <div className="py-14 px-5 md:px-11">
            <div className="max-w-5xl mx-auto flex flex-col gap-10">
              {countries.map(group => (
                <section key={group.country}>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
                    <span className="text-3xl">{group.flag}</span>
                    <h2 className="font-serif text-2xl font-bold" style={{ color: GREEN, letterSpacing: '-0.02em' }}>{group.country}</h2>
                    <span className="text-xs font-semibold ml-1" style={{ color: '#6EA880' }}>
                      {group.cities.length} {group.cities.length === 1 ? 'city' : 'cities'} · {group.totalHosts} hosts
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {group.cities.map(c => (
                      <Link key={c.id} href={`/search?cityId=${c.id}`}
                        className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                        style={{ background: '#fff', border: '1px solid rgba(8,78,78,0.08)', boxShadow: '0 2px 8px rgba(12,123,123,0.06)', color: GREEN }}>
                        <span className="text-2xl flex-shrink-0">{c.flagEmoji ?? '🌍'}</span>
                        <div className="min-w-0">
                          <div className="text-[14px] font-bold truncate" style={{ color: GREEN }}>{c.name}</div>
                          <div className="text-[11px] font-semibold" style={{ color: 'rgba(8,78,78,0.50)' }}>
                            {c.hostCount > 0 ? `${c.hostCount} ${c.hostCount === 1 ? 'host' : 'hosts'}` : 'Coming soon'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA — suggest a city */}
        <div className="py-16 px-5 md:px-11 text-center border-t" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
          <h3 className="font-serif text-2xl font-bold mb-2" style={{ color: GREEN }}>Don&apos;t see your city?</h3>
          <p className="text-sm mb-6" style={{ color: '#4A8E8E' }}>
            We&apos;re expanding across Europe. Tell us where you want Offmap next.
          </p>
          <Link href="/contact?topic=other"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${TERRA}, #F07830)`, boxShadow: '0 4px 18px rgba(232,98,26,0.40)' }}>
            Suggest a city →
          </Link>
        </div>

      </main>
      <Footer />
    </>
  )
}
