import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/cn';

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
