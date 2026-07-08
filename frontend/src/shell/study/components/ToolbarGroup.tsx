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
      className={cn(
        'toolbar-group inline-flex shrink-0 overflow-hidden rounded-md border border-edge bg-panel2/40 shadow-sm',
        className,
      )}
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
      // Expose toggle state to assistive tech (blind/vim/diff toggles are on/off buttons).
      {...(typeof active === 'boolean' ? { 'aria-pressed': active } : {})}
      className={cn(
        'toolbar-group-btn nodrag inline-flex h-6 min-w-6 items-center justify-center gap-1 border-r border-edge px-1.5 transition-colors last:border-r-0',
        chromeText.xs,
        active
          ? 'toolbar-group-btn--active bg-accentbg text-accent'
          : 'toolbar-group-btn--idle text-ink2 hover:bg-panel2 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
