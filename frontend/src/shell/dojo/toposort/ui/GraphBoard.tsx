import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTopoGame } from '../TopoGameProvider';

interface ChipRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Pt {
  x: number;
  y: number;
}

function edgeGeometry(s: ChipRect, t: ChipRect): { d: string; arrow: string } {
  const sameRow = Math.abs(t.y - s.y) < Math.max(s.h, t.h) * 0.6;
  let p1: Pt;
  let p2: Pt;
  let c: Pt;
  if (sameRow && t.x > s.x) {
    p1 = { x: s.x + s.w / 2 + 2, y: s.y };
    p2 = { x: t.x - t.w / 2 - 5, y: t.y };
    c = { x: (p1.x + p2.x) / 2, y: p1.y - 8 };
  } else if (sameRow) {
    p1 = { x: s.x, y: s.y + s.h / 2 + 2 };
    p2 = { x: t.x, y: t.y + t.h / 2 + 6 };
    c = { x: (p1.x + p2.x) / 2, y: p1.y + 30 };
  } else if (t.y > s.y) {
    p1 = { x: s.x, y: s.y + s.h / 2 + 1 };
    p2 = { x: t.x, y: t.y - t.h / 2 - 5 };
    c = { x: (p1.x + p2.x) / 2 + (p2.x - p1.x) * 0.18, y: (p1.y + p2.y) / 2 };
  } else {
    p1 = { x: s.x, y: s.y - s.h / 2 - 1 };
    p2 = { x: t.x, y: t.y + t.h / 2 + 5 };
    c = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }
  const angle = Math.atan2(p2.y - c.y, p2.x - c.x);
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const px = -ay;
  const py = ax;
  const tip: Pt = { x: p2.x + ax * 4, y: p2.y + ay * 4 };
  const base: Pt = { x: p2.x - ax * 3, y: p2.y - ay * 3 };
  const arrow = `${tip.x},${tip.y} ${base.x + px * 3.5},${base.y + py * 3.5} ${base.x - px * 3.5},${base.y - py * 3.5}`;
  return { d: `M ${p1.x} ${p1.y} Q ${c.x} ${c.y} ${p2.x} ${p2.y}`, arrow };
}

export function GraphBoard() {
  const { level, layers, lockedSet, readySet, indegs, shake, complete, handleKey } = useTopoGame();

  const boardRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef(new Map<number, HTMLButtonElement>());
  const [rects, setRects] = useState<ChipRect[] | null>(null);

  const rows = useMemo(() => {
    const byLayer = new Map<number, number[]>();
    level.nodes.forEach((_, i) => {
      const layer = layers[i] ?? 0;
      const row = byLayer.get(layer) ?? [];
      row.push(i);
      byLayer.set(layer, row);
    });
    return [...byLayer.entries()].sort((a, b) => a[0] - b[0]).map(([, idxs]) => idxs);
  }, [level, layers]);

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const base = board.getBoundingClientRect();
    const next: ChipRect[] = [];
    for (let i = 0; i < level.nodes.length; i += 1) {
      const el = chipRefs.current.get(i);
      if (!el) {
        setRects(null);
        return;
      }
      const r = el.getBoundingClientRect();
      next.push({
        x: r.left - base.left + r.width / 2,
        y: r.top - base.top + r.height / 2,
        w: r.width,
        h: r.height,
      });
    }
    setRects(next);
  }, [level]);

  useLayoutEffect(() => {
    measure();
    const board = boardRef.current;
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
    if (board && observer) observer.observe(board);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const measured = rects != null && rects.length === level.nodes.length;

  return (
    <div ref={boardRef} className={cn('relative m-auto w-fit', level.cyclic && 'pb-8')}>
      {measured ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          {level.edges.map(([from, to], ei) => {
            const s = rects[from];
            const t = rects[to];
            if (!s || !t) return null;
            const faded = lockedSet.has(from);
            const flashing = !faded && shake != null && shake.idx === to;
            const color = flashing ? 'var(--bad)' : 'var(--ink3)';
            const { d, arrow } = edgeGeometry(s, t);
            return (
              <g
                key={ei}
                className="transition-opacity duration-500"
                style={{ opacity: faded ? 0.12 : flashing ? 1 : 0.55 }}
              >
                <path d={d} fill="none" stroke={color} strokeWidth={flashing ? 2 : 1.5} />
                <polygon points={arrow} fill={color} />
              </g>
            );
          })}
        </svg>
      ) : null}
      <div className="relative flex flex-col gap-9 min-[480px]:gap-12">
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center justify-center gap-3 min-[480px]:gap-8">
            {row.map((i) => {
              const node = level.nodes[i];
              const isLocked = lockedSet.has(i);
              const isReady = !isLocked && readySet.has(i);
              return (
                <button
                  key={i}
                  ref={(el) => {
                    if (el) chipRefs.current.set(i, el);
                    else chipRefs.current.delete(i);
                  }}
                  type="button"
                  disabled={complete}
                  onClick={() => handleKey(node.key)}
                  aria-label={
                    isLocked
                      ? `${node.label} — locked into the melody`
                      : isReady
                        ? `${node.label} — ready, press ${node.key}`
                        : `${node.label} — waiting on ${indegs[i]} prerequisite(s)`
                  }
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-[var(--radius)] border bg-panel px-2 py-1.5 text-left shadow-sm transition-colors min-[480px]:gap-2 min-[480px]:px-3 min-[480px]:py-2',
                    isLocked && 'border-edge opacity-40',
                    isReady && 'border-good',
                    !isLocked && !isReady && 'border-edge',
                    shake?.idx === i && 'vim-maze-cursor--shake',
                  )}
                  style={
                    isReady
                      ? {
                          boxShadow:
                            '0 0 0 1px var(--good), 0 0 16px color-mix(in srgb, var(--good) 45%, transparent)',
                        }
                      : undefined
                  }
                >
                  <kbd className="vim-kbd min-w-[1.375rem] justify-center">{node.key}</kbd>
                  <span className="max-w-[3.75rem] truncate text-xs font-medium text-ink min-[480px]:max-w-[6rem] min-[480px]:text-sm">
                    {node.label}
                  </span>
                  <span
                    className={cn(
                      'absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full border text-[length:var(--fs-2xs)] font-semibold tabular-nums leading-none',
                      isLocked && 'border-edge bg-panel2 text-ink3',
                      isReady && 'border-good bg-good text-white',
                      !isLocked && !isReady && 'border-edge bg-panel2 text-ink3',
                    )}
                    aria-hidden
                  >
                    {isLocked ? <Check className="h-2.5 w-2.5" /> : indegs[i]}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
