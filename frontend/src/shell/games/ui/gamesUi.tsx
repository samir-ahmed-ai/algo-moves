import { useEffect, useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
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
  md: 'min-h-10 px-4 py-2 text-sm gap-2 rounded-xl sm:min-h-10',
  lg: 'min-h-12 px-5 py-3 text-base gap-2 rounded-xl sm:min-h-12',
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
        'inline-flex select-none items-center justify-center border font-bold tracking-tight transition-all',
        'touch-manipulation active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
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
        'flex select-none flex-col items-center justify-center gap-1 rounded-xl border-2 p-2.5 text-center min-h-[4.25rem]',
        'transition-all touch-manipulation active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        selected
          ? 'border-accent bg-accentbg text-accent shadow-[0_0_0_2px_var(--accent-bg),0_4px_14px_-4px_var(--accent)]'
          : 'border-edge bg-panel text-ink hover:border-accent/30 hover:bg-panel2',
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
        tone === 'you' && 'bg-accentbg text-accent ring-accent/25',
        tone === 'peer' && 'bg-panel2 text-ink2 ring-edge',
        tone === 'wait' && 'bg-panel2 text-ink3 ring-edge/60',
      )}
    >
      {children}
    </span>
  );
}

/** End-of-round outcome banner — includes a subtle confetti sparkle on win. */
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
        'relative overflow-hidden rounded-xl border p-3 text-center',
        tone === 'win' && 'border-good/50 bg-goodbg text-good shadow-[0_4px_20px_-6px_var(--good)]',
        tone === 'lose' && 'border-bad/50 bg-bad/10 text-bad',
        tone === 'draw' && 'border-edge bg-panel2 text-ink2',
      )}
    >
      {tone === 'win' && <ConfettiSparkle />}
      <div className="relative text-base font-extrabold tracking-tight">{title}</div>
      {detail ? <div className="relative mt-1 text-xs opacity-90">{detail}</div> : null}
    </div>
  );
}

/** Shown inside a game while the peer is momentarily gone. */
export function WaitingForPeer({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-ink3">
      <Loader2 className="h-5 w-5 animate-spin text-accent" />
      <p className="max-w-xs text-xs">{message}</p>
    </div>
  );
}

/** A vertical stack of game content, centered and width-capped for readability. */
export function GameBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto flex w-full max-w-md flex-col gap-3', className)}>{children}</div>;
}

/** Vibrant bordered play surface — shared arena chrome for in-game phases. */
export function GameArena({
  children,
  className,
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border-2 bg-gradient-to-b from-panel/90 to-panel/50 p-3',
        className,
      )}
      style={
        accent
          ? ({
              borderColor: `${accent}44`,
              boxShadow: `0 4px 24px -8px ${accent}33`,
            } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}

/** Small pill badge for couple / party category. */
export function CategoryBadge({ category }: { category: 'couple' | 'party' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
        category === 'couple' && 'bg-pink-500/10 text-pink-500',
        category === 'party' && 'bg-amber-500/10 text-amber-600',
      )}
    >
      {category === 'couple' ? '♥ For Two' : '🎉 Party'}
    </span>
  );
}

/** Round counter + dot progress — shared across simultaneous-pick games. */
export function RoundProgress({
  current,
  total,
  badge,
}: {
  current: number;
  total: number;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold tabular-nums text-ink2">
          {current} / {total}
        </span>
        {badge}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              i < current - 1 ? 'bg-accent' : i === current - 1 ? 'bg-accent/60' : 'bg-edge2',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Fading swipe-gesture hint that disappears after a few seconds. */
export function SwipeHint({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.style.transition = 'opacity 0.6s';
      el.style.opacity = '0';
    }, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      ref={ref}
      className="flex items-center justify-center gap-2 text-xs text-ink3 py-1"
    >
      <span className="animate-[swipeArrow_1s_ease-in-out_infinite]">👆</span>
      <span>{message}</span>
      <style>{`
        @keyframes swipeArrow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

/** CSS-only confetti sparkle overlay for win banners (no npm package). */
function ConfettiSparkle() {
  const particles = ['💕', '✨', '🎉', '⭐', '💫'];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className="absolute text-sm"
          style={{
            left: `${10 + i * 11}%`,
            top: '-10%',
            animation: `confettiFall ${0.8 + (i % 3) * 0.3}s ease-in ${(i * 0.07).toFixed(2)}s both`,
          }}
        >
          {particles[i % particles.length]}
        </span>
      ))}
      <style>{`
        @keyframes confettiFall {
          from { transform: translateY(0) rotate(0deg); opacity: 1; }
          to   { transform: translateY(80px) rotate(180deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
