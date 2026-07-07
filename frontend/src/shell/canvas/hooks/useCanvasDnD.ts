import {
  useCallback,
  type DragEvent,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { Edge } from '@xyflow/react';
import type { CanvasMode, ProblemPlugin } from '../../../core';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { createPanelByType } from '@/core/panelRegistry';
import { createEffectByType } from '../nodes/EffectNode';
import { EFFECT_DND_KEY } from '../../../hooks/useDragAndDrop';
import {
  edgesForKind,
  isMultiInstancePanel,
  nodeForKind,
  styleEdges,
  type EdgeOpts,
} from '../layout/layout';
import { readProblemDrop } from '../nodes/problemDnD';
import { sizeOf } from '../tokens';

/** MIME type for dragging a removed panel back onto the canvas. */
export const DND_KEY = 'application/algomove';

export { PROBLEM_DND_KEY, readProblemDrop } from '../nodes/problemDnD';

/**
 * Node + edges to insert for an added kind — shared by the click path (addKind)
 * and the drop path so multi-instance panels behave identically in both.
 * Multi-instance kinds always spawn a fresh node (unique id); singleton kinds
 * dedupe against the current nodes and return null when already present.
 */
export function insertionForKind({
  plugin,
  mode,
  kind,
  position,
  nodes,
  edges,
  edgeOpts,
}: {
  plugin: ProblemPlugin<any, any>;
  mode: CanvasMode;
  kind: string;
  position: { x: number; y: number };
  nodes: { id: string }[];
  edges: Edge[];
  edgeOpts: EdgeOpts;
}): { node: PanelFlowNode; newEdges: Edge[] } | null {
  if (!kind) return null;
  const multi = isMultiInstancePanel(kind);
  if (!multi && nodes.some((n) => n.id === kind)) return null;
  let node: PanelFlowNode;
  if (multi) {
    node = createPanelByType(kind, position) as PanelFlowNode;
    node.width = sizeOf(kind).w;
  } else {
    node = nodeForKind(plugin, kind, position);
  }
  const present = new Set([...nodes.map((n) => n.id), node.id]);
  const newEdges = styleEdges(edgesForKind(plugin, mode, kind, present), edgeOpts).filter(
    (ne) => !edges.some((ee) => ee.id === ne.id),
  );
  return { node, newEdges };
}

/**
 * Canvas drag-and-drop, extracted from CanvasStage: drop a removed panel (or an
 * effect from the palette) back onto the pane at the pointer, wiring its edges.
 */
export function useCanvasDnD({
  plugin,
  mode,
  historyKey,
  edgeOpts,
  edges,
  screenToFlowPosition,
  setNodes,
  setEdges,
  setDragOver,
  nodesRef,
  removedRef,
  onProblemDrop,
}: {
  plugin: ProblemPlugin<any, any>;
  mode: CanvasMode;
  historyKey: string;
  edgeOpts: EdgeOpts;
  edges: Edge[];
  screenToFlowPosition: (p: { x: number; y: number }) => { x: number; y: number };
  setNodes: Dispatch<SetStateAction<PanelFlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setDragOver: Dispatch<SetStateAction<boolean>>;
  nodesRef: MutableRefObject<PanelFlowNode[]>;
  removedRef: MutableRefObject<Record<string, Set<string>>>;
  /** Scaffold: problem dragged from browse onto the canvas. */
  onProblemDrop?: (itemId: string, position: { x: number; y: number }) => void;
}) {
  const onDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    },
    [setDragOver],
  );

  const onDragLeave = useCallback(() => setDragOver(false), [setDragOver]);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const problemId = readProblemDrop(e.dataTransfer);
      if (problemId) {
        onProblemDrop?.(problemId, position);
        return;
      }

      const effectId = e.dataTransfer.getData(EFFECT_DND_KEY);
      if (effectId) {
        const node = createEffectByType(effectId, position);
        setNodes((nds) => [...nds, node as unknown as PanelFlowNode]);
        return;
      }

      const kind = e.dataTransfer.getData(DND_KEY);
      const insertion = insertionForKind({
        plugin,
        mode,
        kind,
        position,
        nodes: nodesRef.current,
        edges,
        edgeOpts,
      });
      if (!insertion) return;
      removedRef.current[historyKey]?.delete(kind);
      setNodes((nds) => [...nds, insertion.node]);
      if (insertion.newEdges.length) setEdges((eds) => [...eds, ...insertion.newEdges]);
    },

    [
      plugin,
      mode,
      historyKey,
      edgeOpts,
      edges,
      screenToFlowPosition,
      setNodes,
      setEdges,
      onProblemDrop,
    ],
  );

  return { onDragOver, onDragLeave, onDrop };
}
