import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InspectorRow } from './vizKit';
import { SortInspector } from './sortInspector';

describe('SortInspector', () => {
  it('renders default sort metrics', () => {
    const html = renderToStaticMarkup(
      <SortInspector
        frame={{
          move: { type: 'INIT', note: '', caption: '' },
          state: { comparisons: 2, swaps: 1, sortedFrom: 3, values: [1, 2, 3] },
        }}
        selectedNode={null}
      />,
    );
    expect(html).toContain('comparisons');
    expect(html).toContain('swaps');
    expect(html).toContain('[1, 2, 3]');
  });

  it('supports custom metric and extra rows', () => {
    const html = renderToStaticMarkup(
      <SortInspector
        frame={{
          move: { type: 'INIT', note: '', caption: '' },
          state: { comparisons: 0, swaps: 0, sortedFrom: 0, values: [4] },
        }}
        selectedNode={null}
        metricLabel="writes"
        metricValue={() => 5}
        hideSorted
        extra={() => <InspectorRow k="phase" v="sort" />}
      />,
    );
    expect(html).toContain('writes');
    expect(html).toContain('phase');
  });
});
