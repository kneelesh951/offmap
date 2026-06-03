'use client'
import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ChevronDown } from 'lucide-react'

const GREEN = '#0F3D22'

const FAQS = {
  'For Travelers': [
    { q: 'What is Offmap?', a: 'Offmap is a subscription platform that connects travelers with verified local hosts across Europe. Instead of packaged tours, you get a direct connection with a real local — someone who knows their city from the inside.' },
    { q: 'How does the subscription work?', a: 'Choose a Day (€6), Week (€12), Month (€18), or Annual (€49) plan. Your subscription lets you unlock direct messaging with any host in any city. Hosts set their own rates and you negotiate meeting details directly — Offmap charges no commission on what you pay the host.' },
    { q: 'Can I cancel my subscription at any time?', a: 'Yes. You can cancel at any time from your dashboard. Under EU consumer law (Directive 2011/83/EU), you also have a 14-day right of withdrawal from the date of purchase for digital services you have not yet used.' },
    { q: 'How are hosts verified?', a: 'Every host submits a government-issued ID (passport or national identity card) and is manually reviewed by our trust team before their profile goes live. Approved profiles display a verified badge.' },
    { q: 'What if I have a bad experience?', a: 'Contact our support team at support@offmap.com within 7 days. We investigate all reports and have a strict zero-tolerance policy for harassment, discrimination, or safety violations. Hosts who violate our guidelines are permanently removed.' },
    { q: 'Is my payment data secure?', a: 'All payments are processed by Stripe, Inc. — we never store your card details. Stripe is PCI-DSS Level 1 certified, the highest level of payment security certification.' },
    { q: 'Where is my personal data stored?', a: 'All personal data is stored within the European Union, on servers located in Frankfurt, Germany. We comply fully with GDPR (Regulation EU 2016/679). See our Privacy Policy for full details.' },
  ],
  'For Hosts': [
    { q: 'Is it free to list as a host?', a: 'Yes. Creating a host profile is completely free. Offmap charges no listing fee, no commission, and no percentage of your earnings. You keep 100% of what you charge travelers.' },
    { q: 'How do I get paid?', a: 'Payment is arranged directly between you and the traveler — by cash, bank transfer, or any method you both agree on. Offmap does not process or hold host earnings.' },
    { q: 'Can I set my own rates and availability?', a: 'Completely. You set your hourly rate, your availability, and your terms. You can accept or decline any traveler. You are an independent contractor, not an employee of Offmap.' },
    { q: 'Am I self-employed? Do I need to declare income?', a: 'Host earnings on Offmap are considered self-employment income in Germany and most EU countries. If you earn more than the Kleinunternehmergrenze (€22,000/year in Germany), you may need to register as a Kleinunternehmer or full business. Please consult a Steuerberater for advice specific to your situation.' },
    { q: 'How long does profile approval take?', a: 'We aim to review all profiles within 24 hours on business days. You will receive an email confirmation when your profile is approved or if we need additional information.' },
    { q: 'What happens if a traveler cancels?', a: 'Cancellation and refund terms are between you and the traveler. We recommend agreeing on a cancellation policy upfront when you first message each other.' },
    { q: 'Can I host travelers from any country?', a: 'Yes. Offmap operates EU-wide and travelers come from around the world. You choose which travelers to work with.' },
  ],
  'Privacy & GDPR': [
    { q: 'What personal data does Offmap collect?', a: 'We collect: account information (name, email, phone), profile content you provide, communication between users, payment records (processed by Stripe — we see only transaction status), and usage data for platform improvement.' },
    { q: 'How long do you keep my data?', a: 'Active account data is kept for the duration of your account plus 3 years for legal and accounting purposes. Communication logs are kept for 2 years. You can request earlier deletion at any time.' },
    { q: 'Can I request deletion of my data?', a: 'Yes. Under GDPR Article 17, you have the right to erasure ("right to be forgotten"). Submit a deletion request at privacy@offmap.com. We will process it within 30 days, subject to any legal retention obligations.' },
    { q: 'Who is the Data Protection Officer?', a: 'Our DPO is Sophie Koch, reachable at datenschutz@offmap.com or at our registered address: Invalidenstraße 115, 10115 Berlin, Germany. You also have the right to lodge a complaint with the Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI).' },
  ],
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b" style={{ borderColor: 'rgba(15,61,34,0.10)' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between py-5 text-left gap-4">
        <span className="font-semibold text-base" style={{ color: GREEN }}>{q}</span>
        <ChevronDown size={18} style={{ color: GREEN, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed" style={{ color: '#4A7A5C' }}>{a}</p>}
    </div>
  )
}

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main>
        <div className="pt-[68px]">
          <div className="py-20 px-5 md:px-11 text-white" style={{ backgroundColor: GREEN }}>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Help centre</p>
              <h1 className="font-serif text-5xl font-bold mb-6" style={{ letterSpacing: '-1.5px' }}>Frequently asked questions</h1>
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>Everything you need to know about Offmap — for travelers, hosts, and data subjects.</p>
            </div>
          </div>
        </div>

        <div className="py-16 px-5 md:px-11 bg-white">
          <div className="max-w-3xl mx-auto">
            {Object.entries(FAQS).map(([section, items]) => (
              <div key={section} className="mb-14">
                <h2 className="font-serif text-2xl font-bold mb-6" style={{ color: GREEN }}>{section}</h2>
                {items.map(item => <FAQ key={item.q} {...item} />)}
              </div>
            ))}

            <div className="mt-12 rounded-2xl p-8 text-center" style={{ backgroundColor: '#F7FAF8', border: '1px solid rgba(15,61,34,0.10)' }}>
              <h3 className="font-serif text-xl font-bold mb-2" style={{ color: GREEN }}>Still have a question?</h3>
              <p className="text-sm mb-5" style={{ color: '#4A7A5C' }}>Our team responds within one business day.</p>
              <a href="mailto:support@offmap.com"
                className="inline-block px-8 py-3 rounded-full text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)' }}>
                Email support →
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
