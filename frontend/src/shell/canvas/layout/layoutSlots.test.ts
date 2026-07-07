import { describe, expect, it } from 'vitest';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import {
  assignNodeToSlot,
  emptyLayoutSlots,
  findLayoutSlotAtPoint,
  HOST_MIN_HEIGHT,
  HOST_MIN_WIDTH,
  LAYOUT_HEADER_HEIGHT,
  relayoutHostSlots,
  removeNodeFromSlot,
  slotRect,
  sortNodesParentFirst,
  unparentOnHostDelete,
  wouldCreateLayoutCycle,
} from './layoutSlots';

function node(
  id: string,
  opts: Partial<PanelFlowNode> & { data?: PanelFlowNode['data'] } = {},
): PanelFlowNode {
  return {
    id,
    type: 'panel',
    position: { x: 0, y: 0 },
    data: { kind: id, title: id, ...opts.data },
    width: 200,
    height: 150,
    ...opts,
  };
}

describe('slotRect', () => {
  it('returns non-overlapping cells for a 720×480 host', () => {
    const r0 = slotRect(720, 480, LAYOUT_HEADER_HEIGHT, 0);
    const r1 = slotRect(720, 480, LAYOUT_HEADER_HEIGHT, 1);
    expect(r0.x).toBeLessThan(r1.x);
    expect(r0.y).toBe(LAYOUT_HEADER_HEIGHT + 8);
    expect(r0.width).toBeGreaterThan(0);
    expect(r0.height).toBeGreaterThan(0);
  });
});

describe('assignNodeToSlot', () => {
  it('parents child into host slot with relative position', () => {
    const nodes = [
      node('host', { width: 720, height: 480 }),
      node('child', { position: { x: 50, y: 50 } }),
    ];
    const next = assignNodeToSlot(nodes, 'host', 0, 'child');
    const host = next.find((n) => n.id === 'host')!;
    const child = next.find((n) => n.id === 'child')!;
    expect(host.data.layoutSlots?.[0]).toBe('child');
    expect(child.parentId).toBe('host');
    expect(child.extent).toBe('parent');
    expect(child.data.slotIndex).toBe(0);
    expect(child.position.x).toBeGreaterThanOrEqual(0);
  });

  it('bumps host to minimum layout size', () => {
    const nodes = [node('host', { width: 100, height: 100 }), node('child')];
    const next = assignNodeToSlot(nodes, 'host', 4, 'child');
    const host = next.find((n) => n.id === 'host')!;
    expect(host.width).toBe(HOST_MIN_WIDTH);
    expect(host.height).toBe(HOST_MIN_HEIGHT);
    expect(host.data.layoutHost).toBe(true);
  });

  it('replaces prior occupant by unparenting them', () => {
    const nodes = [
      node('host', {
        width: 720,
        height: 480,
        data: { kind: 'host', title: 'host', layoutSlots: emptyLayoutSlots() },
      }),
      node('a'),
      node('b'),
    ];
    let next = assignNodeToSlot(nodes, 'host', 0, 'a');
    next = assignNodeToSlot(next, 'host', 0, 'b');
    const a = next.find((n) => n.id === 'a')!;
    const b = next.find((n) => n.id === 'b')!;
    expect(a.parentId).toBeUndefined();
    expect(b.parentId).toBe('host');
    expect(next.find((n) => n.id === 'host')!.data.layoutSlots?.[0]).toBe('b');
  });

  it('blocks self-nesting and cycles', () => {
    const nodes = [node('host'), node('child', { parentId: 'host' })];
    expect(assignNodeToSlot(nodes, 'host', 0, 'host')).toBe(nodes);
    expect(wouldCreateLayoutCycle(nodes, 'child', 'host')).toBe(true);
  });
});

describe('removeNodeFromSlot', () => {
  it('unparents child and clears host slot', () => {
    let nodes = [node('host', { width: 720, height: 480 }), node('child')];
    nodes = assignNodeToSlot(nodes, 'host', 2, 'child');
    const next = removeNodeFromSlot(nodes, 'child');
    expect(next.find((n) => n.id === 'child')!.parentId).toBeUndefined();
    expect(next.find((n) => n.id === 'host')!.data.layoutSlots).toBeUndefined();
  });
});

describe('relayoutHostSlots', () => {
  it('updates child geometry when host grows', () => {
    let nodes = [node('host', { width: 720, height: 480 }), node('child')];
    nodes = assignNodeToSlot(nodes, 'host', 0, 'child');
    const before = nodes.find((n) => n.id === 'child')!.width;
    nodes = nodes.map((n) => (n.id === 'host' ? { ...n, width: 900, height: 600 } : n));
    const next = relayoutHostSlots(nodes, 'host');
    const after = next.find((n) => n.id === 'child')!.width;
    expect(after).toBeGreaterThan(before!);
  });
});

describe('unparentOnHostDelete', () => {
  it('releases slotted children when host is removed', () => {
    let nodes = [node('host', { width: 720, height: 480 }), node('child')];
    nodes = assignNodeToSlot(nodes, 'host', 0, 'child');
    const next = unparentOnHostDelete(nodes, new Set(['host']));
    expect(next.find((n) => n.id === 'child')!.parentId).toBeUndefined();
  });
});

describe('sortNodesParentFirst', () => {
  it('places parent before child in the array', () => {
    const nodes = [
      node('child', { parentId: 'host', data: { kind: 'child', title: 'child', slotIndex: 0 } }),
      node('host', { width: HOST_MIN_WIDTH, height: HOST_MIN_HEIGHT }),
    ];
    const sorted = sortNodesParentFirst(nodes);
    expect(sorted.map((n) => n.id)).toEqual(['host', 'child']);
  });
});

describe('findLayoutSlotAtPoint', () => {
  it('returns null when no slot element exists', () => {
    expect(findLayoutSlotAtPoint(0, 0)).toBeNull();
  });
});
