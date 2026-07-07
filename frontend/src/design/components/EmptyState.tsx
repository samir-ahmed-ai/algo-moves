import type { ReactNode } from 'react';
import { nodeText } from '@/design/typography';

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** Designed empty / placeholder state — shared across shell and canvas panels. */
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="design-empty-state flex flex-col items-center gap-1.5 px-3 py-5 text-center">
      {icon && (
        <span className="design-empty-state__icon grid size-[calc(var(--node-icon,1.125rem)*1.6)] place-items-center rounded-full bg-panel2 text-ink3 [&>*]:size-[var(--node-icon-glyph)]">
          {icon}
        </span>
      )}
      <p className={cx(nodeText.sm, 'design-empty-state__title font-medium text-ink2')}>{title}</p>
      {hint && (
        <p
          className={cx(
            'design-empty-state__hint max-w-[34ch] leading-snug text-ink3',
            nodeText.sm,
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
