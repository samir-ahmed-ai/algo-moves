import type { PanelFlowNode, PanelNodeData } from './PanelNode';

/** Toggle panel minimize; restores `fullHeight` when expanding. */
export function togglePanelCollapse(n: PanelFlowNode, minHeight = 36): PanelFlowNode {
  const d = n.data as PanelNodeData;
  if (d.collapsed) {
    const { fullHeight, ...rest } = d;
    return {
      ...n,
      height: fullHeight ?? n.height,
      data: { ...rest, collapsed: false },
    };
  }
  return {
    ...n,
    height: minHeight,
    data: { ...d, collapsed: true, fullHeight: n.height ?? undefined },
  };
}
