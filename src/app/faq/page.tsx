'use client'
import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ChevronDown } from 'lucide-react'

const GREEN = '#084E4E'

const FAQS = {
  'For Travelers': [
    { q: 'What is Offmap?', a: 'Offmap is a subscription platform that connects travelers with verified local hosts across Europe. Instead of packaged tours, you get a direct connection with a real local — someone who knows their city from the inside.' },
    { q: 'How does the subscription work?', a: 'Choose a Day (€6), Week (€12), Month (€18), or Annual (€49) plan. Your subscription lets you unlock direct messaging with any host in any city. Hosts set their own rates — a small platform fee covers payments and support.' },
    { q: 'Can I cancel my subscription at any time?', a: 'Yes. You can cancel at any time from your dashboard. Under EU consumer law (Directive 2011/83/EU), you also have a 14-day right of withdrawal from the date of purchase for digital services you have not yet used.' },
    { q: 'How are hosts verified?', a: 'Every host submits a government-issued ID (passport or national identity card) and is manually reviewed by our trust team before their profile goes live. Approved profiles display a verified badge.' },
    { q: 'What if I have a bad experience?', a: 'Contact our support team at support@offmap.com within 7 days. We investigate all reports and have a strict zero-tolerance policy for harassment, discrimination, or safety violations. Hosts who violate our guidelines are permanently removed.' },
    { q: 'Is my payment data secure?', a: 'All payments are processed by Stripe, Inc. — we never store your card details. Stripe is PCI-DSS Level 1 certified, the highest level of payment security certification.' },
    { q: 'Where is my personal data stored?', a: 'All personal data is stored within the European Union, on servers located in Frankfurt, Germany. We comply fully with GDPR (Regulation EU 2016/679). See our Privacy Policy for full details.' },
  ],
  'Meeting Safety': [
    { q: 'How should I verify a host before meeting?', a: 'Before meeting in person, we strongly recommend a video or phone call to verify each other\'s identity. Check their profile reviews, confirm the meeting details, and trust your instincts. If anything feels off, do not proceed with the meeting.' },
    { q: 'Where should I meet a host for the first time?', a: 'Always meet in a public place — a café, restaurant, landmark, or busy square. Never agree to meet at a private residence for your first meeting. Make sure the location is well-lit and easy to leave.' },
    { q: 'Should I share my plans with someone?', a: 'Absolutely. Before every meetup, share your host\'s name, the meeting location, and your expected return time with a friend or family member. Consider using a live location-sharing feature on your phone.' },
    { q: 'What is Offmap\'s role during an in-person meeting?', a: 'Offmap is a connection platform — once you meet in person, you are responsible for your own safety and experience. We have no way to track, monitor, or supervise what happens during meetups. This is why we strongly recommend verifying your host beforehand and sharing your plans with someone you trust.' },
    { q: 'What should I do if I feel unsafe during a meeting?', a: 'Leave immediately. Call the local emergency number (110 for police or 112 for medical/fire in Germany). Then report the incident to Offmap within 24 hours at safety@offmap.com — we respond to safety reports within 1 hour.' },
    { q: 'Can I raise a dispute with Offmap after a meeting?', a: 'You can report safety violations, harassment, or misconduct — we will investigate and take action against the other user. However, Offmap cannot mediate disputes about the quality of the experience itself or refund payments made directly between users off-platform. This is why we recommend booking through Offmap for full protection.' },
  ],
  'For Hosts': [
    { q: 'Is it free to list as a host?', a: 'Yes. Creating a host profile is completely free. When bookings happen through Offmap, a small platform fee covers payment processing and support — most of what you earn goes directly to you.' },
    { q: 'How do I get paid?', a: 'For bookings made through Offmap, payments are processed securely via Stripe and paid out directly to your bank account. You can also arrange direct payment with travelers, but off-platform payments are not covered by our dispute resolution.' },
    { q: 'Can I set my own rates and availability?', a: 'Completely. You set your hourly rate, your availability, and your terms. You can accept or decline any traveler. You are an independent contractor, not an employee of Offmap.' },
    { q: 'Am I self-employed? Do I need to declare income?', a: 'Host earnings on Offmap are considered self-employment income in Germany and most EU countries. If you earn more than the Kleinunternehmergrenze (€22,000/year in Germany), you may need to register as a Kleinunternehmer or full business. Please consult a Steuerberater for advice specific to your situation.' },
    { q: 'How long does profile approval take?', a: 'We aim to review all profiles within 24 hours on business days. You will receive an email confirmation when your profile is approved or if we need additional information.' },
    { q: 'What happens if a traveler cancels?', a: 'For on-platform bookings: travelers receive a full refund if they cancel 48h+ before the session, 50% for 24-48h, and no refund under 24h. You receive your share for late cancellations. See our full cancellation policy for details.' },
    { q: 'How should I verify a traveler before meeting?', a: 'We recommend a quick video or phone call before meeting any traveler in person. Confirm their identity matches their profile, agree on a public meeting spot, and share the details with someone you trust. If anything feels off, decline the booking — your safety comes first.' },
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
    <div className="border-b" style={{ borderColor: 'rgba(8,78,78,0.10)' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between py-5 text-left gap-4">
        <span className="font-semibold text-base" style={{ color: GREEN }}>{q}</span>
        <ChevronDown size={18} style={{ color: GREEN, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed" style={{ color: '#4A8E8E' }}>{a}</p>}
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

            <div className="mt-12 rounded-2xl p-8 text-center" style={{ backgroundColor: '#F7FAF8', border: '1px solid rgba(8,78,78,0.10)' }}>
              <h3 className="font-serif text-xl font-bold mb-2" style={{ color: GREEN }}>Still have a question?</h3>
              <p className="text-sm mb-5" style={{ color: '#4A8E8E' }}>Our team responds within one business day.</p>
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
