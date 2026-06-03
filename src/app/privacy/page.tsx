import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream pt-[66px]">
        <div className="max-w-3xl mx-auto px-5 md:px-11 py-16 prose prose-sm">
          <h1 className="font-serif text-3xl font-bold text-ink mb-2">Privacy Policy</h1>
          <p className="text-ink-muted text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
            <strong>⚠️ Important:</strong> This is a placeholder privacy policy template. Before launching, you must have a qualified German lawyer (Rechtsanwalt) draft a proper Datenschutzerklärung compliant with GDPR and German data protection law. This is a legal requirement.
          </div>

          {[
            { h: '1. Who we are', p: 'Offmap GmbH is a company registered in Berlin, Germany. We operate the Offmap platform which connects travelers with local hosts. Contact: datenschutz@offmap.com' },
            { h: '2. Data we collect', p: 'We collect: account information (name, email, password hash), profile data (bio, photos, languages), usage data (pages visited, searches performed), subscription and payment data (via Stripe — we never store card details), communication records (messages between users), and technical data (IP address, browser type, device). We collect the minimum data necessary to operate the platform.' },
            { h: '3. Legal basis (GDPR)', p: 'We process your data based on: contract performance (to provide the service you signed up for), your consent (for marketing communications), legal obligation (for financial records and fraud prevention), and legitimate interests (for platform security and abuse prevention).' },
            { h: '4. Data storage location', p: 'All personal data is stored exclusively in the European Union. Our servers and databases are located in Frankfurt, Germany. We do not transfer personal data outside the EU/EEA without appropriate safeguards.' },
            { h: '5. Your rights (GDPR)', p: 'You have the right to: access your personal data, correct inaccurate data, delete your data ("right to be forgotten"), restrict processing, data portability (export your data in machine-readable format), and object to processing. To exercise any of these rights, contact datenschutz@offmap.com. We will respond within 30 days.' },
            { h: '6. Data retention', p: 'We retain account data for as long as you have an account. Deleted account data is anonymised within 30 days. Message content is retained for 12 months then archived. Financial records are retained for 10 years as required by German tax law (§ 147 AO).' },
            { h: '7. Cookies', p: 'We use only essential cookies required for authentication and security. We do not use advertising or tracking cookies. No third-party analytics that could identify you personally are used without your explicit consent.' },
            { h: '8. Third-party processors', p: 'We share data with: Supabase (database hosting, EU region), Stripe (payment processing — their privacy policy applies to payment data), Resend (email delivery), Cloudflare (CDN and security). All processors are bound by data processing agreements.' },
            { h: '9. Contact & complaints', p: 'Data protection officer: datenschutz@offmap.com. You have the right to lodge a complaint with the Berlin data protection authority (Berliner Beauftragter für Datenschutz und Informationsfreiheit): mailbox@datenschutz-berlin.de.' },
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
