/**
 * Node design system — the shared primitive vocabulary every canvas panel body is
 * built from. Type scale mirrors `.algo-canvas` CSS tokens (`--node-fs*`).
 *
 * Type scale:
 *   title   1rem (--node-fs-title) — panel header
 *   base    0.875rem (--node-fs)    — body / options
 *   sm      0.8125rem (--node-fs-sm) — secondary / meta
 *   xs      0.75rem (--node-fs-xs)   — labels / chips / mono hints
 */
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { getTag } from '../../../content/tags';
import { TAG_KIND_COLOR } from '../../../content/tagColors';
import { cn } from '@/lib/utils/cn';
import { TONE_TEXT, TONE_BANNER, TONE_LABEL, difficultyTone, type UiTone } from '@/design/tone';
import { Chip, EmptyState, Meter, Pill } from '@/design/components';
export { Chip, EmptyState, Meter, Pill, difficultyTone, type UiTone };
// Typography/radius tokens live in the design leaf; shared form primitives +
// VizFitBox/MiniTabs in the components leaf. Imported for internal use and
// re-exported below so `nodeui` stays the canvas-facing entry point.
import { nodeText, nodeTextWrap, nodeIconGlyph, RADIUS_CTRL, RADIUS_SHELL } from '@/design/typography';
import { Label, Hint, Btn, Field, TextInput, TextArea, INPUT_CLS } from '@/components/shared/formControls';
import { VizFitBox, MiniTabs } from '@/components/shared/vizFit';
export { VizFitBox, MiniTabs };
// Re-export the fit-measurement surface (moved to lib/canvas) for consumers.
export {
  computeVizFitLayout,
  resolveMeasureSize,
  resolveVizStageMeasureSize,
  type VizFitLayout,
} from '@/lib/canvas/vizFitMeasure';

import {
  PanelBody,
  PanelHeader,
  PanelHeaderActions,
  PanelHeaderGrip,
  PanelHeaderIcon,
  PanelHeaderMeta,
  PanelHeaderSub,
  PanelHeaderTitle,
  type HeaderDensity,
} from './nodeHeader';
import {
  PanelHeaderAction,
  PanelHeaderMenu,
  type PanelHeaderActionVariant,
  type PanelHeaderMenuItem,
} from './nodeActions';

export type { HeaderDensity, PanelHeaderActionVariant, PanelHeaderMenuItem };
export {
  PanelBody,
  PanelHeader,
  PanelHeaderAction,
  PanelHeaderActions,
  PanelHeaderGrip,
  PanelHeaderIcon,
  PanelHeaderMenu,
  PanelHeaderMeta,
  PanelHeaderSub,
  PanelHeaderTitle,
};

// Re-export the moved design tokens + form primitives (see imports above).
export { nodeText, nodeTextWrap, nodeIconGlyph, RADIUS_CTRL, RADIUS_SHELL };
export { Label, Hint, Btn, Field, TextInput, TextArea };


/* ------------------------------------------------------------------ labels */

/** Small uppercase section/field label — the one tracked-caps style used everywhere. */
/* ---------------------------------------------------------------- sections */

/**
 * A labelled block. `collapsible` adds a chevron toggle; `right` parks an action on
 * the header row. Borders auto-hairline between stacked sections.
 */
export function Section({
  title,
  right,
  children,
  collapsible = false,
  defaultOpen = true,
  bordered = true,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  bordered?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const header = title || right;
  return (
    <section className={cn(bordered && 'border-t border-edge first:border-t-0')}>
      {header && (
        <div className="flex items-center gap-1.5 py-1.5">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="nodrag flex flex-1 items-center gap-1.5 text-left transition-colors hover:opacity-80"
            >
              <ChevronDown className={cn(nodeIconGlyph, 'text-ink3 transition-transform', !open && '-rotate-90')} />
              <Label>{title}</Label>
            </button>
          ) : (
            <div className="flex-1">
              <Label>{title}</Label>
            </div>
          )}
          {right}
        </div>
      )}
      {(!collapsible || open) && <div className={cn(header && 'pb-1.5')}>{children}</div>}
    </section>
  );
}

