import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [join(here, 'index.html'), join(here, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--surface)',
        panel2: 'var(--surface-2)',
        edge: 'var(--border)',
        edge2: 'var(--border-strong)',
        ink: 'var(--text)',
        ink2: 'var(--text-2)',
        ink3: 'var(--text-3)',
        accent: 'var(--accent)',
        accentbg: 'var(--accent-bg)',
        good: 'var(--good)',
        goodbg: 'var(--good-bg)',
        warn: 'var(--warn)',
        warnbg: 'var(--warn-bg)',
        bad: 'var(--bad)',
        badbg: 'var(--bad-bg)',
      },
      fontFamily: {
        sans: ['var(--sans)'],
        mono: ['var(--mono)'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'hero-xl': ['clamp(2.5rem, 8vw, 6.5rem)', { lineHeight: '0.9', letterSpacing: '-0.08em' }],
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
      backgroundImage: {
        'app-grid':
          'linear-gradient(90deg, color-mix(in srgb, var(--border) 20%, transparent) 0 1px, transparent 1px 56px), linear-gradient(0deg, color-mix(in srgb, var(--border) 16%, transparent) 0 1px, transparent 1px 56px)',
        'brand-radial':
          'radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 30rem)',
        'brand-surface':
          'linear-gradient(135deg, color-mix(in srgb, var(--accent-bg) 52%, transparent), transparent 38%, color-mix(in srgb, var(--surface-2) 56%, transparent))',
      },
      boxShadow: {
        theme: 'var(--shadow-lg)',
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
        'theme-xl': 'var(--shadow-xl)',
      },
      transitionTimingFunction: {
        productive: 'cubic-bezier(0.16, 1, 0.3, 1)',
        precise: 'cubic-bezier(0.22, 1, 0.36, 1)',
        soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
        flip: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'auth-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'auth-backdrop-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'auth-popover-in': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'countdown-pop': {
          from: { opacity: '0', transform: 'scale(1.6)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'auth-in': 'auth-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'auth-backdrop-in': 'auth-backdrop-in 0.2s ease-out',
        'auth-popover-in': 'auth-popover-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'countdown-pop': 'countdown-pop 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
