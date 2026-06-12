import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Globe, Calendar, MapPin, Heart } from 'lucide-react'

const GREEN = '#084E4E'

const INTEREST_LABELS: Record<string, string> = {
  'food-drink': 'Food & Drink', 'art-culture': 'Art & Culture', nature: 'Nature',
  nightlife: 'Nightlife', history: 'History', family: 'Family',
  sports: 'Sports', music: 'Music',
}
const LANG_LABELS: Record<string, string> = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', ar: 'Arabic',
  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', tr: 'Turkish',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish',
}

interface Props { params: { id: string } }

export default async function TravelerProfilePage({ params }: Props) {
  const isMock = process.env.MOCK_MODE === 'true'
  let traveler: any = null
  let sessionUser: any = null

  if (isMock) {
    const { mockGetUser } = await import('@/lib/mock/auth')
    const { mockDb } = await import('@/lib/mock/db')
    const token = cookies().get('offmap_mock_session')?.value
    const me = mockGetUser(token)
    if (me) sessionUser = { id: me.id, email: me.email, role: me.role, fullName: me.fullName, avatarUrl: null }

    const user = mockDb.getUserById(params.id)
    if (!user) notFound()
    traveler = user
  } else {
    const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const supabase = createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) sessionUser = { id: authUser.id, email: authUser.email!, role: authUser.user_metadata?.role ?? 'traveler', fullName: authUser.user_metadata?.full_name ?? null, avatarUrl: null }

    const admin = createSupabaseAdminClient()
    const { data: row } = await admin.from('users').select('*').eq('id', params.id).eq('role', 'traveler').maybeSingle()
    if (!row) notFound()
    traveler = row
  }

  const initials = (traveler.fullName ?? 'T').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const memberSince = new Date(traveler.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const languages = (traveler.languages ?? []).map((l: string) => LANG_LABELS[l] ?? l)
  const interests = (traveler.interests ?? []).map((i: string) => INTEREST_LABELS[i] ?? i)

  return (
    <>
      <Navbar user={sessionUser} />
      <main className="min-h-screen bg-cream pt-[66px]">
        <div className="max-w-2xl mx-auto px-5 md:px-11 py-16">
          <div className="bg-white rounded-2xl shadow-lg border border-black/[0.08] p-8">
            {/* Header */}
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-terra to-terra-dark flex items-center justify-center font-serif text-3xl font-bold text-white flex-shrink-0">
                {initials}
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold" style={{ color: GREEN }}>{traveler.fullName}</h1>
                {(traveler.homeCity || traveler.homeCountry) && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin size={13} /> {[traveler.homeCity, traveler.homeCountry].filter(Boolean).join(', ')}
                  </p>
                )}
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <Calendar size={12} /> Member since {memberSince}
                </p>
              </div>
            </div>

            {/* Bio */}
            {traveler.bio && (
              <div className="mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>About</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{traveler.bio}</p>
              </div>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: GREEN }}>
                  <Globe size={12} /> Languages
                </h2>
                <div className="flex flex-wrap gap-2">
                  {languages.map((l: string) => (
                    <span key={l} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(8,78,78,0.08)', color: GREEN }}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: GREEN }}>
                  <Heart size={12} /> Interests
                </h2>
                <div className="flex flex-wrap gap-2">
                  {interests.map((i: string) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(232,98,26,0.10)', color: '#B85C2A' }}>
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Travel style */}
            {traveler.travelStyle && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: GREEN }}>Travel style</h2>
                <span className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                  style={{ background: 'rgba(59,130,246,0.10)', color: '#2563EB' }}>
                  {traveler.travelStyle}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
