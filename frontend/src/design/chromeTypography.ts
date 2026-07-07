/** Shared shell chrome type scale — mirrors `--fs*` in index.css. */
export const chromeText = {
  base: 'text-[length:var(--fs,14px)] leading-[var(--lh,1.4)]',
  sm: 'text-[length:var(--fs-sm,13px)] leading-[var(--lh-snug,1.35)]',
  xs: 'text-[length:var(--fs-xs,12px)] leading-[var(--lh-snug,1.35)]',
  tight: 'text-[length:var(--fs-tight,11px)] leading-[var(--lh-tight,1.25)]',
  '2xs': 'text-[length:var(--fs-2xs,9px)] leading-[var(--lh-tight,1.25)]',
  title: 'text-[length:var(--fs-title,15px)] leading-[var(--lh-tight,1.25)] font-semibold',
} as const;

/** Shared slim workspace / browse top bar shell. */
export const chromeBar = {
  shell:
    'flex shrink-0 items-center gap-[var(--gap)] border-b border-edge bg-bg/90 px-[var(--hpad)] py-[var(--pad)] backdrop-blur-sm',
} as const;
