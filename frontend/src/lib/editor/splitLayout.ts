/** Split-pane bounds for the code editor, as a percentage of width given to the
 * left (code) pane. Pure geometry — lives in lib so both the editor component
 * and the editor-prefs store can share it without a store↔component coupling. */
export const SPLIT_MIN = 28;
export const SPLIT_MAX = 72;

/** Clamp a split percentage into the usable range. */
export function clampSplitPct(pct: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct));
}
