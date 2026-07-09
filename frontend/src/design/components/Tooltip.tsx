import type { ReactNode } from 'react';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * Themed, dependency-free tooltip to replace native `title=`: tokenized surface,
 * arrow, and a short reveal delay, shown on hover AND keyboard focus (via
 * `:focus-within`; see `.design-tooltip` in theme.css). Keep an `aria-label` on
 * the wrapped control for the accessible name — this is the visible affordance.
 * Reveal is instant under prefers-reduced-motion.
 */
export function Tooltip({
  label,
  children,
  side = 'top',
  className,
}: {
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly side?: TooltipSide;
  readonly className?: string;
}) {
  if (label == null || label === '') return <>{children}</>;
  return (
    <span className={cx('design-tooltip', className)}>
      {children}
      <span
        role="tooltip"
        className={cx('design-tooltip__bubble', `design-tooltip__bubble--${side}`)}
      >
        {label}
      </span>
    </span>
  );
}
