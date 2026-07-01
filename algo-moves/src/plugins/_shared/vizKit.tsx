/**
 * Plugin visualization kit — symmetric typography and inspector primitives.
 *
 * ESLint (optional): ban hardcoded `text-[Npx]` in `src/plugins/**` — use vizText / vizKit instead.
 * Enforced by: npm run check-plugin-typography
 */
import type { ComponentType, ReactNode } from 'react';
import type { Frame, InspectorProps, PluginViewProps } from '../../core/types';
import { cn } from '../../lib/cn';
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

// Back-compat aliases — prefer VizStatRow / VizInspector in new code.
export { VizStatRow as InspectorRow, VizInspector as VarGrid };
