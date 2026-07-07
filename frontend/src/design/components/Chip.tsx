import type { ReactNode } from 'react';
import { nodeText } from '@/design/typography';
import { normalizeUiTone, TONE_CHIP, type UiTone } from '@/design/tone';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

export function Chip({
  children,
  tone = 'default',
  mono = false,
  className,
}: {
  readonly children: ReactNode;
  readonly tone?: UiTone;
  readonly mono?: boolean;
  readonly className?: string;
}) {
  const safeTone = normalizeUiTone(tone);
  return (
    <span
      className={cx(
        'design-chip inline-flex items-center gap-1 rounded-full px-[calc(var(--node-px,0.75rem)*0.5)] py-[calc(var(--node-py,0.5625rem)*0.35)] font-medium leading-none',
        nodeText.xs,
        `design-chip--${safeTone}`,
        mono && 'design-chip--mono font-mono tabular-nums',
        TONE_CHIP[safeTone],
        className,
      )}
    >
      {children}
    </span>
  );
}
