import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const GREEN = '#084E4E'

const POSTS = [
  { author: 'Amira K.', city: '🇩🇪 Berlin', initials: 'AK', time: '2 days ago', title: 'Tips for first-time hosts: what I learned from my first 50 travelers', likes: 34, replies: 12 },
  { author: 'Marco V.', city: '🇵🇹 Lisbon', initials: 'MV', time: '5 days ago', title: 'How I structure a 3-hour Alfama food walk (full itinerary inside)', likes: 61, replies: 19 },
  { author: 'Yuki T.', city: '🇳🇱 Amsterdam', initials: 'YT', time: '1 week ago', title: 'Cycling routes for hosts: the 5 loops I use with travelers', likes: 47, replies: 8 },
  { author: 'Sofia R.', city: '🇪🇸 Barcelona', initials: 'SR', time: '1 week ago', title: 'Handling last-minute cancellations gracefully — my approach', likes: 29, replies: 15 },
  { author: 'Klaus R.', city: '🇩🇪 Berlin', initials: 'KR', time: '2 weeks ago', title: 'GDR history walks: how to talk about difficult topics sensitively', likes: 88, replies: 32 },
]

export default function CommunityPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Community</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px', lineHeight: 1.05 }}>The Offmap host community.</h1>
              <p className="text-lg leading-relaxed max-w-2xl" style={{ color: 'rgba(255,255,255,0.70)' }}>
                A private space where verified Offmap hosts share tips, itineraries, and experiences. Join the conversation.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)', color: '#fff' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                238 hosts online now
              </div>
            </div>
          </div>
        </div>

        {/* Preview notice */}
        <div className="py-5 px-5 md:px-11 text-center border-b" style={{ backgroundColor: '#FFF9F5', borderColor: 'rgba(232,98,26,0.20)' }}>
          <p className="text-sm" style={{ color: '#4A8E8E' }}>
            🚧 <strong style={{ color: '#E8621A' }}>Preview — community forum launches in 2027.</strong> The posts below are sample content showing what hosts will share once we open the forum.
            <Link href="/become-a-host" className="ml-2 font-semibold underline" style={{ color: '#E8621A' }}>Become a host →</Link>
          </p>
        </div>

        <div className="py-16 px-5 md:px-11 bg-white">
          <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
            {/* Posts feed */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold" style={{ color: GREEN }}>Recent discussions</h2>
                <button className="text-sm font-semibold opacity-50 cursor-not-allowed" style={{ color: GREEN }}>+ New post</button>
              </div>
              <div className="space-y-4">
                {POSTS.map(p => (
                  <div key={p.title} className="p-5 rounded-2xl cursor-pointer hover:-translate-y-0.5 transition-all" style={{ border: '1px solid rgba(8,78,78,0.10)', backgroundColor: '#F7FAF8' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: GREEN }}>
                        {p.initials}
                      </div>
                      <div>
                        <span className="font-semibold text-sm" style={{ color: GREEN }}>{p.author}</span>
                        <span className="text-xs ml-2" style={{ color: '#6EA880' }}>{p.city} · {p.time}</span>
                      </div>
                    </div>
                    <p className="font-semibold text-base mb-3" style={{ color: GREEN }}>{p.title}</p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: '#6EA880' }}>
                      <span>❤️ {p.likes} likes</span>
                      <span>💬 {p.replies} replies</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl" style={{ backgroundColor: GREEN, border: '1px solid rgba(255,255,255,0.10)' }}>
                <h3 className="font-serif text-lg font-bold text-white mb-2">Not a host yet?</h3>
                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>Join 1,300+ locals sharing their cities and earning on their own terms.</p>
                <Link href="/become-a-host"
                  className="block text-center py-2.5 rounded-full text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', color: '#fff' }}>
                  Become a host →
                </Link>
              </div>

              <div className="p-6 rounded-2xl" style={{ border: '1px solid rgba(8,78,78,0.10)', backgroundColor: '#F7FAF8' }}>
                <h3 className="font-bold text-base mb-4" style={{ color: GREEN }}>Community channels</h3>
                {[
                  { icon: '🏙️', label: 'City channels', count: '8 cities' },
                  { icon: '🍜', label: 'Food & Drink hosts', count: '312 members' },
                  { icon: '📸', label: 'Photography & Art', count: '187 members' },
                  { icon: '🎵', label: 'Music & Nightlife', count: '143 members' },
                  { icon: '🏛️', label: 'History & Culture', count: '221 members' },
                ].map(c => (
                  <div key={c.label} className="flex items-center justify-between py-2.5 border-b last:border-0 cursor-pointer"
                    style={{ borderColor: 'rgba(8,78,78,0.08)' }}>
                    <span className="text-sm" style={{ color: GREEN }}>{c.icon} {c.label}</span>
                    <span className="text-xs" style={{ color: '#6EA880' }}>{c.count}</span>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-2xl text-sm" style={{ backgroundColor: '#FFF9F5', border: '1px solid rgba(232,98,26,0.15)' }}>
                <p className="font-semibold mb-1" style={{ color: '#E8621A' }}>Community guidelines</p>
                <p style={{ color: '#4A8E8E' }}>Be respectful, share generously, no spam. Read the full <Link href="/host-guidelines" className="underline">Host Guidelines</Link>.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
