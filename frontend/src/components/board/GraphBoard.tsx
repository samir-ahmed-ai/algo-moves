import type { CSSProperties, ReactElement } from 'react';

export interface GraphBoardProps {
  adj: number[][];
  pos: [number, number][];
  nodeClass: (n: number) => string;
  label?: (n: number) => string;
  activeNode?: number | null;
  inspectNode?: number | null;
  highlightEdge?: [number, number] | null;
  edgeTone?: 'active' | 'clash';
  /** Optional weight/label drawn at each edge midpoint. */
  edgeLabel?: (v: number, u: number) => string | number | undefined;
  /** Draw directed edges (arrowheads, no reverse-dedup). Default false. */
  directed?: boolean;
  width?: number;
  height?: number;
  nodeRadius?: number;
  pickedNode?: number | null;
  onNodeClick?: (node: number) => void;
  style?: CSSProperties;
}

const isSameEdge = (e: [number, number], v: number, u: number) =>
  (e[0] === v && e[1] === u) || (e[0] === u && e[1] === v);

export function GraphBoard({
  adj,
  pos,
  nodeClass,
  label,
  activeNode = null,
  inspectNode = null,
  highlightEdge = null,
  edgeTone = 'active',
  edgeLabel,
  directed = false,
  width = 352,
  height = 286,
  nodeRadius = 24,
  pickedNode = null,
  onNodeClick,
  style,
}: GraphBoardProps) {
  const seen = new Set<string>();
  const edges: ReactElement[] = [];
  const labels: ReactElement[] = [];

  for (let v = 0; v < adj.length; v++) {
    for (const u of adj[v]) {
      const key = directed ? `${v}->${u}` : `${Math.min(u, v)}-${Math.max(u, v)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const hot =
        highlightEdge !== null &&
        (directed
          ? highlightEdge[0] === v && highlightEdge[1] === u
          : isSameEdge(highlightEdge, v, u));
      const stroke = hot
        ? edgeTone === 'clash'
          ? 'var(--edge-clash)'
          : 'var(--accent)'
        : 'var(--edge)';
      // For directed edges, stop the line at the target circle's edge so the arrowhead shows.
      let [x1, y1] = pos[v];
      let [x2, y2] = pos[u];
      if (directed) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        x1 += ux * nodeRadius;
        y1 += uy * nodeRadius;
        x2 -= ux * (nodeRadius + 6);
        y2 -= uy * (nodeRadius + 6);
      }
      edges.push(
        <line
          key={key}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={hot ? 3 : 1.5}
          strokeLinecap="round"
          markerEnd={
            directed
              ? hot
                ? edgeTone === 'clash'
                  ? 'url(#arrow-clash)'
                  : 'url(#arrow-hot)'
                : 'url(#arrow)'
              : undefined
          }
        />,
      );
      if (edgeLabel) {
        const w = edgeLabel(v, u);
        if (w !== undefined && w !== '') {
          const mx = (pos[v][0] + pos[u][0]) / 2;
          const my = (pos[v][1] + pos[u][1]) / 2;
          labels.push(
            <g key={`l-${key}`}>
              <rect
                x={mx - 9}
                y={my - 9}
                width={18}
                height={18}
                rx={4}
                fill="var(--surface)"
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={mx}
                y={my + 4}
                textAnchor="middle"
                className="node-label node-label--edge"
                style={{ fill: 'var(--text-2)' }}
              >
                {w}
              </text>
            </g>,
          );
        }
      }
    }
  }

  const ringColor = edgeTone === 'clash' ? 'var(--edge-clash)' : 'var(--accent)';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="graph board"
      style={style}
    >
      {directed && (
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge)" />
          </marker>
          <marker
            id="arrow-hot"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
          <marker
            id="arrow-clash"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge-clash)" />
          </marker>
        </defs>
      )}
      {edges}
      {labels}
      {pos.map((p, n) => {
        const ring: CSSProperties =
          activeNode === n
            ? { stroke: ringColor, strokeWidth: 4 }
            : pickedNode === n
              ? { stroke: 'var(--accent)', strokeWidth: 4 }
              : inspectNode === n
                ? { stroke: 'var(--accent)', strokeWidth: 3, strokeDasharray: '3 3' }
                : {};
        return (
          <g
            key={n}
            className={`${nodeClass(n)} nodrag`}
            onClick={onNodeClick ? () => onNodeClick(n) : undefined}
            style={onNodeClick ? { cursor: 'pointer' } : undefined}
          >
            <circle cx={p[0]} cy={p[1]} r={nodeRadius} style={ring} />
            <text x={p[0]} y={p[1] + 5} textAnchor="middle" className="node-label">
              {label ? label(n) : n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
