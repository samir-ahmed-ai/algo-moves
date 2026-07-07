import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { blockKind, BLOCK_META, type CodePiece } from '@/lib/code';

/* --------------------------------- HUD ------------------------------------ */
/* Family frame band 1: LEFT progress · CENTER chase stat · RIGHT lives/best. */

export function GameHud({
  left,
  center,
  right,
}: {
  left: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex min-h-[44px] shrink-0 items-center gap-2 px-1">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{left}</div>
      {center && <div className="flex shrink-0 items-center gap-1.5">{center}</div>}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-ink2">{right}</div>
    </div>
  );
}

export function HudChip({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'accent' | 'good' | 'bad';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        tone === 'muted' && 'bg-panel2 text-ink2',
        tone === 'accent' && 'bg-accentbg text-accent',
        tone === 'good' && 'bg-goodbg text-good',
        tone === 'bad' && 'bg-badbg text-bad',
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ timer ring -------------------------------- */
/* The one clock idiom: depleting stroke ring, blending to --bad under 25%. */

export function GameTimerRing({
  remaining,
  total,
  size = 28,
  paused,
}: {
  remaining: number;
  total: number;
  size?: number;
  paused?: boolean;
}) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remaining / total));
  const low = frac < 0.25;
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={low ? 'var(--bad)' : 'var(--accent)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 90ms linear, stroke 300ms' }}
          opacity={paused ? 0.4 : 1}
        />
      </svg>
      {remaining <= 2 && remaining > 0 && (
        <span className={cn('text-[10px] font-bold tabular-nums', low ? 'text-bad' : 'text-ink')}>
          {Math.ceil(remaining)}
        </span>
      )}
    </span>
  );
}

/* ----------------------------- block identity ----------------------------- */

/** A code piece as its canonical jigsaw block — kind shape, team color, glyph
 *  badge, role caption. `flash` drives the ≤300ms good/bad grammar. */
export function GameBlock({
  piece,
  flash,
  muted,
  compact,
  trailing,
  className,
}: {
  piece: CodePiece;
  flash?: 'good' | 'bad' | null;
  muted?: boolean;
  compact?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  const meta = BLOCK_META[blockKind(piece)];
  const Icon = meta.icon;
  return (
    <div
      className={cn('blk', meta.shape, muted && 'asm-block-muted', className)}
      style={
        {
          '--blk-stroke':
            flash === 'bad' ? 'var(--bad)' : flash === 'good' ? 'var(--good)' : meta.stroke,
        } as CSSProperties
      }
    >
      <div
        className={cn(
          'blk-face',
          flash === 'good' && 'asm-flash-good',
          flash === 'bad' && 'asm-flash-bad',
        )}
      >
        <div className={cn('flex items-center gap-1.5', compact ? 'mb-0.5' : 'mb-1')}>
          <Icon className="h-3 w-3 shrink-0" style={{ color: meta.text }} />
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: meta.text }}
          >
            {piece.role}
          </span>
          <span className="flex-1" />
          {trailing}
        </div>
        <div className="ws-scroll overflow-x-auto" data-noswipe>
          <pre
            className={cn(
              'whitespace-pre font-mono leading-relaxed text-ink',
              compact ? 'text-[11px]' : 'text-[12px]',
            )}
          >
            {piece.code}
          </pre>
        </div>
      </div>
    </div>
  );
}

/** Dashed slot outline foreshadowing the next piece: its shape + ghost glyph. */
export function GhostSlot({ piece, lines }: { piece: CodePiece; lines: number }) {
  const meta = BLOCK_META[blockKind(piece)];
  return (
    <div
      className="grid place-items-center rounded-md border-2 border-dashed border-accent/60 bg-accentbg/20"
      style={{ minHeight: Math.max(44, 20 + lines * 18) }}
      aria-label={`Next: ${piece.role}`}
    >
      <span
        className="font-mono text-[26px] leading-none opacity-20"
        style={{ color: meta.text }}
        aria-hidden
      >
        {meta.glyph}
      </span>
    </div>
  );
}

