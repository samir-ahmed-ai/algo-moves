import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { STRUDEL_NODE_W, vizMinWidth, vizWireGap, LAYOUT_PRESET_META } from '@/shell/canvas';
import { VizEmpty, VizHint, vizText } from '../plugins/_shared/vizKit';
import { EmptyState } from '@/design/components';
import { chromeText } from '@/design/chromeTypography';

describe('layout integration', () => {
  it('theater preset uses tighter wire gap than default', () => {
    expect(LAYOUT_PRESET_META.Theater).toBeDefined();
    expect(vizWireGap(STRUDEL_NODE_W, 'theater')).toBeLessThan(vizWireGap(STRUDEL_NODE_W));
  });

  it('viz min width respects STRUDEL_NODE_W', () => {
    expect(vizMinWidth(STRUDEL_NODE_W)).toBe(STRUDEL_NODE_W);
  });
});

describe('vizKit integration', () => {
  it('renders without hardcoded px font classes', () => {
    const html = renderToStaticMarkup(
      <>
        <VizEmpty />
        <VizHint>hint</VizHint>
      </>,
    );
    expect(html).toContain('No frame.');
    expect(html).not.toMatch(/text-\[(?:10|11|12|13|14|15)px\]/);
    expect(vizText.sm).toContain('--node-fs-sm');
  });
});

describe('design density integration', () => {
  it('EmptyState uses token-based typography', () => {
    const html = renderToStaticMarkup(<EmptyState title="Nothing here" hint="Try another filter" />);
    expect(html).toContain('--node-fs-sm');
    expect(html).not.toMatch(/text-\[(?:9|10|11)px\]/);
  });

  it('chromeText scales reference CSS variables for all densities', () => {
    for (const key of ['base', 'sm', 'xs', 'tight', '2xs', 'title'] as const) {
      expect(chromeText[key]).toMatch(/--fs/);
    }
  });
});
