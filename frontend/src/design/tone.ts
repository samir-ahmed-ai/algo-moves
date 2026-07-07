/** Semantic tone vocabulary for chips, meters, banners, and labels. */
export const UI_TONES = ['default', 'accent', 'good', 'bad', 'muted'] as const;
export type UiTone = (typeof UI_TONES)[number];

export const TONE_TEXT: Readonly<Record<UiTone, string>> = {
  default: 'tone-text tone-text--default text-ink',
  accent: 'tone-text tone-text--accent text-accent',
  good: 'tone-text tone-text--good text-good',
  bad: 'tone-text tone-text--bad text-bad',
  muted: 'tone-text tone-text--muted text-ink3',
};

export const TONE_BAR: Readonly<Record<UiTone, string>> = {
  default: 'var(--accent)',
  accent: 'var(--accent)',
  good: 'var(--good)',
  bad: 'var(--bad)',
  muted: 'var(--edge-active)',
};

export const TONE_CHIP: Readonly<Record<UiTone, string>> = {
  default: 'tone-chip tone-chip--default bg-panel2 text-ink2',
  accent: 'tone-chip tone-chip--accent bg-accentbg text-accent',
  good: 'tone-chip tone-chip--good bg-goodbg text-good',
  bad: 'tone-chip tone-chip--bad bg-badbg text-bad',
  muted: 'tone-chip tone-chip--muted bg-panel2 text-ink3',
};

export const TONE_BANNER: Readonly<Record<UiTone, string>> = {
  default: 'tone-banner tone-banner--default bg-panel2/60 text-ink2',
  accent: 'tone-banner tone-banner--accent bg-accentbg/70 text-ink2',
  good: 'tone-banner tone-banner--good bg-goodbg/70 text-ink2',
  bad: 'tone-banner tone-banner--bad bg-badbg/70 text-ink2',
  muted: 'tone-banner tone-banner--muted bg-panel2/50 text-ink3',
};

export const TONE_LABEL: Readonly<Record<UiTone, string>> = {
  default: 'tone-label tone-label--default text-ink3',
  accent: 'tone-label tone-label--accent text-accent',
  good: 'tone-label tone-label--good text-good',
  bad: 'tone-label tone-label--bad text-bad',
  muted: 'tone-label tone-label--muted text-ink3',
};

export function isUiTone(value: unknown): value is UiTone {
  return typeof value === 'string' && (UI_TONES as readonly string[]).includes(value);
}

export function normalizeUiTone(value: unknown, fallback: UiTone = 'default'): UiTone {
  return isUiTone(value) ? value : fallback;
}

/** Maps a difficulty label to the shared chip tone vocabulary. */
export function difficultyTone(d?: string): UiTone {
  const k = (d ?? '').trim().toLowerCase();
  if (k === 'easy') return 'good';
  if (k === 'hard') return 'bad';
  return 'accent';
}
