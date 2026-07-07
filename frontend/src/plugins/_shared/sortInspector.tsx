import type { ReactNode } from 'react';
import type { InspectorProps } from '../../core/types';
import { InspectorRow, VizEmpty, VizInspector } from './vizKit';

/** Minimal shared sort-state fields. */
export interface SortInspectorState {
  comparisons: number;
  values: number[];
}

export interface SortInspectorOptions<S extends SortInspectorState> {
  /** Primary metric label (default "swaps"). */
  metricLabel?: string;
  metricValue?: (state: S) => string | number;
  hideMetric?: boolean;
  /** Sorted-region label (default "sorted tail from"). */
  sortedLabel?: string;
  sortedValue?: (state: S) => string | number;
  hideSorted?: boolean;
  extra?: (state: S) => ReactNode;
}

type SortInspectorProps<S extends SortInspectorState> = InspectorProps<S> & SortInspectorOptions<S>;

/** Standard comparisons / metric / array inspector for sort plugins. */
export function SortInspector<S extends SortInspectorState>({
  frame,
  metricLabel = 'swaps',
  metricValue,
  hideMetric = false,
  sortedLabel = 'sorted tail from',
  sortedValue,
  hideSorted = false,
  extra,
}: SortInspectorProps<S>) {
  if (!frame) return <VizEmpty />;
  const s = frame.state;
  const metric =
    metricValue?.(s) ??
    ('swaps' in s && typeof (s as { swaps?: number }).swaps === 'number'
      ? (s as { swaps: number }).swaps
      : '—');
  const sorted =
    sortedValue?.(s) ??
    ('sortedFrom' in s && typeof (s as { sortedFrom?: number }).sortedFrom === 'number'
      ? (() => {
          const tail = (s as { sortedFrom: number }).sortedFrom;
          return tail < s.values.length ? tail : '— (done)';
        })()
      : '—');

  return (
    <VizInspector>
      <InspectorRow k="comparisons" v={s.comparisons} />
      {!hideMetric && <InspectorRow k={metricLabel} v={metric} />}
      {!hideSorted && <InspectorRow k={sortedLabel} v={sorted} />}
      {extra?.(s)}
      <InspectorRow k="array" v={`[${s.values.join(', ')}]`} />
    </VizInspector>
  );
}
