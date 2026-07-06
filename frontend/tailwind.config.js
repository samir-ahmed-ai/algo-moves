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
        bad: 'var(--bad)',
        badbg: 'var(--bad-bg)',
      },
      fontFamily: {
        sans: ['var(--sans)'],
        mono: ['var(--mono)'],
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
      boxShadow: {
        theme: 'var(--shadow-lg)',
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
        'theme-xl': 'var(--shadow-xl)',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'auth-in': 'auth-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'auth-backdrop-in': 'auth-backdrop-in 0.2s ease-out',
        'auth-popover-in': 'auth-popover-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
