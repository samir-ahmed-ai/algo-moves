/** Shared shell chrome type scale — mirrors `--fs*` in index.css. */
export const chromeText = {
  base: 'chrome-text chrome-text--base text-[length:var(--fs,14px)] leading-[var(--lh,1.4)] tabular-nums',
  sm: 'chrome-text chrome-text--sm text-[length:var(--fs-sm,13px)] leading-[var(--lh-snug,1.35)] tabular-nums',
  xs: 'chrome-text chrome-text--xs text-[length:var(--fs-xs,12px)] leading-[var(--lh-snug,1.35)] tabular-nums',
  tight:
    'chrome-text chrome-text--tight text-[length:var(--fs-tight,11px)] leading-[var(--lh-tight,1.25)] tabular-nums',
  '2xs':
    'chrome-text chrome-text--2xs text-[length:var(--fs-2xs,9px)] leading-[var(--lh-tight,1.25)] tabular-nums',
  title:
    'chrome-text chrome-text--title text-[length:var(--fs-title,15px)] leading-[var(--lh-tight,1.25)] font-semibold tabular-nums',
} as const;

/** Shared slim workspace / browse top bar shell. */
export const chromeBar = {
  shell:
    'chrome-bar-shell flex min-w-0 shrink-0 items-center gap-[var(--gap)] border-b border-edge bg-bg/90 px-[var(--hpad)] py-[var(--pad)] backdrop-blur-sm',
} as const;

export type ChromeTextScale = keyof typeof chromeText;
