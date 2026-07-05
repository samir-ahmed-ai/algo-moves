import { describe, expect, it } from 'vitest';
import { applyCanvasSnap, regionRect, visibleFlowRect, type FlowRect } from './canvasSnap';
import type { PanelFlowNode } from '../nodes/PanelNode';

const VIEWPORT = { x: 0, y: 0, zoom: 1 };
const CONTAINER = { width: 1000, height: 800 };
const VISIBLE: FlowRect = { x: 12, y: 12, width: 976, height: 776 };

function makeNode(id: string, selected = false): PanelFlowNode {
  return {
    id,
    type: 'panel',
    position: { x: 100, y: 100 },
    data: { kind: 'notes', title: 'Notes' },
    selected,
    width: 200,
    height: 150,
  };
}

describe('visibleFlowRect', () => {
  it('maps viewport origin to margin-inset flow bounds at zoom 1', () => {
    expect(visibleFlowRect(VIEWPORT, CONTAINER.width, CONTAINER.height, 12)).toEqual({
      x: 12,
      y: 12,
      width: 976,
      height: 776,
    });
  });

  it('accounts for pan and zoom', () => {
    expect(visibleFlowRect({ x: -100, y: -50, zoom: 2 }, 800, 600, 0)).toEqual({
      x: 50,
      y: 25,
      width: 400,
      height: 300,
    });
  });
});

describe('regionRect', () => {
  it('splits left half', () => {
    expect(regionRect('left', VISIBLE)).toEqual({
      x: 12,
      y: 12,
      width: 488,
      height: 776,
    });
  });

  it('splits bottom-right corner', () => {
    expect(regionRect('bottom-right', VISIBLE)).toEqual({
      x: 500,
      y: 400,
      width: 488,
      height: 388,
    });
  });

  it('maximize fills visible area', () => {
    expect(regionRect('maximize', VISIBLE)).toEqual(VISIBLE);
  });

  it('center uses 60% of visible area', () => {
    const r = regionRect('center', VISIBLE);
    expect(r.width).toBeCloseTo(976 * 0.6);
    expect(r.height).toBeCloseTo(776 * 0.6);
    expect(r.x).toBeCloseTo(12 + (976 - 976 * 0.6) / 2);
    expect(r.y).toBeCloseTo(12 + (776 - 776 * 0.6) / 2);
  });

  it('splits vertical thirds', () => {
    expect(regionRect('first-third', VISIBLE).width).toBeCloseTo(976 / 3);
    expect(regionRect('center-third', VISIBLE).x).toBeCloseTo(12 + 976 / 3);
    expect(regionRect('last-third', VISIBLE).x).toBeCloseTo(12 + (2 * 976) / 3);
  });
});

describe('applyCanvasSnap', () => {
  it('returns nodes unchanged when zero or multiple nodes are selected', () => {
    const none = [makeNode('a'), makeNode('b')];
    expect(applyCanvasSnap(none, 'left', VISIBLE)).toBe(none);
    const two = [makeNode('a', true), makeNode('b', true)];
    expect(applyCanvasSnap(two, 'left', VISIBLE)).toBe(two);
  });

  it('snaps a single selected node to the left half', () => {
    const nodes = [makeNode('notes', true)];
    const next = applyCanvasSnap(nodes, 'left', VISIBLE);
    const snapped = next.find((n) => n.id === 'notes')!;
    expect(snapped.position).toEqual({ x: 12, y: 12 });
    expect(snapped.width).toBe(488);
    expect(snapped.height).toBe(776);
  });

  it('snaps to maximize', () => {
    const nodes = [makeNode('whiteboard', true)];
    const next = applyCanvasSnap(nodes, 'maximize', VISIBLE);
    const snapped = next.find((n) => n.id === 'whiteboard')!;
    expect(snapped.position).toEqual({ x: 12, y: 12 });
    expect(snapped.width).toBe(976);
    expect(snapped.height).toBe(776);
    expect(snapped.data.snapFill).toBe(true);
  });

  it('respects layoutFixedWidth cap', () => {
    const nodes: PanelFlowNode[] = [
      {
        id: 'problem',
        type: 'panel',
        position: { x: 0, y: 0 },
        data: { kind: 'problem', title: 'Problem' },
        selected: true,
      },
    ];
    const next = applyCanvasSnap(nodes, 'maximize', VISIBLE);
    const snapped = next.find((n) => n.id === 'problem')!;
    expect(snapped.width).toBeLessThan(976);
  });
});
