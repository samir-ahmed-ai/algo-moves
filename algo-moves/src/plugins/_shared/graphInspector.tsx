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
