import type { Metadata } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import { MockBanner } from '@/components/ui/MockBanner'
import { AlmaButtonLazy } from '@/components/ai/AlmaButtonLazy'
import './globals.css'

const geistSans = Inter({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = JetBrains_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], style: ['normal', 'italic'] })

export const metadata: Metadata = {
  title: 'Offmap — Go where the map ends.',
  description: 'Connect with verified locals who show you the real city. Go where the map ends — subscribe once, unlock hosts in any city.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-cream text-ink`}>
        {children}
        <MockBanner />
        <AlmaButtonLazy />
      </body>
    </html>
  )
}
