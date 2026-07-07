import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { Edge } from '@xyflow/react';
import type { CanvasMode, Frame, Player, ProblemPlugin } from '@/core';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { saveCanvasPrefs } from '@/store/canvas-layout';
import {
  buildEdges,
  edgeConnectionLabel,
  modeNodeIds,
  REQUIRED_VISUALIZE_EDGES,
  standaloneNodeIds,
  styleEdges,
  type BgVariant,
  type EdgeOpts,
  type LayoutDir,
  type LayoutVisualizeOptions,
} from '../layout/layout';
import { buildCanvasFrame, organizeCurrentCanvasFrameAsync } from '../frame';
import { sanitizeVisualizeEdges } from '../edges';
import { snapNodeLayout } from '../nodes/nodeSnapshot';
import { useCanvasHistory } from './useCanvasHistory';
import type { Saved } from './useCanvasLayoutPersistence';

export type UseCanvasLifecycleOptions = {
  nodes: PanelFlowNode[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<PanelFlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  key: string;
  pluginId: string;
  mode: CanvasMode;
  plugin: ProblemPlugin<any, any>;
  standalone: boolean;
  edgeOpts: EdgeOpts;
  bg: BgVariant;
  dir: LayoutDir;
  layoutRef: MutableRefObject<Record<string, Saved>>;
  removedRef: MutableRefObject<Record<string, Set<string>>>;
  removedEdgesRef: MutableRefObject<Record<string, Set<string>>>;
  viewportRef: MutableRefObject<Record<string, { x: number; y: number; zoom: number }>>;
  setViewport: (
    viewport: { x: number; y: number; zoom: number },
    options?: { duration?: number },
  ) => void;
  persist: () => void;
  buildFor: (m: CanvasMode, k: string) => { nodes: PanelFlowNode[]; edges: Edge[] };
  layoutOpts: () => LayoutVisualizeOptions;
  fitCanvas: (duration?: number) => void;
  fitCanvasSignal: number;
  wrapperRef: RefObject<HTMLDivElement | null>;
  collab: { isCollaborating: boolean };
  displayFrames: Frame<any>[];
  player: Player;
  nodesInitialized: boolean;
};

/**
 * CanvasStage lifecycle effects — persistence, history, refit, mode switch, edge
 * reconciliation, and auto-restore. Extracted so CanvasStage stays mostly render wiring.
 */
export function useCanvasLifecycle({
  nodes,
  edges,
  setNodes,
  setEdges,
  key,
  pluginId,
  mode,
  plugin,
  standalone,
  edgeOpts,
  bg,
  dir,
  layoutRef,
  removedRef,
  removedEdgesRef,
  viewportRef,
  setViewport,
  persist,
  buildFor,
  layoutOpts,
  fitCanvas,
  fitCanvasSignal,
  wrapperRef,
  collab,
  displayFrames,
  player,
  nodesInitialized,
}: UseCanvasLifecycleOptions) {
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const prevKeyRef = useRef(key);
  const prevModeRef = useRef<CanvasMode>(mode);
  const builtKeyRef = useRef(key);
  const mounted = useRef(false);
  const didInitialFit = useRef(false);
  const edgeMounted = useRef(false);
  const autoRestoredProblemCanvasRef = useRef(new Set<string>());

  useEffect(() => {
    setEdges((eds) => {
      let changed = false;
      const enriched = eds.map((e) => {
        if ((e.data as { label?: string })?.label) return e;
        changed = true;
        return { ...e, data: { ...e.data, label: edgeConnectionLabel(e, nodes) } };
      });
      if (!changed) return eds;
      return styleEdges(enriched, edgeOpts, nodes);
    });
  }, [nodes, edges, edgeOpts, setEdges]);

  useEffect(() => {
    if (player.index >= displayFrames.length && displayFrames.length > 0) {
      player.goTo(displayFrames.length - 1);
    }
  }, [displayFrames.length, player.index, player.goTo]);

  useEffect(() => {
    if (!nodesInitialized || didInitialFit.current) return;
    didInitialFit.current = true;
    const saved = viewportRef.current[key];
    if (saved) {
      setViewport(saved, { duration: 0 });
      return;
    }
    const id = requestAnimationFrame(() => fitCanvas(0));
    return () => cancelAnimationFrame(id);
  }, [nodesInitialized, fitCanvas, key, setViewport, viewportRef]);

  useEffect(() => {
    if (mode !== 'visualize') return;
    const present = new Set(nodesRef.current.map((n) => n.id));
    const removedEdges = removedEdgesRef.current[key] ?? new Set<string>();
    setEdges((eds) => {
      const next = sanitizeVisualizeEdges(eds, plugin, present, edgeOpts, removedEdges);
      return next.length === eds.length && next.every((e, i) => e.id === eds[i]?.id) ? eds : next;
    });
  }, [plugin, mode, key, edgeOpts, setEdges]);

  useEffect(() => {
    if (builtKeyRef.current !== key || mode !== 'visualize') return;
    if (collab.isCollaborating) return;
    const shellIds = new Set(buildEdges(plugin, mode).map((e) => e.id));
    const present = new Set(edges.filter((e) => shellIds.has(e.id)).map((e) => e.id));
    const removed = new Set<string>();
    for (const id of shellIds) {
      if (!present.has(id) && !REQUIRED_VISUALIZE_EDGES.has(id)) removed.add(id);
    }
    const cur = removedEdgesRef.current[key] ?? new Set<string>();
    const same = removed.size === cur.size && [...removed].every((id) => cur.has(id));
    if (same) return;
    removedEdgesRef.current[key] = removed;
    persist();
  }, [edges, plugin, mode, key, persist, collab.isCollaborating]);

  const { historyRef, histIdxRef, undo, redo, resetHistory } = useCanvasHistory({
    nodes,
    edges,
    historyKey: key,
    builtKeyRef,
    setNodes,
    setEdges,
  });

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const present = nodesRef.current;
    const presentIds = new Set(present.map((n) => n.id));
    const snap: Saved = {};
    present.forEach((n) => {
      snap[n.id] = snapNodeLayout(n);
    });
    layoutRef.current[prevKeyRef.current] = snap;
    const prevNodeIds = standalone ? standaloneNodeIds() : modeNodeIds(plugin, prevModeRef.current);
    removedRef.current[prevKeyRef.current] = new Set(
      prevNodeIds.filter((id) => !presentIds.has(id)),
    );
    prevKeyRef.current = key;
    prevModeRef.current = mode;

    const built = buildFor(mode, key);
    builtKeyRef.current = key;
    resetHistory();
    setNodes(built.nodes);
    setEdges(built.edges);
    const id = requestAnimationFrame(() => fitCanvas());
    return () => cancelAnimationFrame(id);
    // `key` matters for the standalone canvas: switching the plain canvas into
    // the interview variant changes only the key (plugin/mode stay fixed) and
    // must rebuild so the interview board seeds.
  }, [pluginId, mode, key]);

  useEffect(() => {
    saveCanvasPrefs({ edgeOpts, bg });
  }, [edgeOpts, bg]);

  useEffect(() => {
    if (!edgeMounted.current) {
      edgeMounted.current = true;
      return;
    }
    setEdges((eds) => styleEdges(eds, edgeOpts));
  }, [edgeOpts, setEdges]);

  useEffect(() => {
    if (builtKeyRef.current !== key) return;
    if (collab.isCollaborating) return;
    if (nodes.some((n) => n.dragging)) return;
    const snap: Saved = {};
    nodes.forEach((n) => {
      snap[n.id] = snapNodeLayout(n);
    });
    layoutRef.current[key] = snap;
    const presentIds = new Set(nodes.map((n) => n.id));
    const nodeIds = standalone ? standaloneNodeIds() : modeNodeIds(plugin, mode);
    removedRef.current[key] = new Set(nodeIds.filter((id) => !presentIds.has(id)));
    persist();
  }, [
    nodes,
    key,
    plugin,
    mode,
    persist,
    collab.isCollaborating,
    standalone,
    layoutRef,
    removedRef,
  ]);

  const persistViewport = useCallback(
    (vp: { x: number; y: number; zoom: number }) => {
      if (collab.isCollaborating) return;
      viewportRef.current[key] = vp;
      persist();
    },
    [collab.isCollaborating, key, persist, viewportRef],
  );

  const restoreProblemStarterPanels = useCallback(() => {
    if (standalone || mode !== 'visualize') return;
    delete layoutRef.current[key];
    removedRef.current[key] = new Set();
    removedEdgesRef.current[key] = new Set();
    const built = buildCanvasFrame(plugin, mode, {
      seedProblemCanvas: true,
      layoutOpts: layoutOpts(),
      dir,
      edgeOpts,
    });
    if (built.nodes.length === 0) return;
    builtKeyRef.current = key;
    resetHistory();
    setNodes(built.nodes);
    setEdges(built.edges);
    persist();
    requestAnimationFrame(() => fitCanvas());
  }, [
    standalone,
    mode,
    key,
    plugin,
    layoutOpts,
    dir,
    edgeOpts,
    resetHistory,
    setNodes,
    setEdges,
    persist,
    fitCanvas,
    layoutRef,
    removedRef,
    removedEdgesRef,
  ]);

  const suppressAutoRestoreForKey = useCallback(() => {
    if (!standalone && mode === 'visualize') autoRestoredProblemCanvasRef.current.add(key);
  }, [standalone, mode, key]);

  useEffect(() => {
    if (standalone || mode !== 'visualize' || nodes.length > 0) return;
    if (autoRestoredProblemCanvasRef.current.has(key)) return;
    const id = window.setTimeout(() => {
      if (
        collab.isCollaborating ||
        nodesRef.current.length > 0 ||
        autoRestoredProblemCanvasRef.current.has(key)
      )
        return;
      autoRestoredProblemCanvasRef.current.add(key);
      restoreProblemStarterPanels();
    }, 60);
    return () => window.clearTimeout(id);
  }, [standalone, mode, key, nodes.length, collab.isCollaborating, restoreProblemStarterPanels]);

  const reset = useCallback(() => {
    const present = nodesRef.current;
    const presentIds = new Set(present.map((n) => n.id));
    const nodeIds = standalone ? standaloneNodeIds() : modeNodeIds(plugin, mode);
    removedRef.current[key] = new Set(nodeIds.filter((id) => !presentIds.has(id)));
    removedEdgesRef.current[key] = new Set();
    delete layoutRef.current[key];
    const layoutInput = { layoutOpts: layoutOpts(), dir, edgeOpts };
    void organizeCurrentCanvasFrameAsync(plugin, mode, present, layoutInput).then((tidy) => {
      setNodes(tidy.nodes);
      setEdges(tidy.edges);
      requestAnimationFrame(() => fitCanvas());
    });
  }, [
    plugin,
    mode,
    key,
    edgeOpts,
    dir,
    setNodes,
    setEdges,
    fitCanvas,
    layoutOpts,
    standalone,
    layoutRef,
    removedRef,
    removedEdgesRef,
  ]);

  useEffect(() => {
    const id = requestAnimationFrame(() => fitCanvas(200));
    return () => cancelAnimationFrame(id);
  }, [fitCanvasSignal, fitCanvas]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let t: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fitCanvas(150), 150);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (t) window.clearTimeout(t);
    };
  }, [fitCanvas, wrapperRef]);

  const prevDirRef = useRef(dir);
  useEffect(() => {
    if (prevDirRef.current === dir) return;
    prevDirRef.current = dir;
    reset();
  }, [dir, reset]);

  return {
    nodesRef,
    builtKeyRef,
    historyRef,
    histIdxRef,
    undo,
    redo,
    resetHistory,
    restoreProblemStarterPanels,
    suppressAutoRestoreForKey,
    reset,
    persistViewport,
  };
}
