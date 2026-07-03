import { describe, expect, it } from 'vitest';
import type { ProblemPlugin } from '../../core';
import { defaultEdgeOpts } from '@/lib/canvas/layoutPrefs';
import { buildCanvasFrame, type CanvasFrameInput } from './canvasFrame';
import { restoreNodeWidth } from './nodeSnapshot';

// A plugin with no tabs/wires yields only the mode's built-in panels + shell
// wires — enough to characterize the pure assembly (removals, layout, restore).
const stubPlugin = { tabs: [], wires: {} } as unknown as ProblemPlugin<any, any>;

const baseInput: CanvasFrameInput = {
  layoutOpts: { viewport: { width: 1200, height: 800 } },
  dir: 'TB',
  edgeOpts: defaultEdgeOpts,
};

const kindOf = (n: { id: string; data: { kind?: string } }) => n.data.kind ?? n.id;

describe('buildCanvasFrame', () => {
  it('produces the built-in problem + visualizer panels for visualize mode', () => {
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', baseInput);
    const kinds = nodes.map(kindOf);
    expect(kinds).toContain('problem');
    expect(kinds).toContain('viz');
  });

  it('styles every edge with the removable edge type', () => {
    const { edges } = buildCanvasFrame(stubPlugin, 'visualize', baseInput);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.type === 'removable')).toBe(true);
  });

  it('omits removed nodes and their incident edges', () => {
    const full = buildCanvasFrame(stubPlugin, 'visualize', baseInput);
    const removed = new Set(['viz']);
    const { nodes, edges } = buildCanvasFrame(stubPlugin, 'visualize', { ...baseInput, removed });
    expect(nodes.some((n) => n.id === 'viz')).toBe(false);
    expect(nodes.length).toBe(full.nodes.length - 1);
    expect(edges.every((e) => e.source !== 'viz' && e.target !== 'viz')).toBe(true);
  });

  it('drops removed edges', () => {
    const full = buildCanvasFrame(stubPlugin, 'visualize', baseInput);
    if (full.edges.length === 0) return;
    const removedEdges = new Set([full.edges[0].id]);
    const { edges } = buildCanvasFrame(stubPlugin, 'visualize', { ...baseInput, removedEdges });
    expect(edges.some((e) => e.id === full.edges[0].id)).toBe(false);
  });

  it('keeps the canonical layout position (ignores saved position) in stacked modes', () => {
    const { nodes: base } = buildCanvasFrame(stubPlugin, 'visualize', baseInput);
    const target = base.find((n) => kindOf(n) === 'problem')!;
    const saved = { [target.id]: { position: { x: -999, y: -999 }, width: 300 } };
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', { ...baseInput, saved });
    const restored = nodes.find((n) => n.id === target.id)!;
    expect(restored.position).toEqual(target.position);
    expect(restored.position).not.toEqual({ x: -999, y: -999 });
  });

  it('restores saved width via restoreNodeWidth for non-viz nodes', () => {
    const { nodes: base } = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    const target = base.find((n) => kindOf(n) !== 'viz')!;
    const saved = { [target.id]: { position: target.position, width: 300 } };
    const { nodes } = buildCanvasFrame(stubPlugin, 'learn', { ...baseInput, saved });
    const restored = nodes.find((n) => n.id === target.id)!;
    expect(restored.width).toBe(restoreNodeWidth(kindOf(target), 300, target.width));
  });
});
