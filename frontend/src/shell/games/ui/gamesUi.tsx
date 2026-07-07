import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useArcadeStrings } from '../locale';

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
  primary:
    'border-transparent bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.2)] hover:-translate-y-0.5 hover:bg-slate-800 active:bg-slate-950 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-50',
  good: 'border-transparent bg-emerald-600 text-white shadow-[0_14px_34px_rgba(5,150,105,0.22)] hover:-translate-y-0.5 hover:bg-emerald-500 active:bg-emerald-700',
  bad: 'border-transparent bg-red-600 text-white shadow-[0_14px_34px_rgba(220,38,38,0.22)] hover:-translate-y-0.5 hover:bg-red-500 active:bg-red-700',
  accentSoft:
    'border-cyan-300/40 bg-cyan-50/85 text-cyan-800 shadow-sm hover:-translate-y-0.5 hover:border-cyan-400 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100',
  ghost:
    'border-white/60 bg-white/70 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white',
};

const TOUCH_SIZES: Record<TouchSize, string> = {
  md: 'min-h-10 px-4 py-2 text-sm gap-2 rounded-2xl sm:min-h-10',
  lg: 'min-h-12 px-5 py-3 text-base gap-2 rounded-2xl sm:min-h-12',
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
        'inline-flex select-none items-center justify-center border font-black tracking-tight transition-all',
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
        'flex min-h-[4.25rem] select-none flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-center shadow-sm backdrop-blur',
        'transition-all touch-manipulation active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        selected
          ? 'border-cyan-300/50 bg-cyan-50/85 text-cyan-800 shadow-[0_0_0_2px_rgba(34,211,238,0.14),0_16px_34px_rgba(8,145,178,0.16)] dark:bg-cyan-300/10 dark:text-cyan-100'
          : 'border-white/60 bg-white/72 text-slate-800 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Whose turn / together banner. */
export function TurnBadge({
  tone = 'wait',
  children,
}: {
  tone?: 'you' | 'peer' | 'wait';
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[length:var(--fs-2xs)] font-black uppercase tracking-wide ring-1 ring-inset',
        tone === 'you' &&
          'bg-cyan-50/85 text-cyan-800 ring-cyan-300/35 dark:bg-cyan-300/10 dark:text-cyan-100 dark:ring-cyan-300/20',
        tone === 'peer' &&
          'bg-white/70 text-slate-700 ring-white/60 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
        tone === 'wait' &&
          'bg-slate-950/5 text-slate-500 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10',
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
        'relative overflow-hidden rounded-2xl border p-3 text-center shadow-sm backdrop-blur',
        tone === 'win' &&
          'border-emerald-300/45 bg-emerald-100/80 text-emerald-800 shadow-[0_14px_38px_rgba(5,150,105,0.14)] dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100',
        tone === 'lose' &&
          'border-red-300/45 bg-red-50/85 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200',
        tone === 'draw' &&
          'border-white/60 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
      )}
    >
      {tone === 'win' && <ConfettiSparkle />}
      <div className="relative text-base font-black tracking-tight">{title}</div>
      {detail ? <div className="relative mt-1 text-xs font-medium opacity-90">{detail}</div> : null}
    </div>
  );
}

/** Shown inside a game while the peer is momentarily gone. */
export function WaitingForPeer({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/65 py-6 text-center text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-cyan-600 dark:text-cyan-200" />
      <p className="max-w-xs text-xs font-semibold">{message}</p>
    </div>
  );
}

/** A vertical stack of game content, centered and width-capped for readability. */
export function GameBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-md flex-col gap-3', className)}>{children}</div>
  );
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
        'flex flex-col gap-2.5 rounded-[1.5rem] border bg-gradient-to-b from-white/88 to-white/58 p-3 shadow-[0_18px_58px_rgba(15,23,42,0.1)] backdrop-blur dark:from-slate-950/76 dark:to-slate-900/56',
        className,
      )}
      style={
        accent
          ? ({
              borderColor: `${accent}44`,
              boxShadow: `0 18px 58px -22px ${accent}`,
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
  const t = useArcadeStrings();
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[length:var(--fs-2xs)] font-black',
        category === 'couple' &&
          'border-pink-300/35 bg-pink-50/85 text-pink-700 dark:border-pink-300/20 dark:bg-pink-300/10 dark:text-pink-100',
        category === 'party' &&
          'border-amber-300/35 bg-amber-50/85 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100',
      )}
    >
      {category === 'couple' ? t.picker.categoryCouple : t.picker.categoryParty}
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
    <div className="game-round-progress flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <span className="game-round-progress__count rounded-full bg-slate-950/5 px-2 py-1 font-mono text-xs font-black tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {current} / {total}
        </span>
        {badge}
      </div>
      <div className="game-round-progress__dots flex flex-wrap justify-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 w-4 rounded-full transition-colors',
              i < current - 1
                ? 'bg-cyan-600 dark:bg-cyan-300'
                : i === current - 1
                  ? 'bg-cyan-400/70'
                  : 'bg-slate-300 dark:bg-white/15',
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
      className="game-swipe-hint flex items-center justify-center gap-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400"
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
