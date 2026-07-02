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
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, GripVertical, MoreVertical, Search } from 'lucide-react';
import { getTag } from '../../content/tags';
import { TAG_KIND_COLOR } from '../../content/tagColors';
import { cn } from '@/lib/utils/cn';
import {
  VIZ_FIT_PAD,
  VIZ_MEASURE_SELECTOR,
  computeVizFitLayout,
  resolveMeasureSize,
} from './vizFitMeasure';
import { TONE_TEXT, TONE_BAR, TONE_CHIP, TONE_BANNER, TONE_LABEL } from './nodeUiTones';
// Re-export the fit-measurement surface so `nodeui` stays the public entry point
// (consumers + nodeui.test.ts import these from here).
export {
  computeVizFitLayout,
  resolveMeasureSize,
  resolveVizStageMeasureSize,
  type VizFitLayout,
} from './vizFitMeasure';

export type HeaderDensity = 'compact' | 'ultra' | 'spacious';

export type UiTone = 'default' | 'accent' | 'good' | 'bad' | 'muted';

/** Shared canvas node type scale — mirrors `--node-fs*` in theme.css. */
export const nodeText = {
  base: 'text-[length:var(--node-fs,0.875rem)] leading-[var(--lh,1.4)]',
  sm: 'text-[length:var(--node-fs-sm,0.8125rem)] leading-[var(--lh-snug,1.35)]',
  xs: 'text-[length:var(--node-fs-xs,0.75rem)] leading-[var(--lh-snug,1.35)]',
  '2xs': 'text-[length:var(--node-fs-2xs,0.5625rem)] leading-[var(--lh-tight,1.25)]',
  tight: 'text-[length:var(--node-fs-tight,0.6875rem)] leading-[var(--lh-tight,1.25)]',
  title: 'text-[length:var(--node-fs-title,1rem)] leading-[var(--lh-tight,1.25)]',
  label: 'text-[length:var(--node-fs-xs,0.75rem)] font-medium uppercase tracking-[0.05em] leading-[var(--lh-tight,1.25)]',
} as const;

/** Wrap prose/labels inside bounded node width — use on text only, not chrome. */
export const nodeTextWrap = 'min-w-0 break-words [overflow-wrap:anywhere]';

/** Inner SVG sizing for node header/body icons — scales with `--node-icon`. */
export const nodeIconGlyph = 'size-[var(--node-icon-glyph)]';

/** Theme-aware border radii for controls and containers. */
export const RADIUS_CTRL = 'rounded-[calc(var(--radius)-2px)]';
export const RADIUS_SHELL = 'rounded-[var(--radius)]';

/** Maps a difficulty label to the shared chip tone vocabulary. */
export function difficultyTone(d?: string): UiTone {
  const k = (d ?? '').toLowerCase();
  if (k === 'easy') return 'good';
  if (k === 'hard') return 'bad';
  return 'accent';
}


/* ------------------------------------------------------------------ labels */

/** Small uppercase section/field label — the one tracked-caps style used everywhere. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn(nodeText.label, 'text-ink3', className)}>
      {children}
    </span>
  );
}

/** Muted one-line helper copy. */
export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(nodeText.sm, 'leading-snug text-ink3', className)}>{children}</p>;
}

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

/* ------------------------------------------------------------------ meters */


