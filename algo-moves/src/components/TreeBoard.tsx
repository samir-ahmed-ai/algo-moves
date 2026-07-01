import type { CSSProperties, ReactElement } from 'react';

export interface TreeBoardProps {
  /** Level-order array; null marks an absent slot. Children of i are 2i+1, 2i+2. */
  tree: (number | string | null)[];
  nodeClass: (i: number) => string;
  activeNode?: number | null;
  /** Highlight an edge parent→child by the child index. */
  highlightChild?: number | null;
  nodeRadius?: number;
  gapX?: number;
  gapY?: number;
  onNodeClick?: (i: number) => void;
  pickedNode?: number | null;
  style?: CSSProperties;
}

const depthOf = (i: number) => Math.floor(Math.log2(i + 1));

/**
 * Binary-tree board. Lays nodes out by in-order x position and depth y, so any
 * tree given in level order (with null holes) renders cleanly. Shared by tree
 * traversals, heaps, and tries.
 */
export function TreeBoard({
  tree,
  nodeClass,
  activeNode = null,
  highlightChild = null,
  nodeRadius = 20,
  gapX = 51,
  gapY = 70,
  onNodeClick,
  pickedNode = null,
  style,
}: TreeBoardProps) {
  const n = tree.length;
  const xIndex = new Array<number>(n).fill(-1);
  let counter = 0;
  const inorder = (i: number) => {
    if (i >= n || tree[i] == null) return;
    inorder(2 * i + 1);
    xIndex[i] = counter++;
    inorder(2 * i + 2);
  };
  inorder(0);

  const pad = nodeRadius + 8;
  let maxDepth = 0;
  for (let i = 0; i < n; i++) if (tree[i] != null) maxDepth = Math.max(maxDepth, depthOf(i));
  const width = Math.max(1, counter) * gapX + pad * 2 - gapX + 2 * nodeRadius;
  const height = (maxDepth + 1) * gapY + pad;

  const xy = (i: number): [number, number] => [pad + xIndex[i] * gapX, pad + depthOf(i) * gapY];

  const edges: ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    if (tree[i] == null) continue;
    for (const c of [2 * i + 1, 2 * i + 2]) {
      if (c < n && tree[c] != null) {
        const [x1, y1] = xy(i);
        const [x2, y2] = xy(c);
        const hot = highlightChild === c;
        edges.push(
          <line
            key={`${i}-${c}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={hot ? 'var(--edge-active)' : 'var(--edge)'}
            strokeWidth={hot ? 4 : 2}
            strokeLinecap="round"
          />,
        );
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="tree board" style={style}>
      {edges}
      {tree.map((v, i) => {
        if (v == null) return null;
        const [cx, cy] = xy(i);
        const ring: CSSProperties =
          activeNode === i
            ? { stroke: 'var(--ring)', strokeWidth: 4 }
            : pickedNode === i
              ? { stroke: 'var(--accent)', strokeWidth: 4 }
              : {};
        return (
          <g
            key={i}
            className={`${nodeClass(i)} nodrag`}
            onClick={onNodeClick ? () => onNodeClick(i) : undefined}
            style={onNodeClick ? { cursor: 'pointer' } : undefined}
          >
            <circle cx={cx} cy={cy} r={nodeRadius} style={ring} />
            <text x={cx} y={cy + 4} textAnchor="middle" className="node-label" style={{ fontSize: 'var(--node-fs-xs, 12px)' }}>
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
