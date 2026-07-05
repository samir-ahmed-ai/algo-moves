import type { ReactNode } from 'react';
import { nodeText } from '@/design/typography';
import { TONE_CHIP, type UiTone } from '@/design/tone';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

export function Chip({
  children,
  tone = 'default',
  mono = false,
  className,
}: {
  children: ReactNode;
  tone?: UiTone;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-[calc(var(--node-px,0.75rem)*0.5)] py-[calc(var(--node-py,0.5625rem)*0.35)] font-medium leading-none',
        nodeText.xs,
        mono && 'font-mono tabular-nums',
        TONE_CHIP[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
