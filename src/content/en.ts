/**
 * Central English site copy.
 *
 * All user-facing text lives here instead of being hardcoded inside pages.
 * Pages import from this file and reference keys, so:
 *   - To change any wording, you edit it here in ONE place.
 *   - Every page stays purely about layout/styling, not content.
 *
 * This is also the foundation for future translation: a `de.ts` file would
 * mirror this exact structure, and pages would pick the right one by locale.
 * (See docs/I18N_PLAN.md.)
 */

export const en = {
  about: {
    hero: {
      eyebrow: 'About Offmap',
      // Two lines to preserve the intentional line break in the heading.
      titleLine1: 'We believe every city has',
      titleLine2: 'a story worth sharing.',
      subtitle:
        'Offmap connects curious travelers with verified locals across Europe — not tour guides, not influencers, but real people who know and love their city.',
    },
    story: {
      eyebrow: 'Our Story',
      title: 'Started with a bold idea. Now live across 8 European cities.',
      paragraphs: [
        'In 2023, Neelesh had a frustration shared by millions of travelers: tourists were paying €80 for scripted group bus tours while locals — people with real stories, deep knowledge, and genuine passion for their cities — had no platform to share it.',
        'He built the first version of Offmap and launched it quietly with 12 hosts, and watched something remarkable happen: travelers were writing reviews saying it was the best experience of their entire trip. Not the best tour. The best part of their trip.',
        'Today Offmap operates in 8 cities across Europe with over 1,300 verified hosts. Every host sets their own rate. Every traveler subscribes once and connects with as many locals as they like. The platform takes no commission on host earnings — ever.',
        'We are registered as Offmap GmbH in Frankfurt, Germany, and operate under German and EU law. Our servers and data are hosted entirely within the European Union, in compliance with GDPR.',
      ],
    },
    values: {
      eyebrow: 'What we stand for',
      title: 'Our values',
      items: [
        { icon: '🤝', title: 'Authentic connection', body: 'We believe the best travel experiences happen between real people — not through packaged tours or algorithm-curated content.' },
        { icon: '🔒', title: 'Safety first', body: 'Every host is ID-verified. Every traveler is reviewed. We maintain strict community standards and a zero-tolerance policy for harassment.' },
        { icon: '🌍', title: 'Local economy', body: 'We take zero commission from host earnings. Our flat subscription model means locals keep 100% of what they negotiate.' },
        { icon: '🇪🇺', title: 'Privacy by design', body: 'Built from day one for GDPR compliance. Your data is stored in the EU, never sold, and you can request full deletion at any time.' },
      ],
    },
    team: {
      eyebrow: 'The team',
      title: 'People behind Offmap',
      members: [
        { name: 'Neelesh', role: 'Founder & CEO', city: 'Frankfurt', bio: 'Visionary entrepreneur and the driving force behind Offmap. Passionate about authentic travel experiences and connecting people across cultures, Neelesh built Offmap to reimagine how travelers discover and experience cities — through the eyes of the people who live there.' },
      ],
    },
    company: {
      title: 'Company information',
      fields: [
        ['Legal name', 'Offmap GmbH'],
        ['Registered office', 'Taunusanlage 8, 60329 Frankfurt am Main, Germany'],
        ['Registration court', 'Amtsgericht Frankfurt am Main'],
        ['Registration number', 'HRB 124783'],
        ['VAT ID', 'DE 312 456 789'],
        ['Founder & CEO', 'Neelesh'],
        ['Founded', '2023'],
        ['Contact', 'hello@offmap.com'],
      ],
    },
  },
} as const
