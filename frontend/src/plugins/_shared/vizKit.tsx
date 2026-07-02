/**
 * Plugin visualization kit — symmetric typography and inspector primitives.
 *
 * ESLint (optional): ban hardcoded `text-[Npx]` in `src/plugins/**` — use vizText / vizKit instead.
 * Enforced by: npm run check-plugin-typography
 */
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { Frame, InspectorProps, PluginViewProps } from '../../core/types';
import { cn } from '@/lib/utils/cn';
import { vizPad, vizText } from './vizTokens';

export { vizText, vizPad } from './vizTokens';

/** Standard plugin View props — use for consistent View signatures. */
export type VizBoardProps<S> = PluginViewProps<S>;

/** Caption strip from the current frame move. */
export function captionFromMove(frame: Frame | null | undefined): string {
  return frame?.move.caption ?? '';
}

/** Typed frame state with null guard for Inspector bodies. */
export function useFrameState<S>(frame: Frame<S> | null | undefined): S | null {
  return frame?.state ?? null;
}

/** Build a standard Inspector from state rows. */
export function makeInspector<S>(
  rows: (state: S) => ReactNode,
): ComponentType<InspectorProps<S>> {
  return function GeneratedInspector({ frame }: InspectorProps<S>) {
    if (!frame) return <VizEmpty />;
    return <VizInspector>{rows(frame.state)}</VizInspector>;
  };
}

/** Muted helper line under viz boards. */
export function VizHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(vizText.sm, 'leading-snug text-ink3', className)}>{children}</p>;
}

/** Primary caption under the board header. */
export function VizCaption({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(vizText.base, 'leading-snug text-ink2', className)}>{children}</p>;
}

/** Inspector empty state. */
export function VizEmpty({ message = 'No frame.' }: { message?: string }) {
  return (
    <div className={cn('py-2', vizPad, vizText.sm, 'text-ink3')}>{message}</div>
  );
}

/** Padded inspector wrapper — symmetric with canvas node inset. */
export function VizInspector({ children, empty }: { children?: ReactNode; empty?: string }) {
  if (!children) return <VizEmpty message={empty ?? 'No frame.'} />;
  return <div className={cn('py-2', vizPad)}>{children}</div>;
}

/** Key/value row for numeric or string state. */
export function VizStatRow({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className={cn(vizText.sm, 'text-ink3')}>{k}</span>
      <span className={cn('text-right', vizText.base, vizText.mono, 'text-ink')}>{v}</span>
    </div>
  );
}

/** Backtracking path display (parentheses, binary strings, letter combos). */
export function PathDisplay({
  value,
  tracking = 'tracking-wide',
  className,
}: {
  value: string;
  tracking?: string;
  className?: string;
}) {
  return (
    <div className={cn('my-3 font-mono', vizText.display, tracking, 'text-ink', className)}>
      {value || '·'}
    </div>
  );
}

/** Letter / digit cell in a grid (combination strings, strobogrammatic). */
export function CharCell({
  children,
  active = false,
  className,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    'flex h-9 w-9 items-center justify-center rounded border font-mono',
    vizText.cell,
    active ? 'border-accent bg-accentbg text-accent' : 'border-edge bg-panel2 text-ink',
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cn('nodrag', cls)}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/** DP table header cell. */
export function DpHeader({ children, width = 40 }: { children: ReactNode; width?: number }) {
  return (
    <div
      className={cn('flex h-[22px] items-center justify-center font-mono', vizText.sm, 'text-ink3')}
      style={{ width }}
    >
      {children}
    </div>
  );
}

/** DP table body cell wrapper. */
export function DpCell({
  children,
  width = 40,
  height = 40,
  tone = '',
}: {
  children: ReactNode;
  width?: number;
  height?: number;
  tone?: string;
}) {
  return (
    <div
      className={cn('flex items-center justify-center font-mono', vizText.sm, tone)}
      style={{ width, height }}
    >
      {children}
    </div>
  );
}

/** Large expression / operator token row. */
export function ExprToken({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('my-3 flex items-center gap-2 font-mono', vizText.expr, 'text-ink', className)}>
      {children}
    </div>
  );
}