/* ------------------------------- confetti --------------------------------- */

export function ConfettiBurst({ count = 14 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${8 + (i * 84) / count + (i % 3) * 3}%`,
        delay: `${(i % 5) * 40}ms`,
        hue: ['var(--good)', 'var(--accent)', 'var(--edge-active)'][i % 3],
        dur: `${700 + (i % 4) * 160}ms`,
      })),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="asm-confetti"
          style={{
            left: b.left,
            background: b.hue,
            animationDelay: b.delay,
            animationDuration: b.dur,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------- win ritual -------------------------------- */

export interface WinStat {
  label: string;
  value: string;
}

export interface WinBadge {
  icon: LucideIcon;
  label: string;
  earned: boolean;
}

/** Family win results card: stat rows, badge stamps, "Play again — beat X" CTA. */
export function WinCard({
  title,
  stats,
  badges,
  newBest,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  stats: WinStat[];
  badges?: WinBadge[];
  newBest?: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  useEffect(() => {
    navigator.vibrate?.([30, 40, 30]);
  }, []);
  return (
    <div
      className="asm-sheet-in relative mx-auto w-full max-w-[360px] rounded-[var(--radius)] border border-edge bg-panel2 p-4 shadow-[var(--shadow-lg)]"
      data-noswipe
    >
      <ConfettiBurst count={newBest ? 26 : 14} />
      <div className="text-center text-[15px] font-semibold tracking-tight text-ink">{title}</div>
      {newBest && (
        <div className="mt-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          New personal best
        </div>
      )}
      <div className="mt-3 flex flex-col gap-1.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-baseline justify-between rounded-lg bg-panel px-3 py-1.5"
          >
            <span className="text-[12px] text-ink3">{s.label}</span>
            <span className="text-[15px] font-semibold tabular-nums text-ink">{s.value}</span>
          </div>
        ))}
      </div>
      {badges && badges.some((b) => b.earned) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {badges
            .filter((b) => b.earned)
            .map((b, i) => {
              const Icon = b.icon;
              return (
                <span
                  key={b.label}
                  className="asm-stamp inline-flex items-center gap-1 rounded-full bg-goodbg px-2.5 py-1 text-[11px] font-semibold text-good"
                  style={{ animationDelay: `${200 + i * 120}ms` }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {b.label}
                </span>
              );
            })}
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onPrimary}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-accent px-5 text-[14px] font-semibold text-white"
        >
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accentbg px-5 text-[13px] font-semibold text-accent"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------------------- code magnifier sheet -------------------------- */

export function MagnifierSheet({ piece, onClose }: { piece: CodePiece; onClose: () => void }) {
  const meta = BLOCK_META[blockKind(piece)];
  const sheetRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    return () => prev?.focus?.();
  }, []);
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-4"
      onPointerDown={onClose}
      data-noswipe
    >
      <div className="absolute inset-0 bg-bg/70" aria-hidden />
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="asm-sheet-in relative max-h-[70%] w-full max-w-[420px] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel2 shadow-[var(--shadow-lg)] outline-none"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${piece.role} — full code`}
      >
        <div className="flex items-center gap-1.5 border-b border-edge px-3 py-2">
          <span className="font-mono text-[15px]" style={{ color: meta.text }} aria-hidden>
            {meta.glyph}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink3">
            {piece.role}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex min-h-[44px] items-center rounded-full px-3 text-[11px] font-medium text-ink3 hover:bg-panel hover:text-ink"
          >
            Close
          </button>
        </div>
        <div className="ws-scroll max-h-[52vh] overflow-auto p-3" data-noswipe>
          <pre
            className="whitespace-pre font-mono text-[13px] leading-relaxed text-ink"
            style={{ fontSize: '1.05em' }}
          >
            {piece.code}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- reduced-motion preference ----------------------- */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}
