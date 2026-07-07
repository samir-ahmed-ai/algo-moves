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
import { createEffectByType } from '../nodes/EffectNode';
import { EFFECT_DND_KEY } from '../../../hooks/useDragAndDrop';
import { edgesForKind, nodeForKind, styleEdges, type EdgeOpts } from '../layout/layout';
import { readProblemDrop } from '../nodes/problemDnD';

/** MIME type for dragging a removed panel back onto the canvas. */
export const DND_KEY = 'application/algomove';

export { PROBLEM_DND_KEY, readProblemDrop } from '../nodes/problemDnD';

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
      if (!kind || nodesRef.current.some((n) => n.id === kind)) return;
      removedRef.current[historyKey]?.delete(kind);
      const node = nodeForKind(plugin, kind, position);
      const present = new Set([...nodesRef.current.map((n) => n.id), kind]);
      const newEdges = styleEdges(edgesForKind(plugin, mode, kind, present), edgeOpts).filter(
        (ne) => !edges.some((ee) => ee.id === ne.id),
      );
      setNodes((nds) => [...nds, node]);
      if (newEdges.length) setEdges((eds) => [...eds, ...newEdges]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