/** Hairline divider for in-body grouping. */
export function Rule({ className }: { className?: string }) {
  return <div className={cn('my-2 h-px bg-edge', className)} />;
}

/* ------------------------------------------------------------------- stats */

/** Flash an accent tint for ~600ms whenever `dep` changes (reactive feedback). */
export function useFlash(dep: unknown) {
  const [flash, setFlash] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 600);
    return () => window.clearTimeout(t);
  }, [dep]);
  return flash;
}

/**
 * Compact key → value row. The value is mono + tabular and briefly flashes when it
 * changes, so stepping through a replay reads as alive.
 */
export function Stat({
  k,
  v,
  tone = 'default',
  mono = true,
}: {
  k: ReactNode;
  v: ReactNode;
  tone?: UiTone;
  mono?: boolean;
}) {
  const flash = useFlash(typeof v === 'string' || typeof v === 'number' ? v : undefined);
  return (
    <div className="flex items-center justify-between gap-3 py-[3px]">
      <span className={cn(nodeText.sm, 'text-ink3')}>{k}</span>
      <span
        className={cn(
          'rounded px-1 transition-colors duration-500',
          nodeText.sm,
          mono && 'font-mono tabular-nums',
          TONE_TEXT[tone],
          flash ? 'bg-accentbg' : 'bg-transparent',
        )}
      >
        {v}
      </span>
    </div>
  );
}

export function StatGrid({ children, cols = 2 }: { children: ReactNode; cols?: number }) {
  return (
    <div className="grid gap-x-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- chips */

/** Tag pill using canvas node tokens (scales with `.algo-canvas .panel-node`). */
export function NodeTagChip({ id }: { id: string }) {
  const t = getTag(id);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-panel2 px-[calc(var(--node-px,0.75rem)*0.5)] py-[calc(var(--node-py,0.5625rem)*0.35)] text-ink2 ring-1 ring-inset ring-edge transition-colors hover:bg-edge/50 hover:text-ink',
        nodeText.xs,
      )}
    >
      <span
        className="size-[calc(var(--node-icon,1.125rem)*0.4)] shrink-0 rounded-full"
        style={{ background: TAG_KIND_COLOR[t.kind] }}
      />
      {t.label}
    </span>
  );
}

/** Term + definition row for glossary and cheat-sheet entries. */
export function DefRow({
  term,
  meta,
  children,
  className,
}: {
  term: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-t border-edge py-1.5 first:border-t-0', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn(nodeText.sm, 'font-medium text-ink')}>{term}</span>
        {meta}
      </div>
      <p className={cn('mt-0.5 leading-snug text-ink2', nodeText.base)}>{children}</p>
    </div>
  );
}

/** Search field with a leading magnifier. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className={cn('pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink3', nodeIconGlyph)} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_CLS, 'pl-7')}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ option */

/**
 * Quiz-style selectable option. `state` paints the post-answer correctness colours
 * so every quiz (predict / complexity / simulate) reads identically.
 */
export function Option({
  children,
  onClick,
  disabled,
  state = 'idle',
  mono = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  state?: 'idle' | 'correct' | 'wrong' | 'dim';
  mono?: boolean;
}) {
  const cls = {
    idle: 'border-edge bg-panel2/60 text-ink2 hover:border-accent hover:text-ink',
    correct: 'border-good bg-goodbg text-good',
    wrong: 'border-bad bg-badbg text-bad',
    dim: 'border-edge text-ink3 opacity-60',
  }[state];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        `nodrag w-full border px-2.5 py-1.5 text-left ${nodeText.sm} transition-colors ${RADIUS_CTRL}`,
        mono && 'font-mono',
        cls,
      )}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- list row */

/**
 * A flush list row separated by hairlines, with hover affordance and an optional
 * `active` accent (left rule + tint). The shared shape for path / bookmarks /
 * glossary / mistakes lists.
 */
