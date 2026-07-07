/**
 * Plugin visualization kit — symmetric typography and inspector primitives.
 *
 * ESLint (optional): ban hardcoded `text-[Npx]` in `src/plugins/**` — use vizText / vizKit instead.
 * Enforced by: npm run check-plugin-typography
 */
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Frame, PluginViewProps } from '../../core/types';
import { cn } from '@/lib/utils/cn';
import { vizPad, vizText } from './vizTokens';
import { resolveRailRootIcon, resolveRailRootTone, type RailRootTone } from './vizIcons';

export { vizText, vizPad } from './vizTokens';
export { resolveRailRootIcon, resolveRailRootTone, type RailRootTone } from './vizIcons';

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

/**
 * Collapsible `<details>` block for notes / approaches / takeaways shown under an
 * inspector. Shared by the imported, prep and go-course plugin factories (each of
 * which used to hand-roll an identical block).
 */
export function CollapsibleDetails({
  title,
  body,
  size = 'tight',
  maxHeightClass = 'max-h-[200px]',
}: {
  title: string;
  body: string;
  size?: 'tight' | 'xs';
  maxHeightClass?: string;
}) {
  const t = size === 'xs' ? vizText.xs : vizText.tight;
  return (
    <details className="mt-2 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
      <summary className={cn('cursor-pointer text-ink3', t)}>{title}</summary>
      <pre
        className={cn(
          'nodrag mt-1.5 overflow-auto whitespace-pre-wrap font-mono leading-relaxed text-ink2',
          maxHeightClass,
          t,
        )}
      >
        {body}
      </pre>
    </details>
  );
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
  return <div className={cn('py-2', vizPad, vizText.sm, 'text-ink3')}>{message}</div>;
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
      <span className={cn('text-right', vizText.base, vizText.mono, 'text-ink')}>
        <VizValue value={v} />
      </span>
    </div>
  );
}

/**
 * Wraps a value that mutates frame-to-frame and gives it a brief flash the
 * instant it changes, so the eye is drawn straight to what just updated
 * instead of having to re-scan the whole rail/inspector each step.
 *
 * Only primitive-ish values (string/number/null/undefined) can be tracked
 * for change — richer ReactNode values render as-is with no flash.
 */