/** Standard board shell with symmetric padding. */
export function VizBoard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('board-area', vizPad, className)}>{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Staged board: a stable main animation on the left, a subtle side
 * "state rail" on the right for the values that mutate frame-to-frame
 * (stacks, queues, sets, counters, accumulators, the running answer).
 *
 * Why: `VizFitBox` re-measures the board every frame, so any state that
 * grows/shrinks *below* the animation changes the board's natural size
 * and makes the whole board rescale ("jump"). The rail is decoupled from
 * the row height (see `.viz-rail` in theme.css), so the main animation
 * keeps a constant footprint no matter how the state evolves.
 * ------------------------------------------------------------------ */

/** Top-level board: stable main region + optional right-hand state rail. */
export function VizStage({
  children,
  rail,
  railWidth,
  className,
}: {
  children: ReactNode;
  rail?: ReactNode;
  /** Override the rail width (default `--viz-rail-w`, 128px). */
  railWidth?: number | string;
  className?: string;
}) {
  return (
    <div
      className={cn('board-area viz-stage', className)}
      style={railWidth != null ? ({ ['--viz-rail-w']: typeof railWidth === 'number' ? `${railWidth}px` : railWidth } as CSSProperties) : undefined}
    >
      <div className="viz-stage-main">{children}</div>
      {rail != null && (
        <div className="viz-rail nodrag">
          <div className="viz-rail-scroll">{rail}</div>
        </div>
      )}
    </div>
  );
}

/** A labelled group in the rail — small uppercase label over its body. */
export function RailSection({
  label,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('viz-rail-section', className)}>
      {label != null && (
        <div className={cn('viz-rail-label', vizText['2xs'])}>
          <span className="truncate">{label}</span>
          {hint != null && <span className="viz-rail-hint">{hint}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export type RailStackItem = string | number | { label: ReactNode; tone?: 'accent' | 'good' | 'bad' | 'warn' };

/**
 * Animated vertical stack / queue column — the "column that keeps changing".
 * Top of the collection is drawn at the top and grows downward; new entries
 * pop in subtly. Overflow clips at the bottom with a fade so the active end
 * stays visible and the rail never changes the board's height.
 */
export function RailStack({
  label,
  items,
  empty = '∅',
  topLabel,
  bottomLabel,
  highlightEnd = 'top',
  className,
}: {
  label?: ReactNode;
  items: readonly RailStackItem[];
  empty?: ReactNode;
  /** Small tag next to the leading edge (e.g. "top", "front"). */
  topLabel?: ReactNode;
  bottomLabel?: ReactNode;
  /** Which end is the "live" end to accent — 'top' (LIFO) or 'bottom'. */
  highlightEnd?: 'top' | 'bottom' | 'none';
  className?: string;
}) {
  // Render top-of-collection first (visually on top), base last.
  const ordered = items.slice().reverse();
  return (
    <RailSection label={label} className={className}>
      {topLabel != null && items.length > 0 && (
        <div className={cn('viz-rail-edge', vizText['2xs'])}>{topLabel}</div>
      )}
      <div className="viz-rail-stack">
        {ordered.length === 0 ? (
          <div className={cn('viz-rail-empty font-mono', vizText.xs)}>{empty}</div>
        ) : (
          ordered.map((raw, idx) => {
            const isTop = idx === 0;
            const isBottom = idx === ordered.length - 1;
            const live = (highlightEnd === 'top' && isTop) || (highlightEnd === 'bottom' && isBottom);
            const item = typeof raw === 'object' ? raw : { label: raw, tone: undefined };
            const tone = item.tone ?? (live ? 'accent' : undefined);
            // Stable key from the base so pushing a new top only mounts the new chip.
            const key = ordered.length - 1 - idx;
            return (
              <div
                key={key}
                className={cn('viz-rail-chip font-mono', vizText.xs, tone && `viz-rail-chip--${tone}`)}
              >
                {item.label}
              </div>
            );
          })
        )}
      </div>
      {bottomLabel != null && items.length > 0 && (
        <div className={cn('viz-rail-edge viz-rail-edge--bottom', vizText['2xs'])}>{bottomLabel}</div>
      )}
    </RailSection>
  );
}

/** Compact key / value stat for the rail (label above, mono value below). */
export function RailStat({
  k,
  v,
  tone,
}: {
  k: ReactNode;
  v: ReactNode;
  tone?: 'accent' | 'good' | 'bad' | 'warn';
}) {
  return (
    <div className="viz-rail-stat">
      <span className={cn('viz-rail-stat-k', vizText['2xs'])}>{k}</span>
      <span className={cn('viz-rail-stat-v font-mono', vizText.sm, tone && `viz-rail-stat-v--${tone}`)}>{v}</span>
    </div>
  );
}

/** Groups RailStats with subtle dividers. */
export function RailGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <RailSection label={label}>
      <div className="viz-rail-group">{children}</div>
    </RailSection>
  );
}

/** A single emphasized result chip for the rail (the running / final answer). */
export function RailResult({
  label = 'result',
  value,
  tone = 'good',
}: {
  label?: ReactNode;
  value: ReactNode;
  tone?: 'accent' | 'good' | 'bad' | 'warn';
}) {
  return (
    <div className={cn('viz-rail-result', `viz-rail-result--${tone}`)}>
      <span className={cn('viz-rail-stat-k', vizText['2xs'])}>{label}</span>
      <span className={cn('font-mono', vizText.base)}>{value}</span>
    </div>
  );
}

// Back-compat aliases — prefer VizStatRow / VizInspector in new code.
export { VizStatRow as InspectorRow, VizInspector as VarGrid };
