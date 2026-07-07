import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { nodeText } from '@/design/typography';
import { TONE_TEXT, type UiTone } from '@/design/tone';

export function useFlash(dep: unknown) {
  const [flash, setFlash] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 600);
    return () => window.clearTimeout(t);
  }, [dep]);
  return flash;
}

export function Stat({
  k,
  v,
  tone = 'default',
  mono = true,
}: {
  k: ReactNode;
  v: ReactNode;
  tone?: UiTone;
  mono?: boolean;
}) {
  const flash = useFlash(typeof v === 'string' || typeof v === 'number' ? v : undefined);
  return (
    <div className="node-stat flex items-center justify-between gap-3 py-[3px]">
      <span className={cn(nodeText.sm, 'node-stat__key text-ink3')}>{k}</span>
      <span
        className={cn(
          'node-stat__value rounded px-1 transition-colors duration-500',
          nodeText.sm,
          mono && 'font-mono tabular-nums',
          TONE_TEXT[tone],
          flash ? 'bg-accentbg' : 'bg-transparent',
        )}
      >
        {v}
      </span>
    </div>
  );
}

export function StatGrid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  const safeCols = Number.isFinite(cols) ? Math.max(1, Math.round(cols)) : 2;
  return (
    <div
      className="node-stat-grid grid gap-x-4"
      style={{ gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function StreakPips({ value, max = 3 }: { value: number; max?: number }) {
  const safeMax = Number.isFinite(max) ? Math.max(0, Math.round(max)) : 3;
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(0, Math.round(value)), safeMax) : 0;
  return (
    <span
      className="node-streak-pips inline-flex items-center gap-1"
      aria-label={`${safeValue} of ${safeMax} streak`}
    >
      {Array.from({ length: safeMax }, (_, i) => (
        <span
          key={i}
          className="node-streak-pips__pip h-1.5 w-1.5 rounded-full transition-colors"
          data-active={i < safeValue ? 'true' : undefined}
          style={{ background: i < safeValue ? 'var(--good)' : 'var(--border-strong)' }}
        />
      ))}
    </span>
  );
}
