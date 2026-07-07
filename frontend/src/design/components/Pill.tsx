import type { ReactNode } from 'react';
import { nodeText, RADIUS_CTRL } from '@/design/typography';
import { normalizeUiTone, TONE_CHIP, type UiTone } from '@/design/tone';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** Small mono counter / index chip (used for counts and list indices). */
export function Pill({
  children,
  tone = 'muted',
  active = false,
  onClick,
  title,
}: {
  readonly children: ReactNode;
  readonly tone?: UiTone;
  readonly active?: boolean;
  readonly onClick?: () => void;
  readonly title?: string;
}) {
  const safeTone = normalizeUiTone(tone, 'muted');
  const cls = active ? 'bg-accentbg text-accent' : TONE_CHIP[safeTone];
  const base = cx(
    'design-pill inline-flex min-w-[1.4rem] items-center justify-center px-1.5 py-0.5 font-mono tabular-nums leading-none',
    nodeText.xs,
    RADIUS_CTRL,
    `design-pill--${safeTone}`,
    active && 'design-pill--active',
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cx('design-pill-button nodrag transition-colors', base, cls, 'hover:opacity-80')}
    >
      {children}
    </button>
  ) : (
    <span className={cx(base, cls)} title={title}>
      {children}
    </span>
  );
}
