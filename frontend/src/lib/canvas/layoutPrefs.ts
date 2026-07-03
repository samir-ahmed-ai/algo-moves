/**
 * Canvas layout + edge-appearance preferences: pure data & types shared by the
 * canvas renderer (shell), app state (store), and canvas action helpers (lib).
 * Homed in lib so neither store nor lib imports upward into shell/canvas;
 * shell/canvas/layout.ts re-exports these for its existing consumers.
 */

export const LAYOUT_PRESETS = ['Full', 'Study', 'Minimal', 'Theater', 'Demo'] as const;
export type LayoutPreset = (typeof LAYOUT_PRESETS)[number];

export interface LayoutVisualizeOptions {
  preset?: LayoutPreset;
  viewport?: { width: number; height: number };
}

export type BgVariant = 'dots' | 'lines' | 'cross' | 'none';
export type EdgePathType = 'smoothstep' | 'bezier' | 'step' | 'straight';

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

/** Node alignment directions for the canvas align/distribute tools. Pure type,
 * homed here so the store's CanvasToolsProps contract doesn't import shell. */
export type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom';
