import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream pt-[66px]">
        <div className="max-w-3xl mx-auto px-5 md:px-11 py-16">
          <h1 className="font-serif text-3xl font-bold text-ink mb-2">Terms of Service</h1>
          <p className="text-ink-muted text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
            <strong>⚠️ Important:</strong> This is a placeholder. Have a German lawyer draft proper AGB (Allgemeine Geschäftsbedingungen) before launching. Critical clause: clearly stating Offmap is a connection platform only, not responsible for the experiences between hosts and travelers.
          </div>

          {[
            { h: '1. The Offmap platform', p: 'Offmap GmbH ("we", "Offmap") operates an online platform that connects travelers with local hosts. Offmap is a connection platform only. We facilitate introductions between users but are not a party to any agreement made between travelers and hosts. We are not a tour operator, travel agent, or employer of hosts.' },
            { h: '2. What Offmap does and does not do', p: 'Offmap provides: user profiles, search and discovery tools, subscription-based messaging access, and a review system. Offmap does NOT: organise, supervise, or guarantee any experience, handle payments between travelers and hosts, employ or contract hosts, insure experiences, or take responsibility for what happens during a meeting.' },
            { h: '3. User responsibilities', p: 'Users are responsible for: the accuracy of their profile information, their conduct during meetings, any agreements made with other users, payment arrangements made directly with hosts, their own safety and security.' },
            { h: '4. Subscriptions and payment', p: 'Travelers pay a subscription to access messaging features. Subscriptions are charged in advance. EU law: you have a 14-day right of withdrawal (Widerrufsrecht) from the date of purchase, unless you have already used the service. To exercise your right, contact support@offmap.com within 14 days.' },
            { h: '5. Prohibited conduct', p: 'Users must not: post false or misleading information, harass or threaten other users, use the platform for illegal activities, share personal contact information before a subscription is active, create multiple accounts to circumvent restrictions.' },
            { h: '6. Liability limitation', p: 'Offmap\'s liability is limited to the amount you paid in subscription fees in the 3 months prior to the claim. Offmap is not liable for: the conduct of hosts or travelers, the quality of experiences, any harm arising from meetings between users, or loss of data.' },
            { h: '7. Governing law', p: 'These terms are governed by German law. Disputes shall be resolved in the courts of Berlin, Germany.' },
          ].map((s) => (
            <div key={s.h} className="mb-6">
              <h2 className="font-serif text-lg font-semibold text-ink mb-2">{s.h}</h2>
              <p className="text-ink-soft text-sm leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
