import { describe, expect, it } from 'vitest';
import type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';
import { CANVAS_MARGIN, layoutVisualizeCanvas } from './layout';

function panel(kind: string, overrides: Partial<PanelFlowNode> = {}): PanelFlowNode {
  return {
    id: kind,
    type: 'panel',
    position: { x: 0, y: 0 },
    width: kind === 'workbench' ? 1400 : 400,
    height: kind === 'workbench' ? 800 : 100,
    data: { kind, title: kind } as PanelNodeData,
    ...overrides,
  } as PanelFlowNode;
}

describe('layoutVisualizeCanvas', () => {
  it('fills the viewport with the workbench node', () => {
    const viewport = { width: 1200, height: 800 };
    const laid = layoutVisualizeCanvas([panel('workbench')], { viewport });
    const wb = laid.find((n) => n.data.kind === 'workbench')!;

    expect(wb.position).toEqual({ x: CANVAS_MARGIN, y: CANVAS_MARGIN });
    expect(wb.width).toBe(viewport.width - CANVAS_MARGIN * 2);
    expect(wb.height).toBe(800);
  });

  it('lays optional panels to the right of the workbench', () => {
    const viewport = { width: 1200, height: 800 };
    const laid = layoutVisualizeCanvas([panel('workbench'), panel('notes')], { viewport });
    const wb = laid.find((n) => n.data.kind === 'workbench')!;
    const notes = laid.find((n) => n.data.kind === 'notes')!;

    expect(notes.position.x).toBeGreaterThan(wb.position.x + (wb.width ?? 0));
    expect(notes.position.y).toBeCloseTo(CANVAS_MARGIN + (800 - 100) / 2, 0);
  });

  it('lays out nodes in a row when no workbench is present', () => {
    const laid = layoutVisualizeCanvas([panel('notes'), panel('whiteboard')]);
    expect(laid).toHaveLength(2);
    expect(laid[1].position.x).toBeGreaterThan(laid[0].position.x);
  });
});
