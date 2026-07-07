import type { CSSProperties, ReactNode } from 'react';
import { chromeText } from '@/design/chromeTypography';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

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
      className={cx(
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