export function VizValue({ value, className }: { value: ReactNode; className?: string }) {
  const trackable = typeof value === 'string' || typeof value === 'number' || value == null;
  const key = trackable ? value : undefined;
  const prevRef = useRef(key);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (trackable && key !== prevRef.current) {
      prevRef.current = key;
      setPulse((n) => n + 1);
    }
  }, [trackable, key]);
  if (!trackable) return <>{value}</>;
  return (
    <span key={pulse} className={cn(pulse > 0 && 'viz-value-flash', className)}>
      {value}
    </span>
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
    <div
      className={cn('my-3 flex items-center gap-2 font-mono', vizText.expr, 'text-ink', className)}
    >
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
  minHeight,
  className,
}: {
  children: ReactNode;
  rail?: ReactNode;
  /** Override the rail width (default `--viz-rail-w`, 160px). */
  railWidth?: number | string;
  /**
   * Override the stage's minimum height (default `--viz-stage-minh`, 132px).
   * Raise it when the rail carries more content than a short main animation
   * gives it room for — the rail's scroll layer is capped at stage height.
   */
  minHeight?: number | string;
  className?: string;
}) {
  const vars: Record<string, string> = {};
  if (railWidth != null)
    vars['--viz-rail-w'] = typeof railWidth === 'number' ? `${railWidth}px` : railWidth;
  if (minHeight != null)
    vars['--viz-stage-minh'] = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
  return (
    <div
      className={cn('board-area viz-stage', className)}
      style={Object.keys(vars).length > 0 ? (vars as CSSProperties) : undefined}
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

/** Colored root icon for a rail section label — roots only, never child rows. */
function RailRootIcon({
  label,
  icon,
  tone,
}: {
  label: ReactNode;
  icon?: ReactNode;
  tone?: RailRootTone;
}) {
  const glyph = icon ?? resolveRailRootIcon(label);
  const resolvedTone = tone ?? resolveRailRootTone(label);
  return (
    <span className={cn('viz-rail-root-icon', `viz-rail-root-icon--${resolvedTone}`)}>{glyph}</span>
  );
}

/** A labelled group in the rail — root label gets a small tree icon; children indent under a guide. */
export function RailSection({
  label,
  hint,
  icon,
  iconTone,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  /** Override the auto-picked root icon (see resolveRailRootIcon). */
  icon?: ReactNode;
  /** Override the auto-picked root icon color. */
  iconTone?: RailRootTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('viz-rail-section', className)}>
      {label != null && (
        <div className={cn('viz-rail-label', vizText['2xs'])}>
          <span className="viz-rail-label-leading">
            <RailRootIcon
              label={label}
              {...(icon !== undefined ? { icon } : {})}
              {...(iconTone !== undefined ? { tone: iconTone } : {})}
            />
            <span className="viz-rail-label-text">{label}</span>
          </span>
          {hint != null && <span className="viz-rail-hint">{hint}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Indented child group under a `RailSection` — for grouping related stats
 * (e.g. a "window" section holding lo/hi/sum) so the hierarchy between a
 * section and its sub-values is visible, not just implied by order.
 */
export function RailSubsection({
  label,
  children,
  className,
}: {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('viz-subsection', className)}>
      {label != null && <div className={cn('viz-rail-hint', vizText['2xs'])}>{label}</div>}
      {children}
    </div>
  );
}

export interface TreeNode {
  /** Left-hand key/label for this row. */
  k: ReactNode;
  /** Right-hand value — flashes briefly when it changes between frames. */
  v: ReactNode;
  tone?: 'accent' | 'good' | 'bad' | 'warn';
  /** Nested rows, indented one level further with a guide line. */
  children?: readonly TreeNode[];
}

function TreeRows({ nodes, depth }: { nodes: readonly TreeNode[]; depth: number }) {
  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={i}>
          <div
            className={cn('viz-tree-row', depth === 0 && 'viz-tree-row--root')}
            style={{ '--vt-depth': depth } as CSSProperties}
          >
            {depth === 0 && <RailRootIcon label={node.k} />}
            <span className={cn('viz-tree-k', vizText['2xs'])}>{node.k}</span>
            <span
              className={cn('viz-tree-v', vizText.xs, node.tone && `viz-rail-stat-v--${node.tone}`)}
            >
              <VizValue value={node.v} />
            </span>
          </div>
          {node.children && node.children.length > 0 && (
            <TreeRows nodes={node.children} depth={depth + 1} />
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Indented, multi-row tree for structured state that a single flat line
 * can't convey intuitively — maps (`seen`), path stacks, nested groups.
 * Each level nests with a small guide line, like a file tree.
 */
export function VizTree({ nodes, className }: { nodes: readonly TreeNode[]; className?: string }) {
  if (nodes.length === 0) return null;
  return (
    <div className={cn('viz-tree', className)}>
      <TreeRows nodes={nodes} depth={0} />
    </div>
  );
}

export type RailStackItem =
  string | number | { label: ReactNode; tone?: 'accent' | 'good' | 'bad' | 'warn' };

/**
 * Vertical stack / queue column rendered as indented tree rows under a
 * labelled root section. Top-of-collection is drawn first; overflow scrolls
 * inside the rail without clipping or rescaling the main animation.
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
    <RailSection label={label} {...(className !== undefined ? { className } : {})}>
      <div className="viz-tree">
        {topLabel != null && items.length > 0 && (
          <div
            className={cn('viz-tree-hint viz-rail-edge', vizText['2xs'])}
            style={{ '--vt-depth': 1 } as CSSProperties}
          >
            {topLabel}
          </div>
        )}
        {ordered.length === 0 ? (
          <div className="viz-tree-row" style={{ '--vt-depth': 1 } as CSSProperties}>
            <span className={cn('viz-tree-v font-mono', vizText.xs, 'text-ink3')}>{empty}</span>
          </div>
        ) : (
          ordered.map((raw, idx) => {
            const isTop = idx === 0;
            const isBottom = idx === ordered.length - 1;
            const live =
              (highlightEnd === 'top' && isTop) || (highlightEnd === 'bottom' && isBottom);
            const item = typeof raw === 'object' ? raw : { label: raw, tone: undefined };
            const tone = item.tone ?? (live ? 'accent' : undefined);
            // Stable key from the base so pushing a new top only mounts the new row.
            const key = ordered.length - 1 - idx;
            return (
              <div key={key} className="viz-tree-row" style={{ '--vt-depth': 1 } as CSSProperties}>
                <span
                  className={cn(
                    'viz-tree-v font-mono',
                    vizText.xs,
                    tone && `viz-rail-stat-v--${tone}`,
                  )}
                >
                  <VizValue value={item.label} />
                </span>
              </div>
            );
          })
        )}
        {bottomLabel != null && items.length > 0 && (
          <div
            className={cn('viz-tree-hint viz-rail-edge viz-rail-edge--bottom', vizText['2xs'])}
            style={{ '--vt-depth': 1 } as CSSProperties}
          >
            {bottomLabel}
          </div>
        )}
      </div>
    </RailSection>
  );
}

export interface RailStep {
  id: string;
  label: ReactNode;
}

type RailStepState = 'done' | 'current' | 'pending';

/** Dot / ping / check marker for one RailSteps row. */
function RailStepMarker({ state }: { state: RailStepState }) {
  // Wrapper span caps the svg — bare svgs get width:100% from `.board-area svg`.
  return (
    <span className="viz-rail-step-icon">
      <svg viewBox="0 0 12 12" aria-hidden="true">
        {state === 'current' && <circle className="viz-rail-step-ping" cx="6" cy="6" r="4" />}
        <circle className="viz-rail-step-core" cx="6" cy="6" r={state === 'pending' ? 3 : 4.5} />
        {state === 'done' && <path className="viz-rail-step-check" d="M4 6.2 5.4 7.6 8.1 4.5" />}
      </svg>
    </span>
  );
}

/**
 * Top-down list of algorithm stages for the rail — a mini roadmap showing
 * which phase the current frame is in (done → current → upcoming). Pair with
 * a state that carries a `phase` discriminant.
 */
export function RailSteps({
  label = 'phase',
  steps,
  activeId,
  className,
}: {
  label?: ReactNode;
  steps: readonly RailStep[];
  activeId: string | null | undefined;
  className?: string;
}) {
  const activeIdx = steps.findIndex((s) => s.id === activeId);
  return (
    <RailSection label={label} {...(className !== undefined ? { className } : {})}>
      <div className="viz-rail-steps">
        {steps.map((step, idx) => {
          const state: RailStepState =
            activeIdx < 0
              ? 'pending'
              : idx < activeIdx
                ? 'done'
                : idx === activeIdx
                  ? 'current'
                  : 'pending';
          return (
            <div
              key={step.id}
              className={cn(
                'viz-rail-step',
                vizText.xs,
                state !== 'pending' && `viz-rail-step--${state}`,
              )}
              title={typeof step.label === 'string' ? step.label : undefined}
            >
              <RailStepMarker state={state} />
              <span className="viz-rail-step-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </RailSection>
  );
}

interface StatKVProps {
  k: ReactNode;
  v: ReactNode;
  /** Optional tiny glyph before the label (see vizIcons). */
  icon?: ReactNode;
  tone?: 'accent' | 'good' | 'bad' | 'warn';
  /**
   * Widest value this stat can render, e.g. `"7 · 0b111"`. Reserves that
   * width so a value that grows mid-animation ("—" → "3 → X") never changes
   * the board's measured size.
   */
  reserve?: string;
  /**
   * Let the value wrap onto multiple lines with a hanging indent instead of
   * ellipsizing — for structured values (maps, paths, running answers) that
   * need more than one line to read intuitively.
   */
  wrap?: boolean;
}

/** Accepts explicit `undefined` for optional fields (exactOptionalPropertyTypes). */
export type StatKVInput = {
  k: ReactNode;
  v: ReactNode;
  icon?: ReactNode | undefined;
  tone?: StatKVProps['tone'] | undefined;
  reserve?: string | undefined;
  wrap?: boolean | undefined;
};

function toStatKVProps(props: StatKVInput): StatKVProps {
  const { k, v, icon, tone, reserve, wrap } = props;
  const out: StatKVProps = { k, v };
  if (icon !== undefined) out.icon = icon;
  if (tone !== undefined) out.tone = tone;
  if (reserve !== undefined) out.reserve = reserve;
  if (wrap !== undefined) out.wrap = wrap;
  return out;
}

/** Shared label / icon / mono-value anatomy for RailStat and VizStat. */
function StatKV({ k, v, icon, tone, reserve }: StatKVProps) {
  return (
    <>
      <span className={cn('viz-rail-stat-k', vizText['2xs'])}>
        {icon != null && (
          <span className={cn('viz-stat-icon', tone && `viz-rail-stat-v--${tone}`)}>{icon}</span>
        )}
        {k}
      </span>
      <span
        className={cn('viz-rail-stat-v font-mono', vizText.sm, tone && `viz-rail-stat-v--${tone}`)}
      >
        <VizValue value={v} />
      </span>
      {reserve != null && (
        <span aria-hidden className={cn('viz-stat-reserve font-mono', vizText.sm)}>
          {reserve}
        </span>
      )}
    </>
  );
}

/** Compact key / value stat for the rail — one indented tree row. */
export function RailStat(props: StatKVInput) {
  const clean = toStatKVProps(props);
  return (
    <div
      className={cn('viz-tree-row', clean.wrap && 'viz-rail-stat--wrap')}
      style={{ '--vt-depth': 1 } as CSSProperties}
    >
      <span className={cn('viz-tree-k', vizText['2xs'])}>
        {clean.icon != null && (
          <span className={cn('viz-stat-icon', clean.tone && `viz-rail-stat-v--${clean.tone}`)}>
            {clean.icon}
          </span>
        )}
        {clean.k}
      </span>
      <span
        className={cn(
          'viz-tree-v font-mono',
          vizText.sm,
          clean.tone && `viz-rail-stat-v--${clean.tone}`,
        )}
      >
        <VizValue value={clean.v} />
      </span>
      {clean.reserve != null && (
        <span aria-hidden className={cn('viz-stat-reserve font-mono', vizText.sm)}>
          {clean.reserve}
        </span>
      )}
    </div>
  );
}

/**
 * Horizontal labelled-stat strip pinned under the main animation. Keep every
 * cell mounted on every frame (use '—' placeholders) so the strip never
 * changes the board's measured size between frames.
 */
export function VizStatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('viz-statstrip', className)}>{children}</div>;
}

/** Cluster related VizStat cells with a subtle divider between groups. */
export function VizStatGroup({ children }: { children: ReactNode }) {
  return <div className="viz-statstrip-group">{children}</div>;
}

/** One labelled cell in a VizStatStrip. */
export function VizStat(props: StatKVInput) {
  const clean = toStatKVProps(props);
  return (
    <div className={cn('viz-statstrip-item', clean.wrap && 'viz-rail-stat--wrap')}>
      <StatKV {...clean} />
    </div>
  );
}

/** Groups RailStats as indented tree rows under one section label. */
export function RailGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <RailSection label={label}>
      <div className="viz-tree">{children}</div>
    </RailSection>
  );
}

/** A single emphasized result row for the rail (the running / final answer). */
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
    <RailSection label={label} iconTone={tone}>
      <div className="viz-tree">
        <div
          className={cn('viz-tree-row viz-rail-result-row', `viz-rail-result-row--${tone}`)}
          style={{ '--vt-depth': 1 } as CSSProperties}
        >
          <span className={cn('viz-tree-v font-mono', vizText.base, `viz-rail-stat-v--${tone}`)}>
            {value}
          </span>
        </div>
      </div>
    </RailSection>
  );
}

// Back-compat aliases — prefer VizStatRow / VizInspector in new code.
export { VizStatRow as InspectorRow, VizInspector as VarGrid };
