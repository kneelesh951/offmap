/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream:  '#FAF7F2',
        sand:   '#F2EDE4',
        terra: {
          DEFAULT: '#C55A28',
          dark:    '#A64820',
          pale:    '#F5E8DF',
        },
        sage: {
          DEFAULT: '#5A7350',
          pale:    '#EAF0E6',
        },
        ink: {
          DEFAULT: '#1C1612',
          mid:     '#3D3428',
          soft:    '#6B5E4E',
          muted:   '#9E8E7A',
        },
      },
      fontFamily: {
        sans:  ['var(--font-geist-sans)', 'sans-serif'],
        // Headings use Sora (geometric display). Kept under the `serif` key so the
        // 180+ existing `font-serif` headings pick it up without per-file edits.
        serif: ['var(--font-display)', 'var(--font-fraunces)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'var(--font-fraunces)', 'sans-serif'],
        mono:  ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        xl:  '1.5rem',
        '2xl': '2rem',
      },
    },
  },
  plugins: [],
}
