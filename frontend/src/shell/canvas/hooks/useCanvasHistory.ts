import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { styleSig, type PanelNodeStyle } from '../nodes/panelStyle';

/**
 * Undo/redo of canvas edits (#82), extracted from CanvasStage.
 *
 * Records a structural snapshot of (nodes, edges) whenever they change — but ignores
 * `selected`/`dragging` so merely clicking a node is not undoable. `applyingRef`
 * coordinates with restore so re-applying a snapshot doesn't record a new entry.
 * Returns the pointer refs too, so the HUD can read live canUndo/canRedo.
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
  const historyRef = useRef<{ nodes: PanelFlowNode[]; edges: Edge[] }[]>([]);
  const histIdxRef = useRef(-1);
  const applyingRef = useRef(false);
  const lastSigRef = useRef('');
  const [, bumpHist] = useState(0); // mirror history pointer into render so the toolbar enable-state is live

  // Structural signature — ignores `selected`/`dragging` so merely clicking a node
  // is NOT recorded as an undoable edit (only moves/resizes/add/remove/recolour count).
  const sigOf = (ns: PanelFlowNode[], es: Edge[]) =>
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
    ]);

  useEffect(() => {
    if (builtKeyRef.current !== historyKey) return;
    if (nodes.some((n) => n.dragging)) return;
    if (applyingRef.current) {
      applyingRef.current = false;
      return;
    }
    const s = sigOf(nodes, edges);
    if (s === lastSigRef.current) return; // selection-only / no structural change
    lastSigRef.current = s;
    const snap = { nodes: nodes.map((n) => ({ ...n })), edges: edges.map((e) => ({ ...e })) };
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 60) historyRef.current.shift();
    histIdxRef.current = historyRef.current.length - 1;
    bumpHist((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, historyKey]);

  const restore = useCallback(
    (idx: number) => {
      const snap = historyRef.current[idx];
      if (!snap) return;
      histIdxRef.current = idx;
      applyingRef.current = true;
      lastSigRef.current = sigOf(snap.nodes, snap.edges);
      setNodes(snap.nodes.map((n) => ({ ...n })));
      setEdges(snap.edges.map((e) => ({ ...e })));
      bumpHist((v) => v + 1);
    },
    [setNodes, setEdges],
  );
  const undo = useCallback(() => {
    if (histIdxRef.current > 0) restore(histIdxRef.current - 1);
  }, [restore]);
  const redo = useCallback(() => {
    if (histIdxRef.current < historyRef.current.length - 1) restore(histIdxRef.current + 1);
  }, [restore]);

  /** Clear history — called on mode/plugin switch (the rebuilt canvas is a fresh baseline). */
  const resetHistory = useCallback(() => {
    historyRef.current = [];
    histIdxRef.current = -1;
    lastSigRef.current = '';
  }, []);

  return { historyRef, histIdxRef, undo, redo, resetHistory };
}
