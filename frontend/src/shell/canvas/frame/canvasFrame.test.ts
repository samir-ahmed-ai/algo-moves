import { describe, expect, it } from 'vitest';
import type { ProblemPlugin } from '../../../core';
import { defaultEdgeOpts } from '@/lib/canvas/layoutPrefs';
import { buildCanvasFrame, organizeCurrentCanvasFrame, type CanvasFrameInput } from './canvasFrame';
import { restoreNodeWidth } from '../nodes/nodeSnapshot';

const stubPlugin = { tabs: [], wires: {} } as unknown as ProblemPlugin<any, any>;

const baseInput: CanvasFrameInput = {
  layoutOpts: { viewport: { width: 1200, height: 800 } },
  dir: 'TB',
  edgeOpts: defaultEdgeOpts,
};

const kindOf = (n: { id: string; data: { kind?: string } }) => n.data.kind ?? n.id;

describe('buildCanvasFrame', () => {
  it('starts with no built-in panels for visualize mode (freeform canvas)', () => {
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', baseInput);
    expect(nodes).toHaveLength(0);
  });

  it('seeds problem-backed visualize mode with useful starter panels', () => {
    const { nodes, edges } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedProblemCanvas: true,
    });
    expect(nodes.map((n) => n.id)).toEqual(['problem', 'viz', 'code']);
    expect(nodes[1].position.x).toBeGreaterThan(nodes[0].position.x);
    expect(nodes[2].position.x).toBeGreaterThan(nodes[1].position.x);
    expect(nodes[1].width).toBeGreaterThan(nodes[0].width ?? 0);
    expect(edges.map((e) => e.id)).toEqual(['problem->viz', 'viz->code']);
  });

  it('does not reseed a problem canvas after the user removed panels', () => {
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedProblemCanvas: true,
      removed: new Set(['problem']),
    });
    expect(nodes).toHaveLength(0);
  });

  it('tidies current optional visualize panels instead of dropping them', () => {
    const seeded = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedProblemCanvas: true,
    });
    const messy = seeded.nodes.map((n, i) => ({
      ...n,
      position: { x: 800 - i * 40, y: 400 + i * 30 },
      selected: true,
    }));
    const tidied = organizeCurrentCanvasFrame(stubPlugin, 'visualize', messy, baseInput);
    expect(tidied.nodes.map((n) => n.id)).toEqual(['problem', 'viz', 'code']);
    expect(tidied.nodes.every((n) => !n.selected)).toBe(true);
    expect(tidied.edges.map((e) => e.id)).toEqual(['problem->viz', 'viz->code']);
  });

  it('styles every edge with the removable edge type when edges exist', () => {
    const { edges } = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    if (edges.length === 0) return;
    expect(edges.every((e) => e.type === 'removable')).toBe(true);
  });

  it('omits removed nodes and their incident edges', () => {
    const full = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    if (full.nodes.length === 0) return;
    const removed = new Set([full.nodes[0].id]);
    const { nodes, edges } = buildCanvasFrame(stubPlugin, 'learn', { ...baseInput, removed });
    expect(nodes.some((n) => n.id === full.nodes[0].id)).toBe(false);
    expect(nodes.length).toBe(full.nodes.length - 1);
    expect(edges.every((e) => e.source !== full.nodes[0].id && e.target !== full.nodes[0].id)).toBe(true);
  });

  it('drops removed edges', () => {
    const full = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    if (full.edges.length === 0) return;
    const removedEdges = new Set([full.edges[0].id]);
    const { edges } = buildCanvasFrame(stubPlugin, 'learn', { ...baseInput, removedEdges });
    expect(edges.some((e) => e.id === full.edges[0].id)).toBe(false);
  });

  it('restores saved positions in visualize mode (freeform)', () => {
    const saved = {
      notes: { position: { x: 120, y: 80 }, width: 360 },
    };
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      saved,
      removed: new Set(['notes']),
    });
    // Node was removed — saved entry ignored until re-added via DnD.
    expect(nodes).toHaveLength(0);
  });

  it('restores saved width via restoreNodeWidth for non-viz nodes in learn mode', () => {
    const { nodes: base } = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    const target = base.find((n) => kindOf(n) !== 'viz');
    if (!target) return;
    const saved = { [target.id]: { position: target.position, width: 300 } };
    const { nodes } = buildCanvasFrame(stubPlugin, 'learn', { ...baseInput, saved });
    const restored = nodes.find((n) => n.id === target.id)!;
    expect(restored.width).toBe(restoreNodeWidth(kindOf(target), 300, target.width));
  });
});
