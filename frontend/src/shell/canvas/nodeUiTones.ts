import type { UiTone } from './nodeui';

// Tone → Tailwind/CSS-var lookup tables for the node design system, extracted from
// nodeui.tsx. Pure design tokens; each maps a semantic UiTone to utility classes.

export const TONE_TEXT: Record<UiTone, string> = {
  default: 'text-ink',
  accent: 'text-accent',
  good: 'text-good',
  bad: 'text-bad',
  muted: 'text-ink3',
};

export const TONE_BAR: Record<UiTone, string> = {
  default: 'var(--accent)',
  accent: 'var(--accent)',
  good: 'var(--good)',
  bad: 'var(--bad)',
  muted: 'var(--edge-active)',
};

export const TONE_CHIP: Record<UiTone, string> = {
  default: 'bg-panel2 text-ink2',
  accent: 'bg-accentbg text-accent',
  good: 'bg-goodbg text-good',
  bad: 'bg-badbg text-bad',
  muted: 'bg-panel2 text-ink3',
};

export const TONE_BANNER: Record<UiTone, string> = {
  default: 'bg-panel2/60 text-ink2',
  accent: 'bg-accentbg/70 text-ink2',
  good: 'bg-goodbg/70 text-ink2',
  bad: 'bg-badbg/70 text-ink2',
  muted: 'bg-panel2/50 text-ink3',
};

export const TONE_LABEL: Record<UiTone, string> = {
  default: 'text-ink3',
  accent: 'text-accent',
  good: 'text-good',
  bad: 'text-bad',
  muted: 'text-ink3',
};
