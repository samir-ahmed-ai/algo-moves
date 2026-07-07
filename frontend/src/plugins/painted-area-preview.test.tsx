import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadPlugin } from '../core/registry';
import { prepSimulatorsById, resolvePrepSimulator } from './imported/prepSimulators';

describe('prep-design-amount-of-new-area-painted-each-day preview', () => {
  it('registers the hand-built simulator', () => {
    const id = 'prep-design-amount-of-new-area-painted-each-day';
    expect(prepSimulatorsById[id]).toBeDefined();
    expect(resolvePrepSimulator(id)).toBeDefined();
  });

  it('uses the static design diagram instead of the step animation', async () => {
    const plugin = await loadPlugin('prep-design-amount-of-new-area-painted-each-day');
    expect(plugin).toBeDefined();
    expect(plugin!.meta.static).toBe(true);
    expect(plugin!.inputs.map((i) => i.id)).toContain('design');

    const input = plugin!.inputs[0]!;
    const frames = plugin!.record(input.value);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.move.type).toBe('DESIGN');

    const View = plugin!.View;
    const html = renderToStaticMarkup(createElement(View, { frame: frames[0]! }));
    expect(html).toContain('design-flow');
    expect(html).toContain('Amount of New Area Painted Each Day');
  });
});
