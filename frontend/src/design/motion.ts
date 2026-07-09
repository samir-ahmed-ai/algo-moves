/**
 * Motion design tokens — the single source of truth for animation timing.
 *
 * Durations are milliseconds; curves are CSS `cubic-bezier` strings. The curve
 * names mirror `transitionTimingFunction` in tailwind.config.js (so `ease-*`
 * utilities and JS-driven animation stay in sync), plus `flip` for the FLIP
 * board morph. Consume these from TS runtime code (FlipFrame, vizFit, WAAPI
 * effects); use the `ease-*` / `duration-*` Tailwind utilities in JSX.
 */
export const DURATION = {
  /** Micro press / snap — barely perceptible. */
  instant: 90,
  /** Hover, toggle, small enter/exit. */
  quick: 140,
  /** Standard surface transition (overlays, panels). */
  base: 200,
  /** Deliberate, large-surface movement. */
  slow: 320,
} as const;

export const EASING = {
  /** Decelerate-heavy — entrances and productive UI. */
  productive: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Crisp settle — precise, controlled motion. */
  precise: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** Symmetric ease-in-out — ambient / looping motion. */
  soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** FLIP board morph curve. */
  flip: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
} as const;

export type DurationToken = keyof typeof DURATION;
export type EasingToken = keyof typeof EASING;
