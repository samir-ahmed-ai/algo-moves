import type { XYPosition } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';

/** Shift an assembled frame so its top-left corner sits at the drop pointer. */
export function anchorFrameAtPointer(nodes: PanelFlowNode[], anchor: XYPosition): PanelFlowNode[] {
  if (nodes.length === 0) return nodes;
  const minX = Math.min(...nodes.map((n) => n.position.x));
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const dx = anchor.x - minX;
  const dy = anchor.y - minY;
  if (dx === 0 && dy === 0) return nodes;
  return nodes.map((n) => ({
    ...n,
    position: { x: n.position.x + dx, y: n.position.y + dy },
  }));
}
