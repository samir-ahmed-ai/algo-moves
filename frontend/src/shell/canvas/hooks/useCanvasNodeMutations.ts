import { useCallback, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { togglePanelCollapse } from '../nodes/panelCollapse';
import type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';
import { ACCENTS } from '../layout/layout';

/**
 * Per-node mutation handlers, extracted from CanvasStage. These depend only on the
 * ReactFlow node/edge setters, so they're the cleanly-separable slice of the node
 * actions (the focus/navigation callbacks stay in CanvasStage — they need the full
 * layout/plugin context). Used by the node context menu and node-header controls.
 */
export function useCanvasNodeMutations({
  setNodes,
  setEdges,
}: {
  setNodes: Dispatch<SetStateAction<PanelFlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}) {
  const onNodeClick = useCallback(
    (e: MouseEvent, n: Node) => {
      const t = e.target as HTMLElement;
      if (t.closest('.nodrag') || t.closest('button, input, textarea, .cm-editor')) return;
      setNodes((nds) => nds.map((node) => ({ ...node, selected: node.id === n.id })));
    },
    [setNodes],
  );

  const recolorNode = useCallback(
    (id: string) =>
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const cur = ACCENTS.indexOf((n.data.accent as string) ?? '');
          return { ...n, data: { ...n.data, accent: ACCENTS[(cur + 1) % ACCENTS.length] } };
        }),
      ),
    [setNodes],
  );
  const minimizeNode = useCallback(
    (id: string) => setNodes((nds) => nds.map((n) => (n.id === id ? togglePanelCollapse(n as PanelFlowNode) : n))),
    [setNodes],
  );
  const removeNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges],
  );

  const toggleNodeLock = useCallback(
    (id: string) =>
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const d = n.data as PanelNodeData;
          const next = !d.locked;
          return { ...n, draggable: !next, data: { ...d, locked: next } };
        }),
      ),
    [setNodes],
  );

  return { onNodeClick, recolorNode, minimizeNode, removeNode, toggleNodeLock };
}
