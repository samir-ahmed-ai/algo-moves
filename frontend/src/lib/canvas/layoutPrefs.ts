/**
 * Canvas layout + edge-appearance preferences: pure data & types shared by the
 * canvas renderer (shell), app state (store), and canvas action helpers (lib).
 * Homed in lib so neither store nor lib imports upward into shell/canvas;
 * shell/canvas/layout.ts re-exports these for its existing consumers.
 */

export const LAYOUT_PRESETS = ['Full', 'TraceFocus', 'Minimal', 'Theater', 'Demo'] as const;
export type LayoutPreset = (typeof LAYOUT_PRESETS)[number];

const LAYOUT_PRESET_BY_KEY: Record<string, LayoutPreset> = {
  full: 'Full',
  tracefocus: 'TraceFocus',
  'trace-focus': 'TraceFocus',
  study: 'TraceFocus',
  minimal: 'Minimal',
  exam: 'Minimal',
  theater: 'Theater',
  theatre: 'Theater',
  demo: 'Demo',
};

export function isLayoutPreset(value: unknown): value is LayoutPreset {
  return typeof value === 'string' && (LAYOUT_PRESETS as readonly string[]).includes(value);
}

/** Legacy persisted preset name → current {@link LayoutPreset}. */
export function normalizeLayoutPreset(value: unknown): LayoutPreset {
  if (isLayoutPreset(value)) return value;
  if (typeof value === 'string')
    return LAYOUT_PRESET_BY_KEY[value.trim().toLowerCase()] ?? 'TraceFocus';
  return 'TraceFocus';
}

export interface LayoutVisualizeOptions {
  preset?: LayoutPreset;
  viewport?: { width: number; height: number };
}

export const BG_VARIANTS = ['dots', 'lines', 'cross', 'none'] as const;
export type BgVariant = (typeof BG_VARIANTS)[number];
export type EdgePathType = 'smoothstep' | 'bezier' | 'step' | 'straight';

export function isBgVariant(value: unknown): value is BgVariant {
  return typeof value === 'string' && (BG_VARIANTS as readonly string[]).includes(value);
}

export function normalizeBgVariant(value: unknown, fallback: BgVariant = 'dots'): BgVariant {
  if (typeof value !== 'string') return fallback;
  const bg = value.trim().toLowerCase();
  return isBgVariant(bg) ? bg : fallback;
}

export interface EdgeOpts {
  pathType: EdgePathType;
  animated: boolean;
  strokeWidth: number;
  arrow: boolean;
}

export const defaultEdgeOpts: EdgeOpts = {
  pathType: 'bezier',
  animated: true,
  strokeWidth: 1.5,
  arrow: false,
};

export function normalizeEdgeOpts(value: Partial<EdgeOpts> | undefined): EdgeOpts {
  const pathTypes: readonly EdgePathType[] = ['smoothstep', 'bezier', 'step', 'straight'];
  const strokeWidth = Number.isFinite(value?.strokeWidth)
    ? Math.max(0.5, Math.min(6, value!.strokeWidth!))
    : defaultEdgeOpts.strokeWidth;
  return {
    pathType: pathTypes.includes(value?.pathType as EdgePathType)
      ? (value!.pathType as EdgePathType)
      : defaultEdgeOpts.pathType,
    animated: typeof value?.animated === 'boolean' ? value.animated : defaultEdgeOpts.animated,
    strokeWidth,
    arrow: typeof value?.arrow === 'boolean' ? value.arrow : defaultEdgeOpts.arrow,
  };
}

/** Node alignment directions for the canvas align/distribute tools. Pure type,
 * homed here so the store's CanvasToolsProps contract doesn't import shell. */
export type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom';

/** Named arrangements for the fill-canvas tiler (see shell/canvas tileCanvasNodes). */
export type CanvasFillPreset = 'auto' | 'board' | 'code' | 'split';

/** Viewport snap regions for single-node canvas docking. */
export type CanvasSnapRegion =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'maximize'
  | 'first-third'
  | 'center-third'
  | 'last-third';
