import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Shared shell chrome type scale — mirrors `--fs*` in index.css. */
export const chromeText = {
  base: 'text-[length:var(--fs,14px)] leading-[var(--lh,1.4)]',
  sm: 'text-[length:var(--fs-sm,13px)] leading-[var(--lh-snug,1.35)]',
  xs: 'text-[length:var(--fs-xs,12px)] leading-[var(--lh-snug,1.35)]',
  tight: 'text-[length:var(--fs-tight,11px)] leading-[var(--lh-tight,1.25)]',
  '2xs': 'text-[length:var(--fs-2xs,9px)] leading-[var(--lh-tight,1.25)]',
  title: 'text-[length:var(--fs-title,15px)] leading-[var(--lh-tight,1.25)] font-semibold',
} as const;

/** Small uppercase label for shell chrome (dock tabs, section headers). */
export function ChromeLabel({
  children,
  className,
  mono,
  style,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        chromeText.sm,
        'font-medium uppercase tracking-wide leading-[var(--lh-tight,1.25)] text-ink3',
        mono && 'font-mono normal-case tracking-normal tabular-nums',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Pick a shorter button label on phone-sized viewports. */
export function compactLabel(full: string, compact: string, isMobile: boolean) {
  return isMobile ? compact : full;
}

/** Muted helper / hint copy for shell chrome. */
export function ChromeHint({
  children,
  className,
  mono,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span className={cn(chromeText.sm, 'text-ink3', mono && 'font-mono tabular-nums', className)}>
      {children}
    </span>
  );
}

/** Shared slim workspace / browse top bar shell. */
export const chromeBar = {
  shell:
    'flex shrink-0 items-center gap-[var(--gap)] border-b border-edge bg-bg/90 px-[var(--hpad)] py-[var(--pad)] backdrop-blur-sm',
} as const;

/** Keyboard shortcut or hint badge for command palette / menus. */
export function ChromeKbd({
  children,
  className,
  mono = true,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <kbd
      className={cn(
        chromeText.xs,
        'inline-flex shrink-0 items-center rounded border border-edge bg-panel2 px-1 py-px text-ink3',
        mono && 'font-mono tabular-nums',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Uppercase token badge (action, panel, problem, …). */
export function ChromeToken({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        chromeText.xs,
        'inline-flex shrink-0 items-center rounded border border-edge bg-panel2 px-1 py-px font-medium uppercase tracking-wide text-ink3',
        className,
      )}
    >
      {children}
    </span>
  );
}
