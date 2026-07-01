import type { ReactNode } from 'react';
import type { InspectorProps } from '../../core/types';
import { InspectorRow, VizEmpty, VizInspector } from './vizKit';

export { InspectorRow as GraphStatRow };

type GraphInspectorProps<S> = InspectorProps<S> & {
  rows: (state: S) => ReactNode;
};

/** Padded inspector shell for graph / traversal plugins. */
export function GraphInspector<S>({ frame, rows }: GraphInspectorProps<S>) {
  if (!frame) return <VizEmpty />;
  return <VizInspector>{rows(frame.state)}</VizInspector>;
}

/** Build a graph plugin Inspector from row factory. */
export function makeGraphInspector<S>(
  rows: (state: S) => ReactNode,
): (props: InspectorProps<S>) => JSX.Element {
  return function GeneratedGraphInspector(props: InspectorProps<S>) {
    return <GraphInspector {...props} rows={rows} />;
  };
}
