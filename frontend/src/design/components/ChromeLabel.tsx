import type { CSSProperties, ReactNode } from 'react';
import { chromeText } from '@/design/chromeTypography';
import { cn } from '@/design/cn';

interface ChromeLabelProps {
  children: ReactNode;
  className?: string;
  mono?: boolean;
  style?: CSSProperties;
}

/** Small uppercase label for shell chrome (dock tabs, section headers). */
export function ChromeLabel({ children, className, mono, style }: ChromeLabelProps) {
  return (
    <span
      style={style}
      className={cn(
        chromeText.sm,
        'chrome-label font-medium uppercase tracking-wide leading-[var(--lh-tight,1.25)] text-ink3',
        mono && 'chrome-label--mono font-mono normal-case tracking-normal tabular-nums',
        className,
      )}
    >
      {children}
    </span>
  );
}
