import { describe, expect, it } from 'vitest';
import {
  applyCanvasSnap,
  fillPresetOptions,
  orderForTiling,
  regionRect,
  tileCanvasNodes,
  tileCells,
  visibleFlowRect,
  type FlowRect,
} from './canvasSnap';
import type { PanelFlowNode } from '@/core/panelFlowTypes';

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

describe('tileCells', () => {
  const RECT: FlowRect = { x: 0, y: 0, width: 1000, height: 800 };

  it('gives a single tile the whole rect', () => {
    expect(tileCells(1, RECT, 16, 0.58)).toEqual([RECT]);
  });

  it('splits two tiles into primary/secondary full-height columns', () => {
    const [primary, rest] = tileCells(2, RECT, 16, 0.58);
    expect(primary!.height).toBe(800);
    expect(rest!.height).toBe(800);
    expect(primary!.width).toBeCloseTo((1000 - 16) * 0.58);
    expect(primary!.width + rest!.width + 16).toBeCloseTo(1000);
    expect(rest!.x).toBeCloseTo(primary!.width + 16);
  });

  it('stacks the right column for three tiles', () => {
    const cells = tileCells(3, RECT, 16, 0.58);
    expect(cells).toHaveLength(3);
    expect(cells[0]!.height).toBe(800);
    expect(cells[1]!.x).toBeCloseTo(cells[2]!.x);
    expect(cells[1]!.height + cells[2]!.height + 16).toBeCloseTo(800);
  });

  it('weights the 2×2 grid toward the primary tile', () => {
    const cells = tileCells(4, RECT, 16, 0.58);
    expect(cells).toHaveLength(4);
    expect(cells[0]!.width).toBeGreaterThan(cells[1]!.width);
    expect(cells[0]!.height).toBeGreaterThan(cells[2]!.height);
    expect(cells[0]!.height + cells[2]!.height + 16).toBeCloseTo(800);
  });

  it('covers the rect for larger counts', () => {
    for (const count of [5, 7, 9, 12]) {
      const cells = tileCells(count, RECT, 16, 0.58);
      expect(cells).toHaveLength(count);
      const maxRight = Math.max(...cells.map((c) => c.x + c.width));
      const maxBottom = Math.max(...cells.map((c) => c.y + c.height));
      expect(maxRight).toBeCloseTo(1000);
      expect(maxBottom).toBeCloseTo(800);
    }
  });
});

describe('orderForTiling', () => {
  const nodes = [
    makeNode('notes'),
    { ...makeNode('code'), data: { kind: 'collab-code', title: 'Code' } },
    { ...makeNode('board'), data: { kind: 'whiteboard', title: 'Board' } },
  ];

  it('sorts by kind priority', () => {
    expect(orderForTiling(nodes).map((n) => n.data.kind)).toEqual([
      'whiteboard',
      'collab-code',
      'notes',
    ]);
  });

  it('hoists the requested primary kind', () => {
    expect(orderForTiling(nodes, 'collab-code')[0]!.data.kind).toBe('collab-code');
  });
});

describe('tileCanvasNodes', () => {
  const RECT: FlowRect = { x: 0, y: 0, width: 1200, height: 900 };

  it('tiles top-level panels to fill the rect with snapFill set', () => {
    const nodes = [
      { ...makeNode('board'), data: { kind: 'whiteboard', title: 'Board', interviewSeed: true } },
      { ...makeNode('code'), data: { kind: 'collab-code', title: 'Code', collapsed: true } },
      makeNode('notes'),
    ];
    const next = tileCanvasNodes(nodes, RECT, { gutter: 16 });
    for (const n of next) {
      expect(n.data.snapFill).toBe(true);
      expect(n.data.collapsed).toBeUndefined();
      expect(n.data.interviewSeed).toBeUndefined();
      expect(n.height).toBeGreaterThan(0);
    }
    const board = next.find((n) => n.id === 'board')!;
    expect(board.position).toEqual({ x: 16, y: 16 });
    expect(board.height).toBe(900 - 32);
    const rights = next.map((n) => n.position.x + (n.width ?? 0));
    expect(Math.max(...rights)).toBeCloseTo(1200 - 16);
  });

  it('leaves effects and slotted children untouched', () => {
    const child = { ...makeNode('child'), parentId: 'board' };
    const effect = { ...makeNode('fx'), type: 'effect' } as unknown as PanelFlowNode;
    const nodes = [makeNode('board'), child, effect];
    const next = tileCanvasNodes(nodes, RECT);
    expect(next.find((n) => n.id === 'child')).toBe(child);
    expect(next.find((n) => n.id === 'fx')).toBe(effect);
    expect(next.find((n) => n.id === 'board')!.data.snapFill).toBe(true);
  });

  it('no-ops on a degenerate rect', () => {
    const nodes = [makeNode('a')];
    expect(tileCanvasNodes(nodes, { x: 0, y: 0, width: 100, height: 100 })).toBe(nodes);
  });

  it('centers width-capped kinds inside their cell', () => {
    const problem = {
      ...makeNode('problem'),
      data: { kind: 'problem', title: 'Problem' },
    };
    const next = tileCanvasNodes([problem], RECT);
    const tiled = next[0]!;
    expect(tiled.width!).toBeLessThan(1200 - 32);
    expect(tiled.position.x).toBeGreaterThan(16);
  });
});

describe('fillPresetOptions', () => {
  it('maps presets to primary kinds', () => {
    expect(fillPresetOptions('board').primaryKind).toBe('whiteboard');
    expect(fillPresetOptions('code').primaryKind).toBe('collab-code');
    expect(fillPresetOptions('split').primaryShare).toBe(0.5);
    expect(fillPresetOptions('auto')).toEqual({});
  });
});
