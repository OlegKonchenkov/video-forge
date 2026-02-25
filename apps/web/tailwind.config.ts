import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Cinematic palette ── */
        'film-black':  '#080808',
        'film-amber':  '#E8C547',
        'film-amber-dim': '#C4A63A',
        'film-cream':  '#F0EBE1',
        'film-warm':   '#141209',
        'film-card':   '#0F0E0A',
        'film-border': '#2A2218',
        'film-gray':   '#7A746E',
        'film-gray-light': '#B0A89E',
        /* ── Legacy for (app) pages ── */
        bg: '#050d1a',
        'bg-card': '#0a1628',
        accent: '#3b82f6',
        cyan: '#06b6d4',
        success: '#22c55e',
        danger: '#ef4444',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        serif:   ['var(--font-dm-serif)', 'Georgia', 'serif'],
        sans:    ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-syne-mono)', 'monospace'],
      },
      fontSize: {
        '10xl': ['10rem',  { lineHeight: '0.9' }],
        '11xl': ['12rem',  { lineHeight: '0.85' }],
        '12xl': ['14rem',  { lineHeight: '0.82' }],
      },
      animation: {
        'marquee':         'marquee 28s linear infinite',
        'marquee-reverse': 'marqueeReverse 28s linear infinite',
        'fade-up':         'fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
        'flicker':         'flicker 9s steps(1) infinite',
        'glow-pulse':      'glowPulse 3s ease-in-out infinite',
        float:             'float 6s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marqueeReverse: {
          '0%':   { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(32px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.75' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.85' },
          '97%': { opacity: '1' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 20px rgba(59,130,246,0.3)' },
          '50%':     { boxShadow: '0 0 60px rgba(59,130,246,0.6)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
      },
      backgroundImage: {
        'amber-gradient': 'linear-gradient(135deg, #E8C547 0%, #C4A63A 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
