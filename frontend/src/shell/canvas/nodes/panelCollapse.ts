import type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';

function safeHeight(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! > 0 ? Math.round(value!) : fallback;
}

/** Toggle panel minimize; restores `fullHeight` when expanding. */
export function togglePanelCollapse(n: PanelFlowNode, minHeight = 36): PanelFlowNode {
  const d = n.data as PanelNodeData;
  const collapsedHeight = safeHeight(minHeight, 36);
  if (d.collapsed) {
    const { fullHeight, ...rest } = d;
    return {
      ...n,
      height: safeHeight(fullHeight ?? n.height, collapsedHeight),
      data: { ...rest, collapsed: false },
    };
  }
  return {
    ...n,
    height: collapsedHeight,
    data: { ...d, collapsed: true, fullHeight: Number.isFinite(n.height) ? n.height : undefined },
  };
}
