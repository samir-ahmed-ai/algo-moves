import { MIN_VIEWPORT_HEIGHT } from '../ui/canvasTokens';
import { getMeasuredHeight } from './measuredCache';
import {
  NODE_W,
  NODE_MIN_W,
  NODE_MAX_W,
  STRUDEL_NODE_W,
  LEGACY_STRUDEL_NODE_W,
  NODE_UI_SCALE,
  clampNodeWidth,
} from '@/design/nodeScale';

export type NodeTier = 'narrow' | 'standard' | 'wide' | 'board';

export type PanelSize = { w: number; estH: number; cap?: number };

// Node-scale constants are defined in @/design/nodeScale (a pure leaf);
// re-exported here for this module's many consumers.
export {
  NODE_W,
  NODE_MIN_W,
  NODE_MAX_W,
  STRUDEL_NODE_W,
  LEGACY_STRUDEL_NODE_W,
  NODE_UI_SCALE,
  clampNodeWidth,
};

function normalizeKind(kind: string): string {
  return kind.trim();
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value! : fallback;
}

function normalizeWidth(value: number | undefined, fallback = DEFAULT_SIZE.w): number {
  return Math.max(NODE_MIN_W, Math.round(finiteNumber(value, fallback)));
}

function normalizeSize(size: PanelSize): PanelSize {
  const w = normalizeWidth(size.w);
  const estH = Math.max(1, Math.round(finiteNumber(size.estH, DEFAULT_SIZE.estH)));
  const cap = size.cap == null ? undefined : clampNodeWidth(size.cap);
  return { w, estH, cap };
}

function scaleEstH(base: number): number {
  return Math.round(base * NODE_UI_SCALE);
}

/**
 * Per-panel sizing. `w` is the initial layout width; `cap` is the max body width;
 * `estH` is the initial dagre height before ResizeObserver measures.
 */
const SIZE: Record<string, PanelSize> = {
  workbench: { w: 1400, estH: scaleEstH(800) },
  problem: { w: STRUDEL_NODE_W, estH: scaleEstH(380), cap: NODE_MAX_W },
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
  whiteboard: { w: 900, estH: 620 },
  'collab-code': { w: 720, estH: 480 },
  quiz: { w: STRUDEL_NODE_W, estH: 250, cap: 475 },
  simulate: { w: 600, estH: 600, cap: 700 },
};

const DEFAULT_SIZE: PanelSize = { w: STRUDEL_NODE_W, estH: 350, cap: STRUDEL_NODE_W };

const KIND_TIER: Record<string, NodeTier> = {
  workbench: 'wide',
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
  whiteboard: 'board',
  'collab-code': 'board',
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
  return normalizeSize(SIZE[normalizeKind(kind)] ?? DEFAULT_SIZE);
}

/** Max body width for a kind; undefined = uncapped. */
export function layoutCap(kind: string): number | undefined {
  return layoutEstimate(kind).cap;
}

/** Max node width cap for problem; undefined = no cap. */
export function layoutFixedWidth(kind: string): number | undefined {
  if (normalizeKind(kind) === 'problem') return NODE_MAX_W;
  return undefined;
}

/** Logical sizing tier for a panel kind. */
export function nodeTier(kind: string): NodeTier {
  return KIND_TIER[normalizeKind(kind)] ?? 'standard';
}

/** Viewport-aware layout size — board panels can use available height hints. */
export function layoutSize(kind: string, viewport?: { width: number; height: number }): PanelSize {
  const panelKind = normalizeKind(kind);
  const base = layoutEstimate(panelKind);
  const tier = nodeTier(panelKind);
  const scale = TIER_SCALE[tier];
  const w = normalizeWidth(base.w * scale, base.w);
  const cap = base.cap != null ? clampNodeWidth(Math.round(base.cap * scale)) : base.cap;

  if (tier === 'board' && viewport) {
    const viewportW = finiteNumber(viewport.width, STRUDEL_NODE_W);
    const viewportH = finiteNumber(viewport.height, MIN_VIEWPORT_HEIGHT);
    const availH = Math.max(MIN_VIEWPORT_HEIGHT, viewportH - 24);
    const availW = Math.max(STRUDEL_NODE_W, viewportW * 0.55);
    if (panelKind === 'viz') {
      return { w: availW, estH: availH, cap };
    }
    if (panelKind === 'workbench') {
      return { w: Math.max(1400, viewportW - 48), estH: availH, cap };
    }
  }

  return { w, estH: base.estH, cap };
}

/** Measured height when available, else estimate — for align / dagre helpers. */
export function layoutHeight(kind: string, id?: string, measured?: number): number {
  if (Number.isFinite(measured)) return Math.max(1, Math.round(measured!));
  if (id) {
    const cached = getMeasuredHeight(id);
    if (Number.isFinite(cached)) return Math.max(1, Math.round(cached!));
  }
  return layoutEstimate(kind).estH;
}

/** Internal size lookup by panel id/kind key. */
export function sizeOf(id: string): PanelSize {
  return layoutEstimate(id);
}
