import { describe, expect, it } from 'vitest';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { anchorFrameAtPointer } from './framePlacement';

function node(id: string, x: number, y: number): PanelFlowNode {
  return { id, type: 'panel', position: { x, y }, data: { kind: id, title: id } };
}

describe('anchorFrameAtPointer', () => {
  it('shifts all nodes so the frame top-left matches the anchor', () => {
    const nodes = [node('workbench', 10, 20), node('viz', 400, 20)];
    const anchored = anchorFrameAtPointer(nodes, { x: 100, y: 200 });
    expect(anchored[0]?.position).toEqual({ x: 100, y: 200 });
    expect(anchored[1]?.position).toEqual({ x: 490, y: 200 });
  });
});
