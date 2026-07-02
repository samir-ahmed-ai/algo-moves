import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Inner-SVG mnemonic glyph, drawn the same way the topic board / landing draw it. */
export function Glyph({ markup, className }: { markup: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

type TouchVariant = 'primary' | 'ghost' | 'good' | 'bad' | 'accentSoft';
type TouchSize = 'md' | 'lg';

const TOUCH_VARIANTS: Record<TouchVariant, string> = {
  primary: 'bg-accent text-white border-transparent hover:opacity-90 active:opacity-80',
  good: 'bg-good text-white border-transparent hover:opacity-90 active:opacity-80',
  bad: 'bg-bad text-white border-transparent hover:opacity-90 active:opacity-80',
  accentSoft: 'bg-accentbg text-accent border-accent/40 hover:border-accent',
  ghost: 'bg-panel text-ink border-edge hover:bg-panel2 hover:border-edge2',
};

const TOUCH_SIZES: Record<TouchSize, string> = {
  md: 'min-h-11 px-4 py-2.5 text-sm gap-2 rounded-[var(--radius)]',
  lg: 'min-h-14 px-6 py-3.5 text-base gap-2.5 rounded-[calc(var(--radius)+2px)]',
};

/** A large, finger-friendly button. Defaults are sized for phones and iPads. */
export function TouchButton({
  variant = 'ghost',
  size = 'md',
  icon,
  busy,
  children,
  className,
  disabled,
  ...rest
}: {
  variant?: TouchVariant;
  size?: TouchSize;
  icon?: ReactNode;
  busy?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={cn(
        'inline-flex select-none items-center justify-center border font-semibold tracking-tight transition-all',
        'touch-manipulation active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        TOUCH_SIZES[size],
        TOUCH_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** A big selectable tile — the workhorse for choice-based games (RPS, Mind Meld). */
export function ChoiceCard({
  selected,
  disabled,
  onClick,
  accent,
  className,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  accent?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
      className={cn(
        'flex select-none flex-col items-center justify-center gap-2 rounded-[var(--radius)] border-2 p-4 text-center',
        'transition-all touch-manipulation active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        selected
          ? 'border-accent bg-accentbg text-accent shadow-[0_0_0_3px_var(--accent-bg)]'
          : 'border-edge bg-panel text-ink hover:border-edge2 hover:bg-panel2',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Whose turn / together banner. */
export function TurnBadge({ tone = 'wait', children }: { tone?: 'you' | 'peer' | 'wait'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        tone === 'you' && 'bg-accentbg text-accent',
        tone === 'peer' && 'bg-panel2 text-ink2',
        tone === 'wait' && 'bg-panel2 text-ink3',
      )}
    >
      {children}
    </span>
  );
}

/** End-of-round outcome banner. */
export function ResultBanner({
  tone,
  title,
  detail,
}: {
  tone: 'win' | 'lose' | 'draw';
  title: string;
  detail?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border p-4 text-center',
        tone === 'win' && 'border-good/50 bg-good/10 text-good',
        tone === 'lose' && 'border-bad/50 bg-bad/10 text-bad',
        tone === 'draw' && 'border-edge bg-panel2 text-ink2',
      )}
    >
      <div className="text-lg font-bold tracking-tight">{title}</div>
      {detail ? <div className="mt-1 text-sm opacity-90">{detail}</div> : null}
    </div>
  );
}

/** Shown inside a game while the peer is momentarily gone. */
export function WaitingForPeer({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center text-ink3">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/** A vertical stack of game content, centered and width-capped for readability. */
export function GameBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto flex w-full max-w-md flex-col gap-5', className)}>{children}</div>;
}
