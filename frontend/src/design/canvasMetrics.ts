/**
 * Canvas viewport metrics — pure numbers in the design leaf. Re-exported by
 * shell/canvas/canvasTokens for its consumers and aggregated by design/tokens.
 */

/** fitView animation duration (ms). */
export const FIT_VIEW_DURATION_MS = 400;

/** Minimum usable viewport height for board / viz layout. */
export const MIN_VIEWPORT_HEIGHT = 280;

/** Outer canvas inset — fixed for readability at any node scale. */
export const CANVAS_MARGIN = 12;

/** Minimum drag/drop safety inset used by floating canvas chrome. */
export const CANVAS_CHROME_MARGIN = 8;

export function clampCanvasInset(value: number): number {
  if (!Number.isFinite(value)) return CANVAS_MARGIN;
  return Math.max(0, Math.round(value));
}
