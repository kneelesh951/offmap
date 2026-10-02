# Visual Enhancements Tracker

Each entry records what changed, which files, and the exact before-state so any change can be reverted.

---

## #1 — Navbar: Transparent hero + scroll progress bar + logo glow + CTA pulse ring

**Status:** ↩ Reverted  
**Date:** 2026-09-29  
**File:** `src/components/layout/Navbar.tsx`

### What changed
1. **Transparent hero navbar** — `isTransparent` was computed but never used in the header style (dead code). Now actually applied: on `/` and `/search`, when at the top of the page, the navbar is fully transparent so the hero image shows through. On scroll past 50px it fades to the frosted-glass dark style.
2. **Scroll progress bar** — thin 2.5px orange→gold gradient bar at the very top of the header that fills as the user scrolls. Has a subtle glow shadow. Added `scrollProgress` state tracked alongside `scrolled`.
3. **Logo glow on scroll** — "Off" gets a soft white `text-shadow` and "map" gets an orange `drop-shadow` filter once the user has scrolled, reinforcing the brand.
4. **CTA pulse ring** — "Get started" button (logged-out state) gets an animated `animate-ping` ring behind it using the orange gradient. Subtle urgency signal.
5. **Darker scrolled state** — when scrolled, background darkens slightly from `rgba(4,45,45,0.96)` to `rgba(3,26,26,0.92)` and shadow deepens.
6. **Single scroll handler** — merged the two `window.addEventListener('scroll', ...)` calls into one handler that updates both `scrolled` and `scrollProgress`.

### Before (revert to this)
```
// Line 29 — only scrolled state, no scrollProgress:
const [scrolled, setScrolled] = useState(false)
// no scrollProgress state

// Lines 40–46 — handler only set scrolled:
useEffect(() => {
  setScrolled(window.scrollY > 50)
  const handler = () => setScrolled(window.scrollY > 50)
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])

// Lines 172–183 — isTransparent never used, always dark:
<header
  className="fixed top-0 left-0 right-0 z-30 h-[66px] flex items-center justify-between px-5 md:px-10 transition-all duration-500"
  style={{
    background: 'rgba(4,45,45,0.96)',
    backdropFilter: 'blur(20px) saturate(1.8)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    boxShadow: scrolled
      ? '0 8px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.12)'
      : '0 4px 24px rgba(0,0,0,0.25)',
  }}
>

// Logo — no glow effects:
<span style={{ fontSize: '24px', letterSpacing: '-0.04em' }}>Off</span>
<span style={{ fontSize: '24px', letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#E8621A,#F5A623)', ... }}>map</span>

// "Get started" — plain link, no pulse ring:
<Link
  href="/auth/register"
  className="hidden md:block text-[13px] font-bold px-5 py-2 rounded-full text-white transition-all hover:-translate-y-0.5"
  style={{ background: 'linear-gradient(135deg,#E8621A,#F07830)', boxShadow: '0 3px 14px rgba(232,98,26,0.45)' }}
>
  Get started
</Link>
```

---

## #2 — Cities section: dual-row infinite marquee + live pulse dot

**Status:** ✅ Applied  
**Date:** 2026-09-29  
**Files:** `src/components/home/HomeClient.tsx`, `src/app/globals.css`

### What changed
1. **Infinite two-row marquee** — cities split into two halves. Top row scrolls left, bottom row scrolls right, both continuously. Each row duplicates its cards so the loop is seamless.
2. **Pause on hover** — hovering anywhere on either row pauses both via CSS `animation-play-state: paused` on `.marquee-row:hover`.
3. **Edge fade** — `mask-image` gradient on each row fades cards in/out at the left and right edges.
4. **Richer cards** — flag is larger (30px), cards are taller (`py-4`), cycling through 4 gradient tint backgrounds (teal, apricot, green, violet).
5. **Hover lift** — cards lift `-translate-y-1` and get a deeper shadow on hover.
6. **Live pulse dot** — small animated ping dot added next to "AVAILABLE NOW" overline label.
7. **CSS additions** — `@keyframes marquee-left`, `@keyframes marquee-right`, `.marquee-track-l`, `.marquee-track-r`, `.marquee-row:hover` pause selector.

### Before (revert: restore the old CITIES block in HomeClient.tsx)
Original section was a single `overflow-x-auto` horizontal scroll row of pills with:
- `background: '#E0F2F2'` (single colour, no cycling)
- `text-2xl` flag, smaller card padding
- No animation, no mask fade, no live dot
No changes to globals.css beyond this block.

---

<!-- Future entries go here -->
