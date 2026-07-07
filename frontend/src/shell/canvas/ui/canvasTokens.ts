import { NODE_W } from '@/design/nodeScale';
import {
  CANVAS_CHROME_MARGIN,
  FIT_VIEW_DURATION_MS,
  MIN_VIEWPORT_HEIGHT,
  CANVAS_MARGIN,
  clampCanvasInset,
} from '@/design/canvasMetrics';
// Node width + viewport metrics are defined in the design leaf; re-exported so
// existing `./canvasTokens` consumers keep working.
export { NODE_W };
export {
  CANVAS_CHROME_MARGIN,
  FIT_VIEW_DURATION_MS,
  MIN_VIEWPORT_HEIGHT,
  CANVAS_MARGIN,
  clampCanvasInset,
};

/** Scale a spacing token from the standard node width (400px baseline). */
export function scaleFromNodeWidth(nodeW: number, ratio: number, floor = 0): number {
  const safeNodeW = Number.isFinite(nodeW) ? Math.max(0, nodeW) : NODE_W;
  const safeRatio = Number.isFinite(ratio) ? ratio : 0;
  const safeFloor = Number.isFinite(floor) ? floor : 0;
  return Math.max(safeFloor, Math.round(safeNodeW * safeRatio));
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
  'handle-dot canvas-handle-dot !z-[1] !h-[var(--node-handle,18px)] !w-[var(--node-handle,18px)] !min-w-0 !rounded-full !border-2 !border-edge2 !bg-panel2';
