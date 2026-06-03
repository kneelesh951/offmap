import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

// Impressum is a legal requirement for all German websites (§ 5 TMG)
// Update with real company details after registration
export default function ImpressumPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream pt-[66px]">
        <div className="max-w-2xl mx-auto px-5 md:px-11 py-16">
          <h1 className="font-serif text-3xl font-bold text-ink mb-8">Impressum</h1>
          <div className="bg-white rounded-2xl border border-black/[0.08] p-8 text-sm text-ink-soft leading-relaxed space-y-4">
            <div>
              <div className="font-semibold text-ink mb-1">Angaben gemäß § 5 TMG</div>
              <p>Offmap GmbH<br />[Street address]<br />[Postcode] Berlin<br />Germany</p>
            </div>
            <div>
              <div className="font-semibold text-ink mb-1">Vertreten durch</div>
              <p>[Managing Director name]</p>
            </div>
            <div>
              <div className="font-semibold text-ink mb-1">Kontakt</div>
              <p>E-Mail: legal@offmap.com</p>
            </div>
            <div>
              <div className="font-semibold text-ink mb-1">Registereintrag</div>
              <p>Eingetragen im Handelsregister.<br />Registergericht: Amtsgericht Berlin-Charlottenburg<br />Registernummer: [HRB number after registration]</p>
            </div>
            <div>
              <div className="font-semibold text-ink mb-1">Umsatzsteuer-ID</div>
              <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:<br />[VAT ID after registration]</p>
            </div>
            <div>
              <div className="font-semibold text-ink mb-1">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</div>
              <p>[Managing Director name]<br />[Address as above]</p>
            </div>
            <div className="text-xs text-ink-muted pt-4 border-t border-black/[0.07]">
              <p className="font-semibold text-ink mb-1">Haftungsausschluss</p>
              <p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