/** Animated progress bar. */
export function Meter({
  value,
  max = 1,
  tone = 'good',
  height = 6,
}: {
  value: number;
  max?: number;
  tone?: UiTone;
  height?: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  return (
    <div className="w-full overflow-hidden rounded-full bg-panel2" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: TONE_BAR[tone] }}
      />
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
        'inline-flex items-center gap-1 rounded bg-panel2 px-[calc(var(--node-px,0.75rem)*0.5)] py-[calc(var(--node-py,0.5625rem)*0.35)] text-ink2',
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

export function Chip({
  children,
  tone = 'default',
  mono = false,
  className,
}: {
  children: ReactNode;
  tone?: UiTone;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-[calc(var(--node-px,0.75rem)*0.5)] py-[calc(var(--node-py,0.5625rem)*0.35)] font-medium leading-none',
        nodeText.xs,
        mono && 'font-mono tabular-nums',
        TONE_CHIP[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- buttons */

type BtnVariant = 'primary' | 'good' | 'ghost' | 'quiet' | 'danger';
type BtnSize = 'xs' | 'sm';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  good: 'bg-good text-white hover:opacity-90',
  ghost: 'bg-panel2/50 text-ink2 hover:bg-panel2 hover:text-ink',
  quiet: 'text-ink3 hover:bg-panel2 hover:text-ink',
  danger: 'text-bad hover:bg-badbg',
};

const BTN_SIZE: Record<BtnSize, string> = {
  xs: cn('px-2 py-1', nodeText.xs),
  sm: cn('px-2.5 py-1.5', nodeText.sm),
};

/** The single button vocabulary — every node button is one of these. */
export function Btn({
  variant = 'ghost',
  size = 'sm',
  icon,
  children,
  className,
  ...rest
}: {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'nodrag inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        RADIUS_CTRL,
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------ form controls */

export function Field({
  label,
  hint,
  children,
  dense,
  className,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  dense?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col', dense ? 'gap-0.5' : 'gap-1', className)}>
      {label && <Label className={dense ? '!text-[length:var(--node-fs-xs,12px)]' : undefined}>{label}</Label>}
      {children}
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
}

const INPUT_CLS =
  `nodrag w-full border border-edge bg-panel2 px-2 py-1.5 ${nodeText.sm} text-ink outline-none transition-colors placeholder:text-ink3 focus:border-accent ${RADIUS_CTRL}`;

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(INPUT_CLS, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(INPUT_CLS, 'min-h-[4.5rem] resize-none leading-relaxed', props.className)}
    />
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

/* ------------------------------------------------------------- empty states */

/** Designed empty / placeholder state — replaces bare gray sentences. */
export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-5 text-center">
      {icon && (
        <span className="grid size-[calc(var(--node-icon,1.125rem)*1.6)] place-items-center rounded-full bg-panel2 text-ink3 [&>*]:size-[var(--node-icon-glyph)]">
          {icon}
        </span>
      )}
      <p className={cn(nodeText.sm, 'font-medium text-ink2')}>{title}</p>
      {hint && <p className={cn('max-w-[34ch] leading-snug text-ink3', nodeText.sm)}>{hint}</p>}
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

/* -------------------------------------------------------------------- pill */

/** Small mono counter / index chip (used for counts and list indices). */
export function Pill({
  children,
  tone = 'muted',
  active = false,
  onClick,
  title,
}: {
  children: ReactNode;
  tone?: UiTone;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const cls = active ? 'bg-accentbg text-accent' : TONE_CHIP[tone];
  const base = cn(
    'inline-flex min-w-[1.4rem] items-center justify-center px-1.5 py-0.5 font-mono tabular-nums leading-none',
    nodeText.xs,
    RADIUS_CTRL,
  );
  return onClick ? (
    <button type="button" onClick={onClick} title={title} className={cn('nodrag transition-colors', base, cls, 'hover:opacity-80')}>
      {children}
    </button>
  ) : (
    <span className={cn(base, cls)} title={title}>
      {children}
    </span>
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

/* ----------------------------------------------------------- panel headers */

const HEADER_PAD: Record<HeaderDensity, string> = {
  compact: 'px-0 py-[var(--node-py,0.5625rem)] gap-[var(--node-gap,0.5rem)]',
  ultra: 'px-0 py-[var(--node-py,0.5625rem)] gap-[var(--node-gap,0.5rem)]',
  spacious: 'px-0 py-[var(--node-py,0.5625rem)] gap-[var(--node-gap,0.5rem)]',
};

const HEADER_ICON: Record<HeaderDensity, string> = {
  compact: 'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] shrink-0 place-items-center [&>*]:size-[var(--node-icon,1.125rem)]',
  ultra: 'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] shrink-0 place-items-center [&>*]:size-[var(--node-icon,1.125rem)]',
  spacious: 'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)] shrink-0 place-items-center [&>*]:size-[var(--node-icon,1.125rem)]',
};

const HEADER_TITLE: Record<HeaderDensity, string> = {
  compact: nodeText.title,
  ultra: nodeText.title,
  spacious: nodeText.title,
};

/** Shared shell for canvas panel node headers. */
export function PanelHeader({
  children,
  collapsed,
  locked,
  density = 'compact',
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  collapsed?: boolean;
  locked?: boolean;
  density?: HeaderDensity;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex shrink-0 select-none items-center justify-between gap-2',
        HEADER_PAD[density],
        collapsed && 'py-0.5',
        locked && 'opacity-90',
        className,
      )}
    >
      {children}
    </header>
  );
}

/** Drag affordance — grab cursor only on grip + title zone. */
export function PanelHeaderGrip({ density = 'compact' }: { density?: HeaderDensity }) {
  return (
    <span
      className={cn(
        'grid shrink-0 cursor-grab place-items-center text-ink3 active:cursor-grabbing',
        density === 'spacious'
          ? 'h-[calc(var(--node-icon,1.125rem)*1.1)] w-[calc(var(--node-icon,1.125rem)*0.65)]'
          : 'h-[var(--node-icon,1.125rem)] w-[calc(var(--node-icon,1.125rem)*0.65)]',
      )}
      aria-hidden
    >
      <GripVertical
        className={cn(
          density === 'spacious'
            ? 'h-[calc(var(--node-icon,1.125rem)*1.1)] w-[calc(var(--node-icon,1.125rem)*1.1)]'
            : 'h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)]',
        )}
      />
    </span>
  );
}

export function PanelHeaderIcon({
  color,
  density = 'compact',
  children,
}: {
  color?: string;
  density?: HeaderDensity;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(HEADER_ICON[density], color ? undefined : 'text-ink2')}
      style={color ? { color } : undefined}
    >
      {children}
    </span>
  );
}

export function PanelHeaderTitle({
  children,
  density = 'compact',
  className,
}: {
  children: ReactNode;
  density?: HeaderDensity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'min-w-0 flex-1 cursor-grab font-semibold text-ink active:cursor-grabbing',
        nodeTextWrap,
        HEADER_TITLE[density],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Optional mono subtitle (step counter, meta). */
export function PanelHeaderMeta({
  children,
  density = 'compact',
  className,
}: {
  children: ReactNode;
  density?: HeaderDensity;
  className?: string;
}) {
  const metaSize =
    density === 'ultra' ? nodeText.xs : density === 'spacious' ? nodeText.sm : nodeText.sm;
  return (
    <span className={cn('shrink-0 font-mono tabular-nums text-ink3', metaSize, className)}>{children}</span>
  );
}

/** Second row under the title — caption strip for viz/replay. */
export function PanelHeaderSub({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1 font-mono text-ink3', nodeText.sm, className)}>{children}</div>
  );
}

export function PanelHeaderActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('nodrag ml-auto flex shrink-0 cursor-default items-center gap-1', className)}>{children}</div>
  );
}

export type PanelHeaderActionVariant = 'primary' | 'toggle' | 'ghost';

export function PanelHeaderAction({
  active,
  title,
  label,
  disabled,
  children,
  className,
  variant = 'ghost',
  onClick,
}: {
  active?: boolean;
  title: string;
  label?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  variant?: PanelHeaderActionVariant;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'nodrag place-items-center rounded-[calc(var(--radius)-2px)] p-[calc(var(--node-py,0.5625rem)*0.35)] transition-colors disabled:opacity-30',
        label
          ? cn(
              'flex h-auto min-h-[calc(var(--node-icon,1.125rem)*1.1)] w-auto items-center gap-1 px-[calc(var(--node-px,0.75rem)*0.5)]',
              nodeText.xs,
            )
          : 'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)]',
        variant === 'primary' &&
          (active ? 'bg-accent text-ink' : 'text-ink3 hover:bg-panel2 hover:text-ink'),
        variant === 'toggle' &&
          (active ? 'text-accent hover:bg-panel2' : 'text-ink3 hover:bg-panel2 hover:text-ink'),
        variant === 'ghost' && 'text-ink3 hover:bg-panel2/80 hover:text-ink',
        className,
      )}
    >
      {children}
      {label ? <span className="max-w-[5.5rem] truncate">{label}</span> : null}
    </button>
  );
}

export type PanelHeaderMenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

/** Overflow menu for rare/destructive header actions. */
export function PanelHeaderMenu({
  items,
  title = 'Panel actions',
}: {
  items: PanelHeaderMenuItem[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <PanelHeaderAction variant="toggle" active={open} title={title} onClick={() => setOpen((o) => !o)}>
        <MoreVertical className={nodeIconGlyph} />
      </PanelHeaderAction>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[168px] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel py-1 shadow-[var(--shadow-xl)]">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              disabled={it.disabled}
              onClick={() => {
                if (it.disabled) return;
                it.onClick();
                setOpen(false);
              }}
              className={cn(
                cn('flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors disabled:opacity-40', nodeText.sm),
                it.danger ? 'text-bad hover:bg-badbg/40' : 'text-ink2 hover:bg-panel2 hover:text-ink',
              )}
            >
              {it.icon && <span className="grid h-4 w-4 shrink-0 place-items-center text-ink3">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Scales viz board content to fit its panel column (visualize mode). */
export function VizFitBox({
  children,
  className,
  remeasureKey,
  layout: layoutMode = 'fill',
  measureRef,
}: {
  children: ReactNode;
  className?: string;
  /** Bumps remeasure when viz frame/step changes. */
  remeasureKey?: string | number;
  /** `fill` expands to the flex slot; `hug` shrink-wraps to scaled board size. */
  layout?: 'fill' | 'hug';
  /** Flex-area element used for fit math when `layout="hug"`. */
  measureRef?: RefObject<HTMLElement | null>;
}) {
  const selfRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ scale: 1, w: 0, h: 0, nw: 0, nh: 0 });
  const hug = layoutMode === 'hug';

  useLayoutEffect(() => {
    const measureEl = hug && measureRef?.current ? measureRef.current : selfRef.current;
    const content = contentRef.current;
    if (!measureEl || !content) return;

    const measureTarget = () => {
      const board = content.querySelector<HTMLElement>('.board-area');
      if (board) return board;
      const matched = content.querySelector<HTMLElement>(VIZ_MEASURE_SELECTOR);
      if (matched) return matched;
      return content;
    };

    const sync = () => {
      const cw = measureEl.clientWidth;
      // In `hug` the node auto-heights to this box, so reading the parent's
      // clientHeight would feed back into the scale (runaway shrink). Bind the
      // fit to width and cap by the viewport so tall boards still fit.
      const ch = hug ? Math.max(1, window.innerHeight - VIZ_FIT_PAD * 2) : measureEl.clientHeight;
      if (cw === 0 || ch === 0) {
        requestAnimationFrame(sync);
        return;
      }

      const target = measureTarget();
      const { w: nw, h: nh, boxH } = resolveMeasureSize(target, cw);
      if (nw === 0 || nh === 0) {
        requestAnimationFrame(sync);
        return;
      }

      // Scale is derived from the main animation height (`nh`); the box is sized
      // to the full stage (`boxH`) so a growing rail extends the box downward
      // without ever rescaling the board.
      const fit = computeVizFitLayout(nw, nh, cw, ch);
      setLayout({ scale: fit.scale, w: fit.w, h: boxH * fit.scale, nw, nh: boxH });
    };

    const ro = new ResizeObserver(() => requestAnimationFrame(sync));
    ro.observe(measureEl);
    ro.observe(content);
    sync();
    return () => ro.disconnect();
  }, [children, remeasureKey, hug, measureRef]);

  const scaled = layout.scale !== 1 && layout.nw > 0 && layout.nh > 0;
  const hugSize =
    hug && layout.w > 0 && layout.h > 0
      ? { width: layout.w + VIZ_FIT_PAD * 2, height: layout.h + VIZ_FIT_PAD * 2, maxWidth: '100%' }
      : undefined;

  return (
    <div
      ref={selfRef}
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        hug ? 'viz-board-col--hug shrink-0' : 'min-h-0 flex-1',
        className,
      )}
      style={hugSize}
    >
      <div
        style={{
          width: layout.w || undefined,
          height: layout.h || undefined,
          overflow: scaled ? 'hidden' : undefined,
          flexShrink: 0,
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: scaled ? layout.nw : undefined,
            height: scaled ? layout.nh : undefined,
            transform: scaled ? `scale(${layout.scale})` : undefined,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

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

const BODY_PAD: Record<HeaderDensity, string> = {
  compact: 'px-0 py-0',
  ultra: 'px-0 py-0',
  spacious: 'px-0 py-0',
};

const BODY_PAD_NARROW: Record<HeaderDensity, string> = {
  compact: 'px-0 py-0',
  ultra: 'px-0 py-0',
  spacious: 'px-0 py-0',
};

/** Density-aware body wrapper for canvas panel nodes. */
export function PanelBody({
  children,
  density = 'compact',
  fill,
  flush,
  narrow,
  className,
  style,
}: {
  children: ReactNode;
  density?: HeaderDensity;
  fill?: boolean;
  /** No inner card chrome — content sits flush in the outer shell (viz canvas). */
  flush?: boolean;
  /** Narrow-tier panels: lighter padding inside an already-padded shell. */
  narrow?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const pad = flush ? '' : narrow ? BODY_PAD_NARROW[density] : BODY_PAD[density];
  return (
    <div
      className={cn(
        'panel-node-body nowheel flex flex-col text-ink',
        flush ? 'gap-0 rounded-none bg-transparent p-0' : cn('gap-[var(--node-gap,0.5rem)] rounded-[calc(var(--radius)-2px)] bg-panel'),
        fill ? 'min-h-0 flex-1 overflow-hidden' : 'shrink-0 overflow-x-auto',
        pad,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/** Compact segmented tabs that live inside a node body. */
export function MiniTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="nodrag inline-flex items-center gap-0.5 rounded-lg bg-panel2 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            cn(RADIUS_CTRL, 'px-2 py-1 font-medium transition-colors', nodeText.sm),
            value === o.v ? 'bg-panel text-ink shadow-[var(--shadow-sm)]' : 'text-ink3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
