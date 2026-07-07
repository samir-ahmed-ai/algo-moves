import { useEffect, useRef, type CSSProperties } from 'react';
import type { Move } from '../../core';
import { cn } from '@/lib/utils/cn';

export interface MoveLogProps {
  readonly moves: readonly Move[];
  readonly index: number;
  readonly onSelect: (i: number) => void;
  /** Flow the transcript into N balanced columns to reduce height. */
  readonly columns?: number;
  /** Frame indices marked as breakpoints (auto-pause). */
  readonly breakpoints?: ReadonlySet<number>;
  readonly onToggleBreakpoint?: (i: number) => void;
}

export function MoveLog({
  moves,
  index,
  onSelect,
  columns = 1,
  breakpoints,
  onToggleBreakpoint,
}: MoveLogProps) {
  const columnCount =
    typeof columns === 'number' && Number.isFinite(columns) ? Math.max(1, Math.round(columns)) : 1;
  const cols = columnCount > 1;
  const curRef = useRef<HTMLButtonElement>(null);

  // Keep the active move visible while it auto-advances inside a scroll container.
  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const wrapStyle: CSSProperties | undefined = cols
    ? { display: 'block', columnCount, columnGap: '14px' }
    : undefined;
  const lineStyle: CSSProperties | undefined = cols ? { breakInside: 'avoid' } : undefined;

  return (
    <div className={cn('move-log', cols && 'move-log--columns')} role="list" style={wrapStyle}>
      {moves.map((m, i) => {
        const cur = i === index;
        const isBp = breakpoints?.has(i) ?? false;
        return (
          <div
            key={i}
            className={cn('log-line-wrap', cur && 'log-line-wrap--current')}
            role="listitem"
            style={lineStyle}
          >
            {onToggleBreakpoint && (
              <button
                type="button"
                aria-label={isBp ? 'Clear breakpoint' : 'Set breakpoint'}
                title={isBp ? 'Clear breakpoint' : 'Set breakpoint'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBreakpoint(i);
                }}
                className="bp-dot"
                style={{
                  background: isBp ? 'var(--bad)' : 'transparent',
                  borderColor: isBp ? 'var(--bad)' : 'var(--border-strong)',
                }}
              />
            )}
            <button
              ref={cur ? curRef : undefined}
              className={cn(
                'log-line nodrag',
                cur && 'cur',
                m.tone === 'bad' && 'bad',
                m.tone === 'good' && 'good',
                isBp && 'has-breakpoint',
              )}
              aria-current={cur ? 'step' : undefined}
              aria-label={`Move ${i + 1}: ${m.note}`}
              onClick={() => onSelect(i)}
            >
              <span className="ln">{i + 1}</span>
              <span className="nt">{m.note}</span>
              {m.team !== undefined ? (
                <span className={`chip team-chip-${m.team}`}>{m.team}</span>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
