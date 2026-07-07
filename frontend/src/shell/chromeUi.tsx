import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { chromeBar, chromeText } from '@/design/chromeTypography';
export { chromeBar, chromeText };
export { ChromeLabel } from '@/design/components/ChromeLabel';

interface ChromeTextProps {
  children: ReactNode;
  className?: string;
  mono?: boolean;
}

/** Pick a shorter button label on phone-sized viewports. */
export function compactLabel(full: string, compact: string, isMobile: boolean): string {
  const fallback = full.trim();
  const short = compact.trim();
  return isMobile && short ? short : fallback;
}

/** Muted helper / hint copy for shell chrome. */
export function ChromeHint({ children, className, mono }: ChromeTextProps) {
  return (
    <span
      className={cn(
        chromeText.sm,
        'chrome-hint text-ink3',
        mono && 'font-mono tabular-nums',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Keyboard shortcut or hint badge for command palette / menus. */
export function ChromeKbd({ children, className, mono = true }: ChromeTextProps) {
  return (
    <kbd
      className={cn(
        chromeText.xs,
        'chrome-kbd inline-flex shrink-0 items-center rounded border border-edge bg-panel2 px-1 py-px text-ink3',
        mono && 'font-mono tabular-nums',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Uppercase token badge (action, panel, problem, ...). */
export function ChromeToken({ children, className }: Omit<ChromeTextProps, 'mono'>) {
  return (
    <span
      className={cn(
        chromeText.xs,
        'chrome-token inline-flex shrink-0 items-center rounded border border-edge bg-panel2 px-1 py-px font-medium uppercase tracking-wide text-ink3',
        className,
      )}
    >
      {children}
    </span>
  );
}
