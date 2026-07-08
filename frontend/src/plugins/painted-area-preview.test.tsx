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

  it('uses hybrid design plugin with diagram and step simulator', async () => {
    const plugin = await loadPlugin('prep-design-amount-of-new-area-painted-each-day');
    expect(plugin).toBeDefined();
    expect(plugin!.meta.designHybrid).toBe(true);
    expect(plugin!.meta.static).toBeFalsy();

    const input = plugin!.inputs[0]!;
    const frames = plugin!.record(input.value);
    expect(frames.length).toBeGreaterThanOrEqual(3);

    const View = plugin!.View;
    const html = renderToStaticMarkup(createElement(View, { frame: frames[0]! }));
    expect(html).toContain('design-hybrid');
    expect(html).toContain('design-flow');
    expect(html).toContain('Amount of New Area Painted Each Day');
    expect(html).toContain('Architecture');
    expect(html).toContain('Walkthrough');
  });
});
