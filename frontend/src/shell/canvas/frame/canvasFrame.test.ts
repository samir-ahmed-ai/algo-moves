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

  it('seeds problem-backed visualize mode with the unified workbench', () => {
    const { nodes, edges } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedProblemCanvas: true,
    });
    expect(nodes.map((n) => n.id)).toEqual(['workbench']);
    const workbench = nodes[0]!;
    expect(workbench.width).toBeGreaterThan(1000);
    expect(workbench.height).toBeGreaterThan(700);
    expect(edges).toHaveLength(0);
  });

  it('does not reseed a problem canvas after the user removed panels', () => {
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedProblemCanvas: true,
      removed: new Set(['workbench']),
    });
    expect(nodes).toHaveLength(0);
  });

  it('seeds the interview canvas with the board layout marked for viewport tiling', () => {
    const { nodes, edges } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedInterviewCanvas: true,
    });
    expect(nodes.map(kindOf)).toEqual(['whiteboard', 'notes', 'collab-code']);
    // Fallback positions from buildInterviewBoardNodes are preserved (no
    // auto-layout here); every seeded node carries the retile marker so
    // CanvasStage tiles them to the measured viewport on mount.
    const whiteboard = nodes.find((n) => kindOf(n) === 'whiteboard')!;
    expect(whiteboard.position).toEqual({ x: 0, y: 0 });
    expect(nodes.every((n) => n.data.interviewSeed)).toBe(true);
    expect(edges).toHaveLength(0);
  });

  it('reseeds the interview canvas despite a stale removal set', () => {
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedInterviewCanvas: true,
      removed: new Set(['whiteboard']),
    });
    expect(nodes.map(kindOf)).toEqual(['whiteboard', 'notes', 'collab-code']);
  });

  it('reseeds the interview canvas despite a stale saved layout (seeded ids never match)', () => {
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedInterviewCanvas: true,
      saved: { 'whiteboard-1': { position: { x: 10, y: 10 } } },
    });
    expect(nodes.map(kindOf)).toEqual(['whiteboard', 'notes', 'collab-code']);
  });

  it('prefers the problem seed over the interview seed when both are set', () => {
    const { nodes } = buildCanvasFrame(stubPlugin, 'visualize', {
      ...baseInput,
      seedProblemCanvas: true,
      seedInterviewCanvas: true,
    });
    expect(nodes.map((n) => n.id)).toEqual(['workbench']);
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
    expect(tidied.nodes.map((n) => n.id)).toEqual(['workbench']);
    expect(tidied.nodes.every((n) => !n.selected)).toBe(true);
    expect(tidied.edges).toHaveLength(0);
  });

  it('styles every edge with the removable edge type when edges exist', () => {
    const { edges } = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    if (edges.length === 0) return;
    expect(edges.every((e) => e.type === 'removable')).toBe(true);
  });

  it('omits removed nodes and their incident edges', () => {
    const full = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    if (full.nodes.length === 0) return;
    const firstNode = full.nodes[0]!;
    const removed = new Set([firstNode.id]);
    const { nodes, edges } = buildCanvasFrame(stubPlugin, 'learn', { ...baseInput, removed });
    expect(nodes.some((n) => n.id === firstNode.id)).toBe(false);
    expect(nodes.length).toBe(full.nodes.length - 1);
    expect(edges.every((e) => e.source !== firstNode.id && e.target !== firstNode.id)).toBe(true);
  });

  it('drops removed edges', () => {
    const full = buildCanvasFrame(stubPlugin, 'learn', baseInput);
    if (full.edges.length === 0) return;
    const firstEdge = full.edges[0]!;
    const removedEdges = new Set([firstEdge.id]);
    const { edges } = buildCanvasFrame(stubPlugin, 'learn', { ...baseInput, removedEdges });
    expect(edges.some((e) => e.id === firstEdge.id)).toBe(false);
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
    const target = base.find((n) => kindOf(n) !== 'workbench');
    if (!target) return;
    const saved = { [target.id]: { position: target.position, width: 300 } };
    const { nodes } = buildCanvasFrame(stubPlugin, 'learn', { ...baseInput, saved });
    const restored = nodes.find((n) => n.id === target.id)!;
    expect(restored.width).toBe(restoreNodeWidth(kindOf(target), 300, target.width));
  });
});
