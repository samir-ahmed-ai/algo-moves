/** Shared layout constants for canvas chrome (dock, rails, HUD). */
export const BOTTOM_RAIL_H = 24;
export const DEFAULT_DOCK_H = 112;
export const MIN_DOCK_H = 88;

/** Tailwind size classes for icon buttons across shell chrome. */
export const CHROME_BTN = 'h-4 w-4';
export const CHROME_BTN_MD = 'h-5 w-5';
export const CHROME_ICON = 'h-2.5 w-2.5';

/** CSS `var(--chrome-bottom, …)` fallbacks — keep in sync with constants above. */
export const CSS_CHROME_BOTTOM_RAIL = `var(--chrome-bottom, ${BOTTOM_RAIL_H}px)`;
export const CSS_CHROME_BOTTOM_DOCK = `var(--chrome-bottom, ${DEFAULT_DOCK_H}px)`;
