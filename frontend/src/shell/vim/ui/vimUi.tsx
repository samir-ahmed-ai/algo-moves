import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type VimBadgeTone = 'default' | 'accent' | 'good' | 'muted' | 'bad';

const BADGE_TONE: Record<VimBadgeTone, string> = {
  default: 'border-edge bg-panel2 text-ink2',
  accent: 'border-accent/30 bg-accentbg text-accent',
  good: 'border-good/30 bg-[color-mix(in_srgb,var(--good)_12%,transparent)] text-good',
  muted: 'border-edge/60 bg-panel2/80 text-ink3',
  bad: 'border-bad/30 bg-bad-bg text-bad',
};

export function VimKbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('vim-kbd', className)}>{children}</kbd>;
}

export function VimBadge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: VimBadgeTone;
  className?: string;
}) {
  return <span className={cn('vim-badge', BADGE_TONE[tone], className)}>{children}</span>;
}

export function VimCallout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('vim-callout', className)}>{children}</div>;
}

export function VimProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('vim-progress-bar', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="vim-progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function VimBtn({
  children,
  className,
  variant = 'default',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'accent' | 'ghost' }) {
  return (
    <button
      type="button"
      className={cn(
        'vim-btn',
        variant === 'accent' && 'vim-btn--accent',
        variant === 'ghost' && 'vim-btn--ghost',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
