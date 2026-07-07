import type { ReactNode, RefObject } from 'react';
import { getTag } from '@/content/tags';
import { TAG_KIND_COLOR } from '@/content/tagColors';
import { cn } from '@/lib/utils/cn';
import { TONE_BANNER, TONE_LABEL, type UiTone } from '@/design/tone';
import { nodeText, RADIUS_CTRL } from '@/design/typography';

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
