import type { CSSProperties, ReactElement } from 'react';

export interface NaryNode {
  label: string;
  children: number[];
}

export interface NaryTreeBoardProps {
  /** Flat node list; node 0 is the root. children are indices into this array. */
  nodes: NaryNode[];
  nodeClass: (i: number) => string;
  activeNode?: number | null;
  /** Highlight a node's incoming edge (by node index). */
  highlightNode?: number | null;
  nodeRadius?: number;
  gapX?: number;
  gapY?: number;
  style?: CSSProperties;
}

/**
 * General N-ary tree board (arbitrary children per node). Lays leaves out left
 * to right and centers each parent over its children; depth sets the y. Used by
 * the trie; works for any rooted tree given as a flat node list.
 */
export function NaryTreeBoard({
  nodes,
  nodeClass,
  activeNode = null,
  highlightNode = null,
  nodeRadius = 18,
  gapX = 51,
  gapY = 70,
  style,
}: NaryTreeBoardProps) {
  const n = nodes.length;
  const x = new Array<number>(n).fill(0);
  const depth = new Array<number>(n).fill(0);
  let leafCursor = 0;

  const place = (i: number, d: number) => {
    depth[i] = d;
    const kids = nodes[i]?.children ?? [];
    if (kids.length === 0) {
      x[i] = leafCursor++;
      return;
    }
    for (const c of kids) place(c, d + 1);
    x[i] = (x[kids[0]] + x[kids[kids.length - 1]]) / 2;
  };
  if (n > 0) place(0, 0);

  const pad = nodeRadius + 10;
  const maxDepth = Math.max(0, ...depth);
  const width = Math.max(1, leafCursor) * gapX + pad * 2 - gapX + 2 * nodeRadius;
  const height = (maxDepth + 1) * gapY + pad;
  const px = (i: number) => pad + x[i] * gapX;
  const py = (i: number) => pad + depth[i] * gapY;

  const edges: ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    for (const c of nodes[i].children) {
      const hot = highlightNode === c;
      edges.push(
        <line
          key={`${i}-${c}`}
          x1={px(i)}
          y1={py(i)}
          x2={px(c)}
          y2={py(c)}
          stroke={hot ? 'var(--edge-active)' : 'var(--edge)'}
          strokeWidth={hot ? 4 : 2}
          strokeLinecap="round"
        />,
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="trie board" style={style}>
      {edges}
      {nodes.map((nd, i) => {
        const ring: CSSProperties = activeNode === i ? { stroke: 'var(--ring)', strokeWidth: 4 } : {};
        return (
          <g key={i} className={`${nodeClass(i)} nodrag`}>
            <circle cx={px(i)} cy={py(i)} r={nodeRadius} style={ring} />
            <text x={px(i)} y={py(i) + 4} textAnchor="middle" className="node-label" style={{ fontSize: 'var(--node-fs-xs, 12px)' }}>
              {nd.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
