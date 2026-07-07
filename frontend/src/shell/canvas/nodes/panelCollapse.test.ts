import { describe, expect, it } from 'vitest';
import type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';
import { togglePanelCollapse } from './panelCollapse';

function panel(data: PanelNodeData, overrides: Partial<PanelFlowNode> = {}): PanelFlowNode {
  return {
    id: 'n1',
    type: 'panel',
    position: { x: 0, y: 0 },
    width: 400,
    height: 400,
    data,
    ...overrides,
  } as PanelFlowNode;
}

describe('togglePanelCollapse', () => {
  it('collapses to min height and stores fullHeight', () => {
    const n = panel({ kind: 'viz', title: 'Viz', collapsed: false }, { height: 480 });
    const out = togglePanelCollapse(n);

    expect(out.height).toBe(36);
    expect(out.data.collapsed).toBe(true);
    expect(out.data.fullHeight).toBe(480);
  });

  it('restores fullHeight when expanding', () => {
    const n = panel(
      { kind: 'problem', title: 'Problem', collapsed: true, fullHeight: 520 },
      { height: 36 },
    );
    const out = togglePanelCollapse(n);

    expect(out.height).toBe(520);
    expect(out.data.collapsed).toBe(false);
    expect(out.data.fullHeight).toBeUndefined();
  });

  it('respects custom min height', () => {
    const n = panel({ kind: 'problem', title: 'Problem', collapsed: false }, { height: 200 });
    const out = togglePanelCollapse(n, 48);

    expect(out.height).toBe(48);
    expect(out.data.fullHeight).toBe(200);
  });

  it('preserves lock and accent while toggling collapse', () => {
    const n = panel(
      { kind: 'viz', title: 'Viz', collapsed: false, locked: true, accent: '#3b82f6' },
      { height: 300 },
    );
    const collapsed = togglePanelCollapse(n);
    const expanded = togglePanelCollapse(collapsed);

    expect(expanded.data.locked).toBe(true);
    expect(expanded.data.accent).toBe('#3b82f6');
    expect(expanded.height).toBe(300);
  });
});
