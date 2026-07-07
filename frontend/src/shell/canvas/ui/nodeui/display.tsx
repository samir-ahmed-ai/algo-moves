import type { ReactNode, RefObject } from 'react';
import { Boxes, Hash, Target, Workflow, type LucideIcon } from 'lucide-react';
import { getTag, type TagKind } from '@/content/tags';
import { TAG_KIND_COLOR, TAG_KIND_LABEL } from '@/content/tagColors';
import { cn } from '@/lib/utils/cn';
import { TONE_BANNER, TONE_LABEL, type UiTone } from '@/design/tone';
import { nodeText, RADIUS_CTRL } from '@/design/typography';

/** Colored glyph per tag kind — tinted with the shared TAG_KIND_COLOR. */
const TAG_KIND_ICON: Readonly<Record<TagKind, LucideIcon>> = {
  pattern: Workflow,
  structure: Boxes,
  skill: Target,
  meta: Hash,
};

export function NodeTagChip({ id }: { id: string }) {
  const t = getTag(id);
  const Icon = TAG_KIND_ICON[t.kind];
  return (
    <span
      data-tag-kind={t.kind}
      title={`${TAG_KIND_LABEL[t.kind]}: ${t.label}`}
      aria-label={`${TAG_KIND_LABEL[t.kind]} tag: ${t.label}`}
      className={cn(
        'node-tag-chip inline-flex items-center gap-1 rounded-full bg-panel2 px-[calc(var(--node-px,0.75rem)*0.5)] py-[calc(var(--node-py,0.5625rem)*0.35)] text-ink2 ring-1 ring-inset ring-edge transition-colors hover:bg-edge/50 hover:text-ink',
        nodeText.xs,
      )}
    >
      <Icon
        className="node-tag-chip__glyph size-[calc(var(--node-icon,1.125rem)*0.62)] shrink-0"
        style={{ color: TAG_KIND_COLOR[t.kind] }}
        aria-hidden
      />
      {t.label}
    </span>
  );
}

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
    <div className={cn('node-def-row border-t border-edge py-1.5 first:border-t-0', className)}>
      <div className="node-def-row__head flex items-baseline justify-between gap-2">
        <span className={cn(nodeText.sm, 'node-def-row__term font-medium text-ink')}>{term}</span>
        {meta}
      </div>
      <p className={cn('node-def-row__body mt-0.5 leading-snug text-ink2', nodeText.base)}>
        {children}
      </p>
    </div>
  );
}

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
    <div
      className={cn(
        RADIUS_CTRL,
        'node-banner px-2 py-1.5',
        `node-banner--${tone}`,
        TONE_BANNER[tone],
      )}
    >
      {label && (
        <div className={cn('node-banner__label mb-0.5', nodeText.label, TONE_LABEL[tone])}>
          {label}
        </div>
      )}
      <div className={cn('node-banner__body leading-snug', nodeText.base)}>{children}</div>
    </div>
  );
}

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
    <div className="node-code overflow-hidden rounded-lg border border-edge">
      {file && (
        <div className="node-code__header flex items-center gap-1.5 border-b border-edge bg-panel2 px-2.5 py-1">
          <span className={cn('node-code__file font-mono text-ink3', nodeText.xs)}>{file}</span>
        </div>
      )}
      <pre
        ref={preRef}
        className={cn(
          'node-code__pre nodrag ws-scroll m-0 max-h-[320px] overflow-auto bg-[var(--surface-2)] p-2.5 font-mono leading-relaxed text-ink2',
          nodeText.sm,
        )}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}

export function Spark({ series, index }: { series: number[]; index: number }) {
  const w = 200;
  const h = 28;
  const safeSeries = series.filter(Number.isFinite);
  const values = safeSeries.length > 0 ? safeSeries : [0];
  const safeIndex = Math.min(
    Math.max(Number.isFinite(index) ? Math.round(index) : 0, 0),
    values.length - 1,
  );
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * w : 0;
    const y = h - 2 - ((v - lo) / span) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const cx = values.length > 1 ? (safeIndex / (values.length - 1)) * w : 0;
  return (
    <svg
      className="node-spark"
      role="img"
      aria-label="Trend sparkline"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
    >
      <polyline points={pts.join(' ')} fill="none" stroke="var(--team2-stroke)" strokeWidth={1.5} />
      <line
        x1={cx}
        y1={0}
        x2={cx}
        y2={h}
        stroke="var(--accent)"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    </svg>
  );
}
