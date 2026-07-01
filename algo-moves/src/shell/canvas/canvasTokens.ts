/** Default node width baseline — keep in sync with STRUDEL_NODE_W in nodeTokens. */
const DEFAULT_NODE_W = 400;

/** fitView animation duration (ms). */
export const FIT_VIEW_DURATION_MS = 400;

/** Minimum usable viewport height for board / viz layout. */
export const MIN_VIEWPORT_HEIGHT = 280;

/** Scale a spacing token from the standard node width (400px baseline). */
export function scaleFromNodeWidth(nodeW: number, ratio: number, floor = 0): number {
  return Math.max(floor, Math.round(nodeW * ratio));
}

/** Outer canvas inset — fixed for readability at any node scale. */
export const CANVAS_MARGIN = 12;

/** Gap between stacked / row nodes — ~6% of node width. */
export function canvasNodeSep(nodeW = DEFAULT_NODE_W): number {
  return scaleFromNodeWidth(nodeW, 0.06, 16);
}

/** Horizontal corridor for converging wires into the visualizer — ~25% of node width. */
export function vizWireGap(nodeW = DEFAULT_NODE_W, preset?: 'default' | 'theater'): number {
  const base = scaleFromNodeWidth(nodeW, 0.25, 80);
  return preset === 'theater' ? Math.max(64, Math.round(base * 0.85)) : base;
}

/** Port dot offset outside the node border. */
export function handlePortOffset(nodeW = DEFAULT_NODE_W): number {
  return scaleFromNodeWidth(nodeW, 0.025, 8);
}

/** Minimum visualizer width when viewport layout runs. */
export function vizMinWidth(nodeW = DEFAULT_NODE_W): number {
  return nodeW;
}

export const CANVAS_NODE_SEP = canvasNodeSep(DEFAULT_NODE_W);
export const VIZ_WIRE_GAP = vizWireGap(DEFAULT_NODE_W);

/** Tailwind class shared by all canvas port handles. */
export const HANDLE_DOT_CLASS =
  'handle-dot !z-[1] !h-[var(--node-handle,18px)] !w-[var(--node-handle,18px)] !min-w-0 !rounded-full !border-2 !border-edge2 !bg-panel2';
