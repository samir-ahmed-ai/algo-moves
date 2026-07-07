/**
 * Plugin viz typography design tokens — pure class-name strings mirroring the
 * canvas `--node-fs*` / `--viz-*` CSS variables. Homed in the design leaf;
 * plugins/_shared/vizTokens re-exports them for plugin views.
 */
export const vizText = {
  base: 'viz-text viz-text--base text-[length:var(--node-fs,14px)] leading-[var(--lh,1.4)]',
  sm: 'viz-text viz-text--sm text-[length:var(--node-fs-sm,13px)] leading-[var(--lh-snug,1.35)]',
  xs: 'viz-text viz-text--xs text-[length:var(--node-fs-xs,12px)] leading-[var(--lh-snug,1.35)]',
  '2xs':
    'viz-text viz-text--2xs text-[length:var(--node-fs-2xs,9px)] leading-[var(--lh-tight,1.25)]',
  tight:
    'viz-text viz-text--tight text-[length:var(--node-fs-tight,11px)] leading-[var(--lh-tight,1.25)]',
  display:
    'viz-text viz-text--display text-[length:var(--viz-display,30px)] leading-[var(--lh-tight,1.25)]',
  expr: 'viz-text viz-text--expr text-[length:var(--viz-expr,24px)] leading-[var(--lh-tight,1.25)]',
  cell: 'viz-text viz-text--cell text-[length:var(--viz-cell,13px)] leading-[var(--lh-snug,1.35)]',
  mono: 'viz-text-mono font-mono tabular-nums',
} as const;

/** Symmetric horizontal inset for viz board content. */
export const vizPad = 'viz-pad px-[var(--node-px,10px)]';
