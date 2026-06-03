/**
 * Database seed — populates initial cities and test data.
 * Run with: npx tsx drizzle/seed.ts
 * Only run on development / staging databases, NEVER production.
 */
import { db } from '../src/lib/db'
import { cities } from '../src/lib/db/schema'

const CITIES = [
  { name: 'Berlin', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', flagEmoji: '🇩🇪', isActive: true, centerLat: '52.5200', centerLng: '13.4050' },
  { name: 'Lisbon', country: 'Portugal', countryCode: 'PT', timezone: 'Europe/Lisbon', flagEmoji: '🇵🇹', isActive: true, centerLat: '38.7223', centerLng: '-9.1393' },
  { name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', timezone: 'Europe/Amsterdam', flagEmoji: '🇳🇱', isActive: true, centerLat: '52.3676', centerLng: '4.9041' },
  { name: 'Barcelona', country: 'Spain', countryCode: 'ES', timezone: 'Europe/Madrid', flagEmoji: '🇪🇸', isActive: true, centerLat: '41.3851', centerLng: '2.1734' },
  { name: 'Munich', country: 'Germany', countryCode: 'DE', timezone: 'Europe/Berlin', flagEmoji: '🇩🇪', isActive: true, centerLat: '48.1351', centerLng: '11.5820' },
  { name: 'Vienna', country: 'Austria', countryCode: 'AT', timezone: 'Europe/Vienna', flagEmoji: '🇦🇹', isActive: false, centerLat: '48.2082', centerLng: '16.3738' },
  { name: 'Prague', country: 'Czech Republic', countryCode: 'CZ', timezone: 'Europe/Prague', flagEmoji: '🇨🇿', isActive: false, centerLat: '50.0755', centerLng: '14.4378' },
  { name: 'Warsaw', country: 'Poland', countryCode: 'PL', timezone: 'Europe/Warsaw', flagEmoji: '🇵🇱', isActive: false, centerLat: '52.2297', centerLng: '21.0122' },
  { name: 'Budapest', country: 'Hungary', countryCode: 'HU', timezone: 'Europe/Budapest', flagEmoji: '🇭🇺', isActive: false, centerLat: '47.4979', centerLng: '19.0402' },
  { name: 'Rome', country: 'Italy', countryCode: 'IT', timezone: 'Europe/Rome', flagEmoji: '🇮🇹', isActive: false, centerLat: '41.9028', centerLng: '12.4964' },
]

async function seed() {
  console.log('🌱 Seeding cities...')
  for (const city of CITIES) {
    await db.insert(cities).values(city).onConflictDoNothing()
    console.log(`  ✓ ${city.flagEmoji} ${city.name}`)
  }
  console.log('✅ Seed complete')
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
