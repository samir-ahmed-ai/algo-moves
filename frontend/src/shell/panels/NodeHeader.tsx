import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

import { nodeText, nodeTextWrap } from '@/shell/canvas';
/** Composable panel header primitives (Strudel node-header pattern). */

export function NodeHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        'legacy-node-header flex items-center gap-[var(--node-gap,0.5rem)] border-b border-edge/40 px-[var(--node-px,0.75rem)] py-[var(--node-py,0.5625rem)]',
        className,
      )}
    >
      {children}
    </header>
  );
}

export function NodeHeaderTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'legacy-node-header__title min-w-0 flex-1 font-semibold text-ink',
        nodeTextWrap,
        nodeText.title,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function NodeHeaderActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'legacy-node-header__actions nodrag ml-auto flex shrink-0 items-center gap-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function NodeHeaderAction({
  onClick,
  title,
  children,
}: {
  onClick?: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="legacy-node-header__action nodrag grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] place-items-center rounded-[calc(var(--radius)-2px)] text-ink3 transition-colors hover:bg-panel2/80 hover:text-ink"
    >
      {children}
    </button>
  );
}
