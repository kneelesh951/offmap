import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF7F2',
        sand: '#F2EDE4',
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
          DEFAULT: '#0F3D22',
          mid: '#1E6038',
          soft: '#2D6B3F',
          muted: '#4A7A5C',
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
