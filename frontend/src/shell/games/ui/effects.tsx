import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { usePrefersReducedMotion } from './hooks';

/**
 * A one-shot confetti burst rendered as an absolutely-positioned overlay.
 * Uses the Web Animations API (so it needs no CSS keyframes) and is a no-op
 * when the user prefers reduced motion.
 */
const CONFETTI_COLORS = ['#0891b2', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export function Confetti({ fire, count = 28 }: { fire: boolean; count?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!fire || reduced) return;
    const host = ref.current;
    if (!host) return;
    const pieces: HTMLSpanElement[] = [];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 90 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;
      s.style.cssText = `position:absolute;left:50%;top:45%;width:8px;height:10px;border-radius:999px;background:${
        CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      };box-shadow:0 8px 18px rgba(15,23,42,0.18);will-change:transform,opacity;`;
      host.appendChild(s);
      pieces.push(s);
      s.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 160}px)) rotate(${
              Math.random() * 720 - 360
            }deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 900 + Math.random() * 500,
          easing: 'cubic-bezier(0.2,0.6,0.2,1)',
          fill: 'forwards',
        },
      );
    }
    const timer = setTimeout(() => pieces.forEach((p) => p.remove()), 1600);
    return () => {
      clearTimeout(timer);
      pieces.forEach((p) => p.remove());
    };
  }, [fire, reduced, count]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
      aria-hidden
    />
  );
}

/**
 * Circular countdown / turn-timer ring. `progress` is the fraction remaining
 * (1 → full, 0 → empty). The parent drives it each tick.
 */
export function CountdownRing({
  progress,
  size = 44,
  stroke = 4,
  tone = 'accent',
  label,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  tone?: 'accent' | 'good' | 'bad';
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const color = tone === 'good' ? 'var(--good)' : tone === 'bad' ? 'var(--bad)' : 'var(--accent)';
  return (
    <span
      className="relative inline-grid place-items-center rounded-full bg-white/70 shadow-sm ring-1 ring-white/60 dark:bg-white/10 dark:ring-white/10"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.28)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      {label ? (
        <span className="absolute text-xs font-black tabular-nums text-slate-950 dark:text-white">
          {label}
        </span>
      ) : null}
    </span>
  );
}

/** A small dot conveying live connection quality. */
export function ConnectionDot({
  status,
  className,
}: {
  status: 'open' | 'connecting' | 'closed' | 'error';
  className?: string;
}) {
  const tone =
    status === 'open'
      ? 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.7)]'
      : status === 'connecting'
        ? 'animate-pulse bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
        : 'bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.55)]';
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white/70 dark:ring-slate-950/80',
        tone,
        className,
      )}
      aria-hidden
    />
  );
}
