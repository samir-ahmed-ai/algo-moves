import { MIN_VIEWPORT_HEIGHT } from './canvasTokens';
import { getMeasuredHeight } from './measuredCache';

export type NodeTier = 'narrow' | 'standard' | 'wide' | 'board';

export type PanelSize = { w: number; estH: number; cap?: number };

/** Strudel Flow standard node width (~25% above legacy w-80). */
export const NODE_W = 400;

/** @deprecated Use NODE_W */
export const STRUDEL_NODE_W = NODE_W;

/** Legacy canvas node width (Tailwind `w-80`). */
export const LEGACY_STRUDEL_NODE_W = 320;

/** Uniform UI scale for Strudel-sized narrow panels — typography, padding, min heights. */
export const NODE_UI_SCALE = STRUDEL_NODE_W / LEGACY_STRUDEL_NODE_W;

export const PROBLEM_MIN_H = Math.round(150 * NODE_UI_SCALE);
export const EXAMPLES_MIN_H = Math.round(90 * NODE_UI_SCALE);

/** ResizeObserver / NodeResizer floor for a panel kind. */
export function panelMinHeight(kind: string): number {
  if (kind === 'examples') return EXAMPLES_MIN_H;
  if (kind === 'problem') return PROBLEM_MIN_H;
  return PROBLEM_MIN_H;
}

function scaleEstH(base: number): number {
  return Math.round(base * NODE_UI_SCALE);
}

/**
 * Per-panel sizing. `w` is the floor a node shrink-wraps down to; `cap` is the max
 * body width; `estH` is the initial dagre height before ResizeObserver measures.
 */
const SIZE: Record<string, PanelSize> = {
  examples: { w: STRUDEL_NODE_W, estH: scaleEstH(150), cap: STRUDEL_NODE_W },
  problem: { w: STRUDEL_NODE_W, estH: scaleEstH(275), cap: STRUDEL_NODE_W },
  viz: { w: STRUDEL_NODE_W, estH: 550 },
  replay: { w: STRUDEL_NODE_W, estH: 450, cap: STRUDEL_NODE_W },
  inspector: { w: STRUDEL_NODE_W, estH: 525, cap: 450 },
  metrics: { w: STRUDEL_NODE_W, estH: 300, cap: STRUDEL_NODE_W },
  bigo: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  predict: { w: STRUDEL_NODE_W, estH: 400, cap: STRUDEL_NODE_W },
  mastery: { w: STRUDEL_NODE_W, estH: 275, cap: STRUDEL_NODE_W },
  mistakes: { w: STRUDEL_NODE_W, estH: 350, cap: STRUDEL_NODE_W },
  explain: { w: STRUDEL_NODE_W, estH: 375, cap: STRUDEL_NODE_W },
  badges: { w: STRUDEL_NODE_W, estH: 350, cap: STRUDEL_NODE_W },
  bookmarks: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  editor: { w: STRUDEL_NODE_W, estH: 325, cap: 450 },
  pattern: { w: STRUDEL_NODE_W, estH: 450, cap: STRUDEL_NODE_W },
  glossary: { w: STRUDEL_NODE_W, estH: 400, cap: STRUDEL_NODE_W },
  diff: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  watch: { w: STRUDEL_NODE_W, estH: 350, cap: STRUDEL_NODE_W },
  hints: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  path: { w: STRUDEL_NODE_W, estH: 400, cap: STRUDEL_NODE_W },
  cheatsheet: { w: STRUDEL_NODE_W, estH: 350, cap: STRUDEL_NODE_W },
  projects: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  notes: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  complexity: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  edgecases: { w: STRUDEL_NODE_W, estH: 325, cap: STRUDEL_NODE_W },
  copy: { w: 375, estH: 525, cap: 600 },
  cases: { w: 1150, estH: 900 },
  code: { w: 1300, estH: 725 },
  reassemble: { w: 1300, estH: 600 },
  recall: { w: 1300, estH: 725 },
  scratch: { w: 1300, estH: 650 },
  quiz: { w: STRUDEL_NODE_W, estH: 250, cap: 475 },
  simulate: { w: 600, estH: 600, cap: 700 },
};

const DEFAULT_SIZE: PanelSize = { w: STRUDEL_NODE_W, estH: 350, cap: STRUDEL_NODE_W };

const KIND_TIER: Record<string, NodeTier> = {
  examples: 'narrow',
  problem: 'narrow',
  viz: 'board',
  replay: 'standard',
  inspector: 'wide',
  metrics: 'standard',
  bigo: 'standard',
  predict: 'standard',
  mastery: 'narrow',
  mistakes: 'standard',
  explain: 'standard',
  badges: 'standard',
  bookmarks: 'standard',
  editor: 'wide',
  pattern: 'wide',
  glossary: 'standard',
  diff: 'standard',
  watch: 'standard',
  hints: 'standard',
  path: 'standard',
  cheatsheet: 'standard',
  projects: 'standard',
  notes: 'standard',
  complexity: 'standard',
  edgecases: 'standard',
  copy: 'wide',
  cases: 'board',
  code: 'board',
  reassemble: 'board',
  recall: 'board',
  scratch: 'board',
  quiz: 'standard',
  simulate: 'board',
};

const TIER_SCALE: Record<NodeTier, number> = {
  narrow: 1,
  standard: 1,
  wide: 1.08,
  board: 1,
};

/** Dagre / align fallback before ResizeObserver sets the real height. */
export function layoutEstimate(kind: string): PanelSize {
  return SIZE[kind] ?? DEFAULT_SIZE;
}

/** Max body width for a kind; undefined = uncapped. */
export function layoutCap(kind: string): number | undefined {
  return (SIZE[kind] ?? DEFAULT_SIZE).cap;
}

/** Fixed node width for kinds that must not vary; undefined = resizable. */
export function layoutFixedWidth(kind: string): number | undefined {
  if (kind === 'problem' || kind === 'examples') return layoutEstimate('problem').w;
  return undefined;
}

/** Logical sizing tier for a panel kind. */
export function nodeTier(kind: string): NodeTier {
  return KIND_TIER[kind] ?? 'standard';
}

/** Viewport-aware layout size — board panels can use available height hints. */
export function layoutSize(kind: string, viewport?: { width: number; height: number }): PanelSize {
  const base = layoutEstimate(kind);
  const tier = nodeTier(kind);
  const scale = TIER_SCALE[tier];
  const w = Math.round(base.w * scale);
  const cap = base.cap != null ? Math.round(base.cap * scale) : base.cap;

  if (tier === 'board' && viewport) {
    const availH = Math.max(MIN_VIEWPORT_HEIGHT, viewport.height - 24);
    const availW = Math.max(STRUDEL_NODE_W, viewport.width * 0.55);
    if (kind === 'viz') {
      return { w: availW, estH: availH, cap };
    }
  }

  return { w, estH: base.estH, cap };
}

/** Measured height when available, else estimate — for align / dagre helpers. */
export function layoutHeight(kind: string, id?: string, measured?: number): number {
  if (measured != null) return measured;
  if (id) {
    const cached = getMeasuredHeight(id);
    if (cached != null) return cached;
  }
  return layoutEstimate(kind).estH;
}

/** Internal size lookup by panel id/kind key. */
export function sizeOf(id: string): PanelSize {
  return SIZE[id] ?? DEFAULT_SIZE;
}
