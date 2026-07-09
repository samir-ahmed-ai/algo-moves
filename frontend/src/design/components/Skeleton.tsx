import type { CSSProperties } from 'react';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * Tokenized loading placeholder with a theme-aware shimmer sweep (see
 * `.design-skeleton` in theme.css; the sweep is disabled under
 * prefers-reduced-motion). Mirror the real content's shape with width/height
 * utilities so content swaps in without layout shift.
 */
export function Skeleton({
  className,
  style,
}: {
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  return <span aria-hidden className={cx('design-skeleton block', className)} style={style} />;
}

/** A stack of text-line skeletons; the last line is shortened like real prose. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  readonly lines?: number;
  readonly className?: string;
}) {
  return (
    <span className={cx('design-skeleton-text flex flex-col gap-1.5', className)}>
      {Array.from({ length: Math.max(1, lines) }, (_, i) => (
        <Skeleton
          key={i}
          className="h-[0.7em]"
          {...(i === lines - 1 ? { style: { width: '60%' } } : {})}
        />
      ))}
    </span>
  );
}
