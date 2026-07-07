import { useEffect, useRef, type CSSProperties } from 'react';
import type { Move } from '../../core';

export interface MoveLogProps {
  moves: Move[];
  index: number;
  onSelect: (i: number) => void;
  /** Flow the transcript into N balanced columns to reduce height. */
  columns?: number;
  /** Frame indices marked as breakpoints (auto-pause). */
  breakpoints?: Set<number>;
  onToggleBreakpoint?: (i: number) => void;
}

export function MoveLog({
  moves,
  index,
  onSelect,
  columns = 1,
  breakpoints,
  onToggleBreakpoint,
}: MoveLogProps) {
  const cols = columns > 1;
  const curRef = useRef<HTMLButtonElement>(null);

  // Keep the active move visible while it auto-advances inside a scroll container.
  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const wrapStyle: CSSProperties | undefined = cols
    ? { display: 'block', columnCount: columns, columnGap: '14px' }
    : undefined;
  const lineStyle: CSSProperties | undefined = cols
    ? { breakInside: 'avoid', display: 'flex' }
    : undefined;

  return (
    <div className="move-log" role="list" style={wrapStyle}>
      {moves.map((m, i) => {
        const cur = i === index;
        const cls = [
          'log-line nodrag',
          cur ? 'cur' : '',
          m.tone === 'bad' ? 'bad' : '',
          m.tone === 'good' ? 'good' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const isBp = breakpoints?.has(i) ?? false;
        return (
          <button
            key={i}
            ref={cur ? curRef : undefined}
            className={cls}
            role="listitem"
            style={lineStyle}
            onClick={() => onSelect(i)}
          >
            {onToggleBreakpoint && (
              <span
                role="button"
                aria-label={isBp ? 'clear breakpoint' : 'set breakpoint'}
                title={isBp ? 'clear breakpoint' : 'set breakpoint'}
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
            <span className="ln">{i + 1}</span>
            <span className="nt">{m.note}</span>
            {m.team ? <span className={`chip team-chip-${m.team}`}>{m.team}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
