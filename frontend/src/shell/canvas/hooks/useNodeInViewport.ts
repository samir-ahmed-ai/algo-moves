import { useStore, type ReactFlowState } from '@xyflow/react';

/** True when the node intersects the current React Flow viewport (with padding). */
export function useNodeInViewport(nodeId: string, padding = 48): boolean {
  return useStore((state: ReactFlowState) => {
    const node = state.nodeLookup.get(nodeId);
    if (!node || node.hidden) return false;
    const { transform, width, height, nodeOrigin } = state;
    const [tx, ty, zoom] = transform;
    const vpW = width / zoom;
    const vpH = height / zoom;
    const vpX = -tx / zoom;
    const vpY = -ty / zoom;
    const origin = nodeOrigin ?? [0, 0];
    const w = node.measured?.width ?? node.width ?? 0;
    const h = node.measured?.height ?? node.height ?? 0;
    const nx = node.internals.positionAbsolute.x - w * origin[0];
    const ny = node.internals.positionAbsolute.y - h * origin[1];
    return (
      nx + w >= vpX - padding &&
      nx <= vpX + vpW + padding &&
      ny + h >= vpY - padding &&
      ny <= vpY + vpH + padding
    );
  });
}
