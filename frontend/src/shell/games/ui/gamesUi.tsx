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
  md: 'min-h-11 px-4 py-2.5 text-sm gap-2 rounded-2xl sm:min-h-11',
  lg: 'min-h-14 px-6 py-3.5 text-base gap-2.5 rounded-2xl sm:min-h-14',
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
        'flex select-none flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center min-h-[110px]',
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
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
        tone === 'you' && 'bg-accentbg text-accent',
        tone === 'peer' && 'bg-panel2 text-ink2',
        tone === 'wait' && 'bg-panel2 text-ink3',
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
        'relative overflow-hidden rounded-2xl border p-5 text-center',
        tone === 'win' && 'border-good/50 bg-goodbg text-good',
        tone === 'lose' && 'border-bad/50 bg-bad/10 text-bad',
        tone === 'draw' && 'border-edge bg-panel2 text-ink2',
      )}
    >
      {tone === 'win' && <ConfettiSparkle />}
      <div className="relative text-xl font-extrabold tracking-tight">{title}</div>
      {detail ? <div className="relative mt-1.5 text-sm opacity-90">{detail}</div> : null}
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
