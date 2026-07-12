'use client'

import dynamic from 'next/dynamic'

// Load the Alma chat button client-side only. It pulls in the AI SDK (`ai` +
// `@ai-sdk/react`), which must never run during the server-side static export
// at build time. `ssr: false` keeps it out of the build/export path entirely —
// the button is purely interactive and has no meaningful server-rendered state.
const AlmaButton = dynamic(
  () => import('./AlmaButton').then((m) => m.AlmaButton),
  { ssr: false }
)

export function AlmaButtonLazy() {
  return <AlmaButton />
}
