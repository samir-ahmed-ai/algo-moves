import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';

/** Joined toolbar buttons — single border, shared height. */
export function ToolbarGroup({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={cn('inline-flex shrink-0 overflow-hidden rounded-md border border-edge bg-panel2/40', className)}
      title={title}
      aria-label={title}
    >
      {children}
    </div>
  );
}

export function ToolbarGroupBtn({
  active,
  className,
  children,
  ...rest
}: { active?: boolean; children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'nodrag inline-flex h-6 min-w-6 items-center justify-center gap-1 border-r border-edge px-1.5 transition-colors last:border-r-0',
        chromeText.xs,
        active ? 'bg-accentbg text-accent' : 'text-ink2 hover:bg-panel2 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
