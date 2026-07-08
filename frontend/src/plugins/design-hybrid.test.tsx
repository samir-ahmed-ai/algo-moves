import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadPlugin, loadAllPlugins } from '../core/registry';
import { prepSimulatorsById, resolvePrepSimulator } from './imported/prepSimulators';
import { PREP_DATA } from './imported/prepManifest';
import { designDiagrams } from './imported/prepSimulators/designDiagrams/registry';

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

describe('design hybrid plugins', () => {
  const designIds = PREP_DATA.filter((p) => p.topic === 'design').map((p) => p.id);

  it('every design manifest id has a diagram registry entry', () => {
    const missing = designIds.filter((id) => !designDiagrams[id]);
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('all 30 design problems are hybrid (not static) when simulator exists', async () => {
    const plugins = await loadAllPlugins();
    const byId = new Map(plugins.map((p) => [p.meta.id, p]));
    const bad: string[] = [];
    for (const id of designIds) {
      const plugin = byId.get(id);
      if (!plugin) {
        bad.push(`${id}: missing plugin`);
        continue;
      }
      if (!resolvePrepSimulator(id)) {
        bad.push(`${id}: missing simulator`);
        continue;
      }
      if (plugin.meta.static) bad.push(`${id}: should not be static`);
      if (!plugin.meta.designHybrid) bad.push(`${id}: missing designHybrid flag`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  for (const id of designIds) {
    it(`${id} produces >= 3 frames on sample input`, async () => {
      const plugin = await loadPlugin(id);
      expect(plugin).toBeDefined();
      for (const input of plugin!.inputs) {
        const frames = plugin!.record(input.value);
        expect(frames.length, `${id} · ${input.label}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
