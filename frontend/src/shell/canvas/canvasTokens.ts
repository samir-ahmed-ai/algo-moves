import { NODE_W } from '@/design/nodeScale';
import { FIT_VIEW_DURATION_MS, MIN_VIEWPORT_HEIGHT, CANVAS_MARGIN } from '@/design/canvasMetrics';
// Node width + viewport metrics are defined in the design leaf; re-exported so
// existing `./canvasTokens` consumers keep working.
export { NODE_W };
export { FIT_VIEW_DURATION_MS, MIN_VIEWPORT_HEIGHT, CANVAS_MARGIN };

/** Scale a spacing token from the standard node width (400px baseline). */
export function scaleFromNodeWidth(nodeW: number, ratio: number, floor = 0): number {
  return Math.max(floor, Math.round(nodeW * ratio));
}

/** Gap between stacked / row nodes — ~6% of node width. */
export function canvasNodeSep(nodeW = NODE_W): number {
  return scaleFromNodeWidth(nodeW, 0.06, 16);
}

/** Horizontal corridor for converging wires into the visualizer — ~25% of node width. */
export function vizWireGap(nodeW = NODE_W, preset?: 'default' | 'theater'): number {
  const base = scaleFromNodeWidth(nodeW, 0.25, 80);
  return preset === 'theater' ? Math.max(64, Math.round(base * 0.85)) : base;
}

/** Port dot offset outside the node border. */
export function handlePortOffset(nodeW = NODE_W): number {
  return scaleFromNodeWidth(nodeW, 0.025, 8);
}

/** Minimum visualizer width when viewport layout runs. */
export function vizMinWidth(nodeW = NODE_W): number {
  return nodeW;
}

export const CANVAS_NODE_SEP = canvasNodeSep(NODE_W);
export const VIZ_WIRE_GAP = vizWireGap(NODE_W);

/** Tailwind class shared by all canvas port handles. */
export const HANDLE_DOT_CLASS =
  'handle-dot !z-[1] !h-[var(--node-handle,18px)] !w-[var(--node-handle,18px)] !min-w-0 !rounded-full !border-2 !border-edge2 !bg-panel2';
