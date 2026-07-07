/**
 * Canvas node typography + radius design tokens. These are pure class-name
 * strings mapping to the `--node-fs*` / `--radius` CSS variables (defined in the
 * generated theme CSS). They live in the design leaf so every layer — canvas
 * chrome, shared components, effects, plugins — can consume them without
 * importing upward into shell/canvas. `nodeui` re-exports them for back-compat.
 */

/** Shared canvas node type scale — mirrors `--node-fs*` in theme.css. */
export const nodeText = {
  base: 'node-text node-text--base text-[length:var(--node-fs,0.875rem)] leading-[var(--lh,1.4)]',
  sm: 'node-text node-text--sm text-[length:var(--node-fs-sm,0.8125rem)] leading-[var(--lh-snug,1.35)]',
  xs: 'node-text node-text--xs text-[length:var(--node-fs-xs,0.75rem)] leading-[var(--lh-snug,1.35)]',
  '2xs':
    'node-text node-text--2xs text-[length:var(--node-fs-2xs,0.5625rem)] leading-[var(--lh-tight,1.25)]',
  tight:
    'node-text node-text--tight text-[length:var(--node-fs-tight,0.6875rem)] leading-[var(--lh-tight,1.25)]',
  title:
    'node-text node-text--title text-[length:var(--node-fs-title,1rem)] leading-[var(--lh-tight,1.25)]',
  label:
    'node-text node-text--label text-[length:var(--node-fs-xs,0.75rem)] font-medium uppercase tracking-[0.05em] leading-[var(--lh-tight,1.25)]',
} as const;

/** Wrap prose/labels inside bounded node width — use on text only, not chrome. */
export const nodeTextWrap = 'node-text-wrap min-w-0 break-words [overflow-wrap:anywhere]';

/** Inner SVG sizing for node header/body icons — scales with `--node-icon`. */
export const nodeIconGlyph = 'node-icon-glyph size-[var(--node-icon-glyph)]';

/** Theme-aware border radii for controls and containers. */
export const RADIUS_CTRL = 'radius-ctrl rounded-[calc(var(--radius)-2px)]';
export const RADIUS_SHELL = 'radius-shell rounded-[var(--radius)]';
export const RADIUS_PILL = 'radius-pill rounded-full';

export type NodeTextScale = keyof typeof nodeText;
