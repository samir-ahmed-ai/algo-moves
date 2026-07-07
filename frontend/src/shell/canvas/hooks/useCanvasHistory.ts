import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { useCanvasHistoryStore, type CanvasHistorySnapshot } from '@/store/canvas';
import { styleSig, type PanelNodeStyle } from '../nodes/panelStyle';

/**
 * Undo/redo of canvas edits (#82), backed by the zustand history slice in store/canvas.
 */
export function useCanvasHistory({
  nodes,
  edges,
  historyKey,
  builtKeyRef,
  setNodes,
  setEdges,
}: {
  nodes: PanelFlowNode[];
  edges: Edge[];
  historyKey: string;
  builtKeyRef: MutableRefObject<string>;
  setNodes: Dispatch<SetStateAction<PanelFlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}) {
  const applyingRef = useRef(false);
  const [, bumpHist] = useState(0);
  const record = useCanvasHistoryStore((s) => s.record);
  const undoStore = useCanvasHistoryStore((s) => s.undo);
  const redoStore = useCanvasHistoryStore((s) => s.redo);
  const resetStore = useCanvasHistoryStore((s) => s.reset);

  const historyRef = useRef<CanvasHistorySnapshot[]>([]);
  const histIdxRef = useRef(-1);

  const syncRefs = useCallback(() => {
    const stack = useCanvasHistoryStore.getState().stacks[historyKey];
    historyRef.current = stack?.history ?? [];
    histIdxRef.current = stack?.index ?? -1;
  }, [historyKey]);

  const sigOf = useCallback(
    (ns: PanelFlowNode[], es: Edge[]) =>
      JSON.stringify([
        ns.map((n) => [
          n.id,
          Math.round(n.position.x),
          Math.round(n.position.y),
          n.width,
          !!n.data.collapsed,
          n.data.accent ?? '',
          styleSig(n.data.style as PanelNodeStyle | undefined),
        ]),
        es.map((e) => [e.id, e.source, e.target]),
      ]),
    [],
  );

  useEffect(() => {
    if (builtKeyRef.current !== historyKey) return;
    if (nodes.some((n) => n.dragging)) return;
    if (applyingRef.current) {
      applyingRef.current = false;
      return;
    }
    if (record(historyKey, sigOf(nodes, edges), nodes, edges)) {
      syncRefs();
      bumpHist((v) => v + 1);
    }
  }, [nodes, edges, historyKey]);

  const restore = useCallback(
    (snap: CanvasHistorySnapshot | null) => {
      if (!snap) return;
      applyingRef.current = true;
      setNodes(snap.nodes.map((n) => ({ ...n, position: { ...n.position } })));
      setEdges(snap.edges.map((e) => ({ ...e })));
      syncRefs();
      bumpHist((v) => v + 1);
    },
    [setNodes, setEdges, syncRefs],
  );

  const undo = useCallback(() => {
    restore(undoStore(historyKey));
  }, [historyKey, undoStore, restore]);

  const redo = useCallback(() => {
    restore(redoStore(historyKey));
  }, [historyKey, redoStore, restore]);

  const resetHistory = useCallback(() => {
    resetStore(historyKey, sigOf(nodes, edges));
    historyRef.current = [];
    histIdxRef.current = -1;
  }, [historyKey, resetStore, nodes, edges, sigOf]);

  syncRefs();

  return { historyRef, histIdxRef, undo, redo, resetHistory };
}
