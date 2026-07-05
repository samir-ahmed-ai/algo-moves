import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { STRUDEL_NODE_W, vizMinWidth, vizWireGap, LAYOUT_PRESET_META } from '@/shell/canvas';
import { VizEmpty, VizHint, vizText } from '../plugins/_shared/vizKit';

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
