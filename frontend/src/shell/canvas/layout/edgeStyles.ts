import {
  ConnectionLineType,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import type { EdgeOpts, EdgePathType } from '@/lib/canvas/layoutPrefs';

/** Accent swatches a node can be re-coloured to (NodeToolbar / context menu). */
export const ACCENTS = [
  'var(--accent)',
  'var(--good)',
  'var(--bad)',
  'var(--team1-stroke)',
  'var(--team2-stroke)',
  'var(--edge-active)',
];

/** Fit-view padding constants — single source for canvas chrome-aware framing. */
export const FIT_PADDING = 0.08;
export const FIT_PADDING_VIEW = 0.2;
export const FIT_PADDING_FOCUS = 0.4;

export function connectionLineType(pathType: EdgePathType): ConnectionLineType {
  switch (pathType) {
    case 'bezier':
      return ConnectionLineType.Bezier;
    case 'straight':
      return ConnectionLineType.Straight;
    case 'step':
    case 'smoothstep':
    default:
      return ConnectionLineType.SmoothStep;
  }
}

/** Short label shown on removable edges (Strudel Flow ButtonEdge analogue). */
export function edgeConnectionLabel(
  connection: Pick<Connection, 'source' | 'target'>,
  nodes: Node[],
): string {
  const src = nodes.find((n) => n.id === connection.source);
  const tgt = nodes.find((n) => n.id === connection.target);
  if (src?.type === 'effect' && tgt?.type === 'effect') return '→';
  if (tgt?.type === 'effect') return 'in';
  if (src?.type === 'effect') return 'out';
  return '·';
}

export function styleEdges(edges: Edge[], o: EdgeOpts, nodes?: Node[]): Edge[] {
  return edges.map((e) => {
    const stroke = (e.data as { stroke?: string } | undefined)?.stroke ?? 'var(--edge)';
    const pathType = (e.data as { pathType?: EdgePathType } | undefined)?.pathType ?? o.pathType;
    const existingLabel = (e.data as { label?: string } | undefined)?.label;
    const label = existingLabel ?? (nodes ? edgeConnectionLabel(e, nodes) : undefined);
    return {
      ...e,
      type: 'removable',
      animated: o.animated,
      markerEnd: o.arrow
        ? { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 }
        : undefined,
      style: { ...e.style, stroke, strokeWidth: o.strokeWidth },
      data: { ...(e.data ?? {}), pathType, ...(label ? { label } : {}) },
    };
  });
}
