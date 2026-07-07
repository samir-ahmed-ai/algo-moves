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
    <div className="flex items-center justify-between gap-3 py-[3px]">
      <span className={cn(nodeText.sm, 'text-ink3')}>{k}</span>
      <span
        className={cn(
          'rounded px-1 transition-colors duration-500',
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
  return (
    <div
      className="grid gap-x-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function StreakPips({ value, max = 3 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full transition-colors"
          style={{ background: i < value ? 'var(--good)' : 'var(--border-strong)' }}
        />
      ))}
    </span>
  );
}
