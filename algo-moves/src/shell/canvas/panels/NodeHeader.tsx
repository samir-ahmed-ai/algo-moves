import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

/** Composable panel header primitives (Strudel node-header pattern). */

export function NodeHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <header className={cn('flex items-center gap-1 border-b border-edge px-2 py-1.5', className)}>{children}</header>;
}

export function NodeHeaderTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('min-w-0 flex-1 truncate font-medium text-ink', className)}>{children}</span>;
}

export function NodeHeaderIcon({ children }: { children: ReactNode }) {
  return <span className="grid shrink-0 place-items-center">{children}</span>;
}

export function NodeHeaderActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('nodrag ml-auto flex shrink-0 items-center gap-1', className)}>{children}</div>;
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
      className="nodrag grid h-5 w-5 place-items-center rounded text-ink3 hover:bg-panel2 hover:text-ink"
    >
      {children}
    </button>
  );
}
