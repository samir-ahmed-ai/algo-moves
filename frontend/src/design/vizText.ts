/**
 * Plugin viz typography design tokens — pure class-name strings mirroring the
 * canvas `--node-fs*` / `--viz-*` CSS variables. Homed in the design leaf;
 * plugins/_shared/vizTokens re-exports them for plugin views.
 */
export const vizText = {
  base: 'text-[length:var(--node-fs,14px)] leading-[var(--lh,1.4)]',
  sm: 'text-[length:var(--node-fs-sm,13px)] leading-[var(--lh-snug,1.35)]',
  xs: 'text-[length:var(--node-fs-xs,12px)] leading-[var(--lh-snug,1.35)]',
  '2xs': 'text-[length:var(--node-fs-2xs,9px)] leading-[var(--lh-tight,1.25)]',
  tight: 'text-[length:var(--node-fs-tight,11px)] leading-[var(--lh-tight,1.25)]',
  display: 'text-[length:var(--viz-display,30px)] leading-[var(--lh-tight,1.25)]',
  expr: 'text-[length:var(--viz-expr,24px)] leading-[var(--lh-tight,1.25)]',
  cell: 'text-[length:var(--viz-cell,13px)] leading-[var(--lh-snug,1.35)]',
  mono: 'font-mono tabular-nums',
} as const;

/** Symmetric horizontal inset for viz board content. */
export const vizPad = 'px-[var(--node-px,10px)]';
