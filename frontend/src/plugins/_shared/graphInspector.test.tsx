import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GraphInspector, GraphStatRow } from './graphInspector';

describe('graphInspector', () => {
  it('renders rows inside VizInspector shell', () => {
    const html = renderToStaticMarkup(
      <GraphInspector
        frame={{ move: { type: 'INIT', note: '', caption: '' }, state: { n: 3 } }}
        selectedNode={null}
        rows={(s) => <GraphStatRow k="n" v={s.n} />}
      />,
    );
    expect(html).toContain('n');
    expect(html).toContain('3');
  });

  it('renders empty state when frame is null', () => {
    const html = renderToStaticMarkup(
      <GraphInspector frame={null} selectedNode={null} rows={() => null} />,
    );
    expect(html).toContain('No frame.');
  });
});
