/** Shared layout constants for canvas chrome (rails, HUD). */
export const BOTTOM_RAIL_H = 24;

/** Tailwind size classes for icon buttons across shell chrome. */
export const CHROME_BTN = 'h-4 w-4';
export const CHROME_BTN_MD = 'h-5 w-5';
export const CHROME_ICON = 'h-2.5 w-2.5';

/** CSS `var(--chrome-bottom, …)` fallback — keep in sync with workspace chrome sync. */
export const CSS_CHROME_BOTTOM_RAIL = `var(--chrome-bottom, ${BOTTOM_RAIL_H}px)`;