export function Row({
  active = false,
  onClick,
  className,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const cls = cn(
    'flex items-center gap-[var(--node-gap,0.5rem)] border-l-2 px-[var(--node-px,0.75rem)] py-[calc(var(--node-py,0.5625rem)*0.75)] text-left transition-colors',
    nodeText.sm,
    active ? 'border-l-accent bg-accentbg/60 text-accent' : 'border-l-transparent text-ink2',
    onClick && !active && 'hover:bg-panel2 hover:text-ink',
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cn('nodrag w-full', cls)}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/* ----------------------------------------------------------------- banner */


/** A tinted callout block — pattern pitfall/tip, diff "this step", hint cards. */
export function Banner({
  tone = 'default',
  label,
  children,
}: {
  tone?: UiTone;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(RADIUS_CTRL, 'px-2 py-1.5', TONE_BANNER[tone])}>
      {label && <div className={cn('mb-0.5', nodeText.label, TONE_LABEL[tone])}>{label}</div>}
      <div className={cn('leading-snug', nodeText.base)}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- check */

/** A checklist row — toggle box + label that strikes through when done. */
export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className={cn('nodrag flex cursor-pointer items-center gap-2 px-1.5 py-1 text-ink2 transition-colors hover:bg-panel2', nodeText.base, RADIUS_CTRL)}>
      <input type="checkbox" checked={checked} onChange={onChange} className="size-[var(--node-icon-glyph)] accent-[var(--accent)]" />
      <span className={cn('min-w-0 flex-1', checked && 'text-ink3 line-through')}>{children}</span>
    </label>
  );
}

/* ------------------------------------------------------------------- pips */

/** N-of-max progress pips — the shared "to master" / streak indicator. */
export function StreakPips({ value, max = 3 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full transition-colors"
          style={{ background: i < value ? 'var(--good)' : 'var(--border-strong)' }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------- code */

/** Mono code/snippet block with an optional filename header. */
export function Code({
  text,
  file,
  preRef,
}: {
  text: string;
  file?: string;
  preRef?: RefObject<HTMLPreElement>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-edge">
      {file && (
        <div className="flex items-center gap-1.5 border-b border-edge bg-panel2 px-2.5 py-1">
          <span className={cn('font-mono text-ink3', nodeText.xs)}>{file}</span>
        </div>
      )}
      <pre
        ref={preRef}
        className={cn(
          'nodrag ws-scroll m-0 max-h-[320px] overflow-auto bg-[var(--surface-2)] p-2.5 font-mono leading-relaxed text-ink2',
          nodeText.sm,
        )}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}

/* ----------------------------------------------------------------- sparkline */

/** Line sparkline with a dashed playhead at `index`. */
export function Spark({ series, index }: { series: number[]; index: number }) {
  const w = 200;
  const h = 28;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = hi - lo || 1;
  const pts = series.map((v, i) => {
    const x = series.length > 1 ? (i / (series.length - 1)) * w : 0;
    const y = h - 2 - ((v - lo) / span) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const cx = series.length > 1 ? (index / (series.length - 1)) * w : 0;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--team2-stroke)" strokeWidth={1.5} />
      <line x1={cx} y1={0} x2={cx} y2={h} stroke="var(--accent)" strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  );
}

/* -------------------------------------------------------------- in-node tabs */

/** Strudel-style collapsible controls footer (mono label, chevron). */
export function ControlsAccordion({
  children,
  title = 'Controls',
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  right,
  accent,
  className,
  bodyClassName,
  fill,
}: {
  children: ReactNode;
  title?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  right?: ReactNode;
  accent?: string;
  className?: string;
  bodyClassName?: string;
  /** When true, accordion grows to fill a flex column (dock columns). */
  fill?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const toggle = () => {
    const next = !open;
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };
  return (
    <div className={cn('border-t border-edge/60', fill && 'flex min-h-0 flex-1 flex-col', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn('nodrag flex w-full items-center gap-1 py-1 font-mono text-ink3 transition-colors hover:text-ink2', nodeText.xs)}
      >
        {accent && <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />}
        <span className={cn('min-w-0 flex-1 text-left', nodeTextWrap)}>{title}</span>
        {right}
        <ChevronDown className={cn('ml-auto shrink-0 transition-transform', nodeIconGlyph, !open && '-rotate-90')} />
      </button>
      {open && (
        <div className={cn('flex flex-col gap-1 pb-1', fill && 'min-h-0 flex-1 overflow-hidden', bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}

