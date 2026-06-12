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
            { h: '2. What Offmap does and does not do', p: 'Offmap provides: user profiles, search and discovery tools, subscription-based messaging access, booking facilitation, and a review system. Offmap does NOT: organise, supervise, or guarantee any experience; employ or contract hosts; insure experiences; track, monitor, or supervise in-person meetings; or take responsibility for what happens when users meet offline.' },
            { h: '3. User responsibilities', p: 'Users are responsible for: the accuracy of their profile information, their conduct during meetings, any agreements made with other users, their own safety and security. Before meeting in person, users must take reasonable steps to verify the other party — including a video or phone call — and should meet in public locations. Users should share meeting details (location, time, host/traveler name) with a trusted contact before every meetup.' },
            { h: '4. In-person meetings & platform limitations', p: 'Offmap has no ability to track, monitor, or control what happens during in-person meetings between users. Once users meet offline, they do so at their own risk. Offmap cannot mediate disputes about events that occur during in-person interactions, including but not limited to: quality of the experience, personal disagreements, property damage, or personal injury. Users agree not to hold Offmap responsible for any outcome of an in-person meeting. For safety incidents, contact local emergency services immediately (110/112 in Germany) and report to safety@offmap.com within 24 hours.' },
            { h: '5. Subscriptions and payment', p: 'Travelers pay a subscription to access messaging features. Session bookings are subject to a service fee (travelers) and platform commission (hosts) as displayed at checkout. Subscriptions are charged in advance. EU law: you have a 14-day right of withdrawal (Widerrufsrecht) from the date of purchase, unless you have already used the service. To exercise your right, contact support@offmap.com within 14 days.' },
            { h: '6. Prohibited conduct', p: 'Users must not: post false or misleading information, harass or threaten other users, use the platform for illegal activities, share personal contact information before a subscription is active, create multiple accounts to circumvent restrictions, or use Offmap to arrange activities that violate local laws.' },
            { h: '7. Liability limitation', p: 'Offmap\'s liability is limited to the amount you paid in subscription fees in the 3 months prior to the claim. Offmap is expressly not liable for: the conduct, actions, or omissions of hosts or travelers; the quality, safety, or legality of experiences; any physical, emotional, or financial harm arising from in-person meetings between users; loss of data; or any off-platform payments or arrangements between users.' },
            { h: '8. Governing law', p: 'These terms are governed by German law. Disputes shall be resolved in the courts of Berlin, Germany.' },
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
