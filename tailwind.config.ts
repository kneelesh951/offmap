import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF5E9',
        sand: '#F2EDE4',
        ivory: '#FAF5E9',
        terra: {
          DEFAULT: '#E8621A',
          dark: '#C4511A',
          pale: '#FDF0E8',
        },
        sage: {
          DEFAULT: '#5A7350',
          pale: '#EAF0E6',
        },
        ink: {
          DEFAULT: '#084E4E',
          mid: '#0C7B7B',
          soft: '#0E9A9A',
          muted: '#4A8E8E',
        },
        teal: {
          DEFAULT: '#0C7B7B',
          dark: '#084E4E',
          deep: '#063B3B',
          light: '#0E9A9A',
        },
        tangerine: {
          DEFAULT: '#FFCC00',
          dark: '#E6B800',
          light: '#FFD633',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        xl: '1.5rem',
        '2xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
