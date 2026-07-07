import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { rootOf, type UfOp } from '../engine/dsu';
import { useBridgeGame } from '../BridgeGameProvider';

const VIEW_W = 400;
const VIEW_H = 258;

/** Distinct hue per possible root index (up to 9 islands). */
const HUES = [205, 340, 140, 45, 275, 15, 170, 310, 80];

function hueForRoot(root: number): number {
  return HUES[root % HUES.length]!;
}

/** Fixed positions: a loose ellipse with alternating radius, no DOM measuring. */
function layout(n: number): { x: number; y: number }[] {
  const cx = VIEW_W / 2;
  const cy = 128;
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const wob = i % 2 === 0 ? 1 : 0.78;
    return {
      x: cx + Math.cos(angle) * 152 * wob,
      y: cy + Math.sin(angle) * 92 * wob,
    };
  });
}

function opLabel(op: UfOp, k: (i: number) => string): string {
  if (op.type === 'connected') return `connected(${k(op.a)}, ${k(op.b)})?`;
  if (op.type === 'union') return `union(${k(op.a)}, ${k(op.b)})`;
  return `edge(${k(op.a)}, ${k(op.b)})`;
}

function OpQueue() {
  const { level, opIndex } = useBridgeGame();
  const k = (i: number) => level.islands[i]?.key ?? String(i + 1);

  return (
    <div
      className="flex w-full max-w-xl items-center gap-1.5 overflow-x-auto px-1 py-1"
      aria-label="Operation queue"
    >
      {level.ops.map((op, i) => {
        const done = i < opIndex;
        const current = i === opIndex;
        return (
          <span
            key={i}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors',
              current && 'border-accent/40 bg-accentbg text-accent',
              done && 'border-edge bg-panel text-ink3 opacity-50',
              !current && !done && 'border-edge bg-panel/90 text-ink2',
            )}
          >
            {done ? <Check className="h-3 w-3 shrink-0 text-good" aria-label="done" /> : null}
            {opLabel(op, k)}
          </span>
        );
      })}
    </div>
  );
}

function Crown({ x, y, hue }: { x: number; y: number; hue: number }) {
  const w = 14;
  const h = 8;
  return (
    <path
      d={`M ${x - w / 2} ${y} l 0 ${-h * 0.7} l ${w * 0.25} ${h * 0.45} l ${w / 4} ${-h} l ${w / 4} ${h} l ${w * 0.25} ${-h * 0.45} l 0 ${h * 0.7} z`}
      fill={`hsl(${hue} 80% 62%)`}
      stroke={`hsl(${hue} 60% 35%)`}
      strokeWidth={0.75}
    />
  );
}

export function HarborBoard() {
  const { level, dsu, bridges, op, complete, shake, error, handleKey } = useBridgeGame();
  const n = level.islands.length;
  const pos = useMemo(() => layout(n), [n]);

  const focus = op ? new Set([op.a, op.b]) : new Set<number>();

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      <OpQueue />
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className={cn(
          'w-full max-w-[540px] select-none',
          shake && error && 'vim-maze-cursor--shake',
        )}
        role="img"
        aria-label={`Harbor of ${n} islands with ${bridges.length} bridges`}
      >
        {bridges.map(([a, b], i) => {
          const hue = hueForRoot(rootOf(dsu, a));
          const pa = pos[a]!;
          const pb = pos[b]!;
          return (
            <line
              key={i}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={`hsl(${hue} 65% 55%)`}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.65}
              className="transition-all duration-300"
            />
          );
        })}
        {level.islands.map((island, i) => {
          const root = rootOf(dsu, i);
          const isRoot = root === i;
          const hue = hueForRoot(root);
          const p = pos[i]!;
          const focused = !complete && focus.has(i);
          const size = dsu.size[root]!;
          return (
            <g
              key={island.key}
              onClick={() => handleKey(island.key)}
              className={cn(!complete && 'cursor-pointer')}
              aria-label={`Island ${island.key} ${island.label}${isRoot ? `, root of ${size}` : `, root is ${level.islands[root]?.key}`}`}
            >
              {focused ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={24}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.9}
                />
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={17}
                fill={`hsl(${hue} 65% 52% / 0.18)`}
                stroke={`hsl(${hue} 70% 55%)`}
                strokeWidth={isRoot ? 2.5 : 1.25}
                className="transition-all duration-300"
              />
              <text
                x={p.x}
                y={p.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={15}
                fontWeight={700}
                fill="var(--ink)"
                className="tabular-nums"
              >
                {island.key}
              </text>
              <text x={p.x} y={p.y + 29} textAnchor="middle" fontSize={9} fill="var(--ink3)">
                {island.label}
              </text>
              {isRoot ? (
                <>
                  <Crown x={p.x} y={p.y - 20} hue={hue} />
                  <text
                    x={p.x + 12}
                    y={p.y - 22}
                    fontSize={9}
                    fontWeight={700}
                    fill={`hsl(${hue} 70% 55%)`}
                    className="tabular-nums"
                  >
                    ×{size}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
