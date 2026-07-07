import { cn } from '@/lib/utils/cn';
import { edgeKey, isSettled, type SignalNode } from '../engine/signal';
import { useSignalGame } from '../SignalGameProvider';

function distLabel(d: number): string {
  return d === Infinity ? '∞' : String(d);
}

export function SignalBoard() {
  const { level, state, shakeKey, flash, complete, pathEdges, handleKey } = useSignalGame();

  const flashByEdge = new Map<string, boolean>();
  const flashNodes = new Set<number>();
  if (flash) {
    for (const r of flash.relaxations) {
      flashByEdge.set(edgeKey(r.from, r.to), r.improved);
      if (r.improved) flashNodes.add(r.to);
    }
  }

  const nodeByKey = new Map<number, SignalNode>(level.nodes.map((n) => [n.key, n]));

  return (
    <svg
      viewBox={`0 0 ${level.view.w} ${level.view.h}`}
      className="w-full max-w-[460px]"
      role="group"
      aria-label={`Weighted graph for ${level.title}`}
    >
      {/* Edges */}
      {level.edges.map((e) => {
        const a = nodeByKey.get(e.a)!;
        const b = nodeByKey.get(e.b)!;
        const id = edgeKey(e.a, e.b);
        const onPath = complete && pathEdges.has(id);
        const flashing = flashByEdge.get(id);
        const stroke = onPath
          ? 'var(--accent)'
          : flashing === true
            ? 'var(--good)'
            : flashing === false
              ? 'var(--ink3)'
              : 'var(--edge)';
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={id} className="transition-all duration-300">
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={stroke}
              strokeWidth={onPath ? 3.5 : flashing != null ? 2.5 : 1.5}
            />
            <text
              x={mx}
              y={my - 5}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill={onPath ? 'var(--accent)' : flashing === true ? 'var(--good)' : 'var(--ink2)'}
              stroke="var(--bg)"
              strokeWidth={4}
              style={{ paintOrder: 'stroke' }}
              className="tabular-nums"
            >
              {e.w}
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {level.nodes.map((node) => {
        const settled = isSettled(state, node.key);
        const d = state.dist[node.key]!;
        const reached = d !== Infinity;
        const onPath =
          complete && state.pred[node.key] != null && pathEdgesHasNode(pathEdges, node.key);
        const justImproved = flashNodes.has(node.key);
        const isSource = node.key === level.source;
        const isTarget = node.key === level.target;

        return (
          <g
            key={node.key}
            onClick={() => handleKey(String(node.key))}
            className={cn('cursor-pointer', shakeKey === node.key && 'vim-maze-cursor--shake')}
            role="button"
            aria-label={`${node.name}, key ${node.key}, distance ${distLabel(d)}${settled ? ', settled' : ''}`}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={24}
              fill={settled ? 'var(--accent)' : 'var(--panel)'}
              stroke={
                settled
                  ? 'var(--accent)'
                  : justImproved
                    ? 'var(--good)'
                    : reached
                      ? 'var(--accent)'
                      : 'var(--edge)'
              }
              strokeWidth={settled || justImproved || (complete && onPath) ? 2.5 : 1.5}
              className="transition-all duration-300"
            />
            {/* Keycap chip */}
            <rect
              x={node.x - 9}
              y={node.y - 19}
              width={18}
              height={13}
              rx={3}
              fill={settled ? 'color-mix(in srgb, white 22%, transparent)' : 'var(--panel2)'}
              stroke={settled ? 'transparent' : 'var(--edge)'}
              strokeWidth={1}
            />
            <text
              x={node.x}
              y={node.y - 9}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={settled ? 'white' : 'var(--ink2)'}
              className="tabular-nums"
            >
              {node.key}
            </text>
            {/* Tentative / final distance */}
            <text
              x={node.x}
              y={node.y + 14}
              textAnchor="middle"
              fontSize={14}
              fontWeight={800}
              fill={
                settled
                  ? 'white'
                  : justImproved
                    ? 'var(--good)'
                    : reached
                      ? 'var(--ink)'
                      : 'var(--ink3)'
              }
              className="tabular-nums transition-colors duration-300"
            >
              {distLabel(d)}
            </text>
            {/* Name + role markers */}
            <text
              x={node.x}
              y={node.y + 41}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill={settled ? 'var(--accent)' : 'var(--ink2)'}
              stroke="var(--bg)"
              strokeWidth={3}
              style={{ paintOrder: 'stroke' }}
            >
              {isSource ? '▶ ' : ''}
              {node.name}
            </text>
            {isTarget ? (
              <text
                x={node.x}
                y={node.y - 30}
                textAnchor="middle"
                fontSize={13}
                fill="var(--accent)"
                stroke="var(--bg)"
                strokeWidth={3}
                style={{ paintOrder: 'stroke' }}
                aria-label="target"
              >
                ★
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function pathEdgesHasNode(pathEdges: Set<string>, key: number): boolean {
  for (const id of pathEdges) {
    const [a, b] = id.split('-');
    if (Number(a) === key || Number(b) === key) return true;
  }
  return false;
}
