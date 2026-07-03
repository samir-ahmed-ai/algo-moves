import { cn } from '@/lib/utils/cn';
import { computeInputFrameCounts } from '@/lib/canvas';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { chromeText } from '../chromeUi';
import { onReactFlowError } from './canvasFlowErrors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
  type ConnectionLineComponentProps,
  type Edge,
  type Node,
} from '@xyflow/react';
import { Crosshair, ChevronsDownUp, Trash2, Palette, Maximize, LayoutGrid, Lock } from 'lucide-react';
import type { CanvasMode, Frame, Player, ProblemPlugin } from '../../core';
import { usePlayer } from '../../core';
import type { Item } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { loadCanvasPrefs, saveCanvasPrefs } from '@/store/canvas-layout';
import { togglePanelCollapse } from './panelCollapse';
import { CanvasActionsProvider, CanvasFrameProvider, CanvasStaticProvider } from './CanvasContext';
import { CanvasToolbar } from './CanvasToolbar';
import { PanelNode, panelAccent, type PanelFlowNode, type PanelNodeData } from './PanelNode';
import { RemovableEdge } from './RemovableEdge';
import { ContextMenu, LaserPointer, type MenuItem } from './CanvasTools';
import { CanvasFloatingHud } from './CanvasFloatingHud';
import { TracePreviewPanel } from './TracePreviewPanel';
import { EffectNode, createEffectByType } from './EffectNode';
import { ConnectedComponentsProvider } from '@/lib/canvas';
import { useWorkflowRunner } from '../../hooks/useWorkflowRunner';
import { EFFECT_DND_KEY } from '../../hooks/useDragAndDrop';
import { EFFECTS } from '../../effects/registry';
import { buildMinimalProjectState, sanitizeLoadedNodes } from '@/store/project-state';
import type { ShareState } from '@/store/navigation';
import { applyAlign, applyDistribute, type AlignKind } from './align';
import { FIT_VIEW_DURATION_MS } from './canvasTokens';
import {
  buildEdges,
  buildNodes,
  REQUIRED_VISUALIZE_EDGES,
  connectionLineType,
  edgeConnectionLabel,
  FIT_PADDING,
  FIT_PADDING_FOCUS,
  FIT_PADDING_VIEW,
  edgesForKind,
  kindTitle,
  layoutGraph,
  layoutLearnCanvas,
  modeNodeIds,
  nextPracticePanel,
  sidePanelTabs,
  nodeForKind,
  presetRemoved,
  standaloneNodeIds,
  STANDALONE_CANVAS_KEY,
  styleEdges,
  type BgVariant,
  type LayoutPreset,
} from './layout';
import { snapNodeLayout } from './nodeSnapshot';
import { buildCanvasFrame } from './canvasFrame';
import { sanitizeVisualizeEdges } from './edgeSanitization';
import { useCanvasLayoutPersistence, type Saved } from './useCanvasLayoutPersistence';
import { useCanvasHistory } from './useCanvasHistory';
import { useCanvasKeyboardShortcuts } from './useCanvasKeyboardShortcuts';
import { useCanvasEdgeConnection } from './useCanvasEdgeConnection';
import { useCanvasDnD, DND_KEY } from './useCanvasDnD';
import { useCanvasNodeMutations } from './useCanvasNodeMutations';
import { CanvasCollabProvider, useCanvasCollab } from './collab/CanvasCollabProvider';
import { useCanvasDocSync } from './collab/useCanvasDocSync';
import { useCanvasFollow } from './collab/useCanvasFollow';
import { CanvasCollabOverlays } from './collab/CanvasCollabOverlays';
import { CommentLayer } from './collab/CommentLayer';

const nodeTypes: Record<string, typeof PanelNode> = { panel: PanelNode, effect: EffectNode as unknown as typeof PanelNode };
const edgeTypes = { removable: RemovableEdge };

/** Custom in-progress connection line — a dashed accent curve with an end dot. */
function DashedConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  const midY = (fromY + toY) / 2;
  return (
    <g>
      <path
        d={`M${fromX},${fromY} C ${fromX},${midY} ${toX},${midY} ${toX},${toY}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeDasharray="6 4"
        strokeLinecap="round"
      />
      <circle cx={toX} cy={toY} r={3.5} fill="var(--accent)" />
    </g>
  );
}

/** Tint minimap nodes by their panel accent so kinds stay recognizable. */
function minimapNodeColor(n: Node): string {
  return panelAccent((n.data as PanelNodeData | undefined)?.kind ?? n.id);
}

interface Menu {
  x: number;
  y: number;
  items: MenuItem[];
}

interface CanvasStageProps {
  standalone?: boolean;
  plugin?: ProblemPlugin<any, any>;
  item?: Item;
  inputId?: string;
  setInputId?: (id: string) => void;
  customInput?: unknown;
  setCustomInput?: (v: unknown) => void;
  baseFrames?: Frame<any>[];
  player?: Player;
}

const STUB_PLUGIN = {
  meta: { id: 'standalone', title: 'Canvas' },
  tabs: [],
  wires: {},
  inputs: [],
  record: () => [],
} as unknown as ProblemPlugin<any, any>;

const STUB_ITEM: Item = {
  id: 'canvas',
  kind: 'problem',
  title: 'Canvas',
  tags: [],
  status: 'todo',
  prereqs: [],
  courseId: '',
  topicId: '',
};

function Inner({
  standalone = false,
  plugin: pluginProp,
  item: itemProp,
  inputId: inputIdProp = '',
  setInputId: setInputIdProp = () => {},
  customInput: customInputProp = null,
  setCustomInput: setCustomInputProp = () => {},
  baseFrames: baseFramesProp,
  player: playerProp,
}: CanvasStageProps) {
  const plugin = pluginProp ?? STUB_PLUGIN;
  const item = itemProp ?? STUB_ITEM;
  const internalPlayer = usePlayer(1);
  const player = playerProp ?? internalPlayer;
  const baseFrames = baseFramesProp ?? [];
  const inputId = inputIdProp;
  const setInputId = setInputIdProp;
  const customInput = customInputProp;
  const setCustomInput = setCustomInputProp;
  const {
    mode,
    present,
    dir,
    layoutPreset,
    setLayoutPreset,
    setSidePanelTab,
    setCanvasAdd,
    setCanvasProject,
    setCanvasHud,
    setMode,
    theme,
    palette,
    themePreset,
    fitCanvasSignal,
    requestFitCanvas,
    toggleFocusCanvas,
    setPresent,
    setRightOpen,
    setRightTab,
    enterProblemInMode,
  } = useWorkspace();
  const pluginId = plugin.meta.id;
  const key = standalone ? STANDALONE_CANVAS_KEY : `${pluginId}:${mode}`;
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  useEffect(() => {
    setSelectedNode(null);
  }, [pluginId]);
  const inputFrameCounts = useMemo(() => computeInputFrameCounts(plugin), [plugin]);
  const savedCanvasPrefs = useRef(loadCanvasPrefs()).current;
  const [edgeOpts, setEdgeOpts] = useState(savedCanvasPrefs.edgeOpts);
  const [bg, setBg] = useState<BgVariant>(savedCanvasPrefs.bg);
  const [snap, setSnap] = useState(false);

  // Per-(plugin, mode) persistence: dragged positions/resizes + which panels were trash-removed.
  const { layoutRef, removedRef, removedEdgesRef, persist } = useCanvasLayoutPersistence();

  const { fitView, screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const viewportSize = useCallback(() => {
    const r = wrapperRef.current?.getBoundingClientRect();
    return r ? { width: r.width, height: r.height } : { width: 800, height: 600 };
  }, []);

  const layoutOpts = useCallback(
    () => ({
      preset: mode === 'visualize' ? layoutPreset : undefined,
      viewport: mode === 'visualize' ? viewportSize() : undefined,
    }),
    [mode, layoutPreset, viewportSize],
  );

  // Build the node+edge set for a mode, respecting removals, dagre layout, and
  // saved positions/sizes. Pure assembly lives in buildCanvasFrame; this wrapper
  // only supplies the current per-mode removal/layout refs.
  const buildFor = useCallback(
    (m: CanvasMode, k: string): { nodes: PanelFlowNode[]; edges: Edge[] } =>
      buildCanvasFrame(plugin, m, {
        removed: removedRef.current[k],
        removedEdges: removedEdgesRef.current[k],
        saved: layoutRef.current[k],
        layoutOpts: layoutOpts(),
        dir,
        edgeOpts,
      }),
    [plugin, edgeOpts, dir, layoutOpts],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => buildFor(mode, key), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [dragOver, setDragOver] = useState(false);

  // Real-time collaboration: publish/apply the shared document, mirror a
  // followed peer's viewport. Inert (no network) until a session is joined.
  const collab = useCanvasCollab();
  useCanvasDocSync({ nodes, edges, setNodes, setEdges });
  useCanvasFollow();
  const onPanePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!collab.isCollaborating) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      collab.broadcastCursor(p.x, p.y);
    },
    [collab, screenToFlowPosition],
  );

  const displayFrames = useWorkflowRunner({ baseFrames, nodes, edges });

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

  const frame = displayFrames[player.index] ?? displayFrames[0];

  useEffect(() => {
    if (player.index >= displayFrames.length && displayFrames.length > 0) {
      player.goTo(displayFrames.length - 1);
    }
  }, [displayFrames.length, player.index, player.goTo]);

  // Fit content accounting for chrome; allow zoom up to 100%.
  const fitCanvas = useCallback(
    (duration = FIT_VIEW_DURATION_MS) => {
      fitView({ padding: FIT_PADDING, duration, maxZoom: 1.0 });
    },
    [fitView],
  );

  // The <ReactFlow fitView> prop fits before the custom panel nodes are measured,
  // so after a page refresh the view lands mis-fit. Re-fit once ReactFlow reports
  // every node as measured — guarded to fire only on the initial mount (mode/plugin
  // switches run their own fit in the effect below).
  const nodesInitialized = useNodesInitialized();
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!nodesInitialized || didInitialFit.current) return;
    didInitialFit.current = true;
    const id = requestAnimationFrame(() => fitCanvas(0));
    return () => cancelAnimationFrame(id);
  }, [nodesInitialized, fitCanvas]);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const prevKeyRef = useRef(key);
  const prevModeRef = useRef<CanvasMode>(mode);
  const builtKeyRef = useRef(key);
  const mounted = useRef(false);

  // Strip legacy examples edges; restore required problem→viz unless user removed it.
  useEffect(() => {
    if (mode !== 'visualize') return;
    const present = new Set(nodesRef.current.map((n) => n.id));
    const removedEdges = removedEdgesRef.current[key] ?? new Set<string>();
    setEdges((eds) => {
      const next = sanitizeVisualizeEdges(eds, plugin, present, edgeOpts, removedEdges);
      return next.length === eds.length && next.every((e, i) => e.id === eds[i]?.id) ? eds : next;
    });
  }, [plugin, mode, key, edgeOpts, setEdges]);

  // Remember when the user deletes a shell edge (e.g. optional red problem→viz).
  useEffect(() => {
    if (builtKeyRef.current !== key || mode !== 'visualize') return;
    if (collab.isCollaborating) return; // don't persist edges reconciled from a peer
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
  }, [edges, plugin, mode, key, persist]);

  // Snapshot the layout + removals of the mode we leave; build the mode we enter.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // initial fit is handled by the <ReactFlow fitView> prop (measurement-safe)
    }
    const present = nodesRef.current;
    const presentIds = new Set(present.map((n) => n.id));
    const snap: Saved = {};
    present.forEach((n) => {
      snap[n.id] = snapNodeLayout(n);
    });
    layoutRef.current[prevKeyRef.current] = snap;
    const prevNodeIds = standalone ? standaloneNodeIds() : modeNodeIds(plugin, prevModeRef.current);
    removedRef.current[prevKeyRef.current] = new Set(prevNodeIds.filter((id) => !presentIds.has(id)));
    prevKeyRef.current = key;
    prevModeRef.current = mode;

    const built = buildFor(mode, key);
    builtKeyRef.current = key;
    resetHistory();
    setNodes(built.nodes);
    setEdges(built.edges);
    const id = requestAnimationFrame(() => fitCanvas());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginId, mode]);

  useEffect(() => {
    saveCanvasPrefs({ edgeOpts, bg });
  }, [edgeOpts, bg]);

  // Re-style edges when the user changes edge appearance (skip the mount no-op restyle).
  const edgeMounted = useRef(false);
  useEffect(() => {
    if (!edgeMounted.current) {
      edgeMounted.current = true;
      return;
    }
    setEdges((eds) => styleEdges(eds, edgeOpts));
  }, [edgeOpts, setEdges]);

  // Persist the current layout (positions/sizes + removed panels) to localStorage (#73).
  // Skip while a node is actively dragging — write once the drag settles.
  useEffect(() => {
    if (builtKeyRef.current !== key) return; // nodes belong to a key we're leaving — don't save
    if (collab.isCollaborating) return; // shared-doc positions are ephemeral — don't overwrite local layout
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
  }, [nodes, key, plugin, mode, persist, collab.isCollaborating]);

  // ---- undo/redo of canvas edits (#82) ----
  const { historyRef, histIdxRef, undo, redo, resetHistory } = useCanvasHistory({
    nodes,
    edges,
    historyKey: key,
    builtKeyRef,
    setNodes,
    setEdges,
  });

  // Tidy: re-organize the CURRENT panels (keep removals + resizes, forget positions).
  const reset = useCallback(() => {
    const present = nodesRef.current;
    const presentIds = new Set(present.map((n) => n.id));
    const nodeIds = standalone ? standaloneNodeIds() : modeNodeIds(plugin, mode);
    removedRef.current[key] = new Set(nodeIds.filter((id) => !presentIds.has(id)));
    removedEdgesRef.current[key] = new Set();
    delete layoutRef.current[key];
    const sizeById = new Map(present.map((n) => [n.id, { width: n.width }]));
    let kept = buildNodes(plugin, mode)
      .filter((n) => presentIds.has(n.id))
      .map((n) => {
        const s = sizeById.get(n.id);
        return s ? { ...n, width: s.width ?? n.width } : n;
      });
    const raw = buildEdges(plugin, mode).filter((e) => presentIds.has(e.source) && presentIds.has(e.target));
    kept = mode === 'visualize'
      ? layoutGraph(kept, raw, dir)
      : mode === 'learn'
        ? layoutLearnCanvas(kept, raw)
        : layoutGraph(kept, raw, dir);
    setNodes(kept);
    setEdges(styleEdges(raw, edgeOpts));
    requestAnimationFrame(() => fitCanvas());
  }, [plugin, mode, key, edgeOpts, dir, setNodes, setEdges, fitCanvas, layoutOpts]);

  // Re-fit when chrome dimensions change or focus-canvas toggles.
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
  }, [fitCanvas]);

  // Re-layout the current panels only when the direction actually toggles (TB ↔ LR) (#75).
  const prevDirRef = useRef(dir);
  useEffect(() => {
    if (prevDirRef.current === dir) return;
    prevDirRef.current = dir;
    reset();
  }, [dir, reset]);

  // Apply a named layout preset (#74): set which panels are shown, then re-organize.
  const applyPreset = useCallback(
    (preset: LayoutPreset) => {
      setLayoutPreset(preset);
      removedRef.current[key] = new Set(presetRemoved(plugin, mode, preset));
      delete layoutRef.current[key];
      const built = buildFor(mode, key);
      builtKeyRef.current = key;
      setNodes(built.nodes);
      setEdges(built.edges);
      persist();
      if (preset === 'Theater' || preset === 'Demo') {
        setRightOpen(true);
        setRightTab('canvas');
      }
      if (preset === 'Demo') {
        setPresent(true);
      }
      requestFitCanvas();
      requestAnimationFrame(() => fitCanvas());
    },
    [plugin, mode, key, buildFor, setNodes, setEdges, persist, fitCanvas, setLayoutPreset, setRightOpen, setRightTab, setPresent, requestFitCanvas],
  );

  // Keyboard: undo/redo (#82); plain 'z' zoom-to-fit/selection (#77); 'c' focus-canvas.
  useCanvasKeyboardShortcuts({ fitView, undo, redo, toggleFocusCanvas, nodesRef });

  // ---- drag a removed panel back onto the canvas ----
  const onProblemDrop = useCallback(
    (itemId: string, _position: { x: number; y: number }) => {
      // Scaffold: load problem in visualize mode; full frame placement at pointer is deferred.
      enterProblemInMode(itemId, 'visualize');
    },
    [enterProblemInMode],
  );

  const { onDragOver, onDragLeave, onDrop } = useCanvasDnD({
    plugin,
    mode,
    historyKey: key,
    edgeOpts,
    edges,
    screenToFlowPosition,
    setNodes,
    setEdges,
    setDragOver,
    nodesRef,
    removedRef,
    onProblemDrop,
  });

  const addableKinds = useMemo(() => {
    const present = new Set(nodes.map((n) => n.id));
    const ids = standalone ? standaloneNodeIds() : modeNodeIds(plugin, mode);
    return ids
      .filter((id) => !present.has(id))
      .map((id) => ({ id, title: kindTitle(plugin, id) }));
  }, [nodes, plugin, mode, standalone]);

  // ---- interaction state: lock / connect mode / scroll-pan / context menu ----
  // (wrapperRef is declared near the top, beside fitCanvas.)
  const [lock, setLock] = useState(false);
  const [scrollPan] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const selCount = nodes.filter((n) => n.selected).length;

  const menuPos = (e: { clientX: number; clientY: number }) => {
    const r = wrapperRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  // Click-to-add from the ＋ menu — mirrors onDrop but drops at the pane center
  // (drag still works; this is the no-aim path). Focuses the new node.
  const addKind = useCallback(
    (kind: string) => {
      if (!kind || nodesRef.current.some((n) => n.id === kind)) return;
      removedRef.current[key]?.delete(kind);
      const r = wrapperRef.current?.getBoundingClientRect();
      const center = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 240, y: 240 };
      const position = screenToFlowPosition(center);
      const node = nodeForKind(plugin, kind, position);
      const present = new Set([...nodesRef.current.map((n) => n.id), kind]);
      const newEdges = styleEdges(edgesForKind(plugin, mode, kind, present), edgeOpts).filter(
        (ne) => !edges.some((ee) => ee.id === ne.id),
      );
      setNodes((nds) => [...nds, node]);
      if (newEdges.length) setEdges((eds) => [...eds, ...newEdges]);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => fitView({ padding: FIT_PADDING_FOCUS, duration: FIT_VIEW_DURATION_MS, nodes: [{ id: kind }] })),
      );
    },
    [plugin, mode, key, edgeOpts, edges, screenToFlowPosition, setNodes, setEdges, fitView],
  );

  const addEffect = useCallback(
    (effectId: string) => {
      const r = wrapperRef.current?.getBoundingClientRect();
      const center = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 240, y: 240 };
      const position = screenToFlowPosition(center);
      const node = createEffectByType(effectId, position);
      setNodes((nds) => [...nds, node as unknown as PanelFlowNode]);
    },
    [screenToFlowPosition, setNodes],
  );

  useEffect(() => {
    setCanvasAdd({
      addableKinds,
      addableEffects: EFFECTS.map((e) => ({ id: e.meta.id, title: e.meta.title })),
      dndKey: DND_KEY,
      effectDndKey: EFFECT_DND_KEY,
      onAddKind: addKind,
      onAddEffect: addEffect,
    });
    return () => setCanvasAdd(null);
  }, [addableKinds, addKind, addEffect, setCanvasAdd]);

  const shareSnapshot = useCallback(
    (): ShareState => ({
      ...(standalone ? { focus: 'canvas' as const } : { item: item.id, input: inputId || undefined, focus: 'problem' as const }),
      mode,
      theme,
      palette,
      themePreset,
      dir,
    }),
    [standalone, item.id, inputId, mode, theme, palette, themePreset, dir],
  );

  const getProjectState = useCallback(
    () =>
      buildMinimalProjectState(shareSnapshot(), mode, nodesRef.current as Node[], edges, {
        removedPanels: [...(removedRef.current[key] ?? [])],
        removedEdges: [...(removedEdgesRef.current[key] ?? [])],
        speed: player.speed,
      }),
    [shareSnapshot, mode, key, edges, player.speed],
  );

  const applyProjectState = useCallback(
    (state: ReturnType<typeof buildMinimalProjectState>) => {
      if (state.removedPanels) removedRef.current[key] = new Set(state.removedPanels);
      if (state.removedEdges) removedEdgesRef.current[key] = new Set(state.removedEdges);
      if (state.nodes.length > 0) {
        const loadedNodes = sanitizeLoadedNodes(state.nodes) as PanelFlowNode[];
        setNodes(loadedNodes);
        setEdges(styleEdges(state.edges, edgeOpts, loadedNodes));
      }
      if (state.speed != null) player.setSpeed(state.speed);
      persist();
      requestFitCanvas();
    },
    [key, edgeOpts, persist, player.setSpeed, setNodes, setEdges, requestFitCanvas],
  );

  const applyWorkflowPreset = useCallback(
    (preset: { mode: CanvasMode; layoutPreset: LayoutPreset; ensurePanels?: string[] }) => {
      if (preset.mode !== mode) setMode(preset.mode);
      if (preset.ensurePanels?.length) {
        const removed = removedRef.current[key] ?? new Set<string>();
        for (const id of preset.ensurePanels) removed.delete(id);
        removedRef.current[key] = removed;
      }
      applyPreset(preset.layoutPreset);
      preset.ensurePanels?.forEach((id) => {
        if (!nodesRef.current.some((n) => n.id === id)) addKind(id);
      });
    },
    [mode, key, setMode, applyPreset, addKind],
  );

  useEffect(() => {
    setCanvasProject({ getProjectState, applyProjectState, applyWorkflowPreset });
    return () => setCanvasProject(null);
  }, [getProjectState, applyProjectState, applyWorkflowPreset, setCanvasProject]);

  // Edge connect / reconnect / validation.
  const { onConnect, onReconnectStart, onReconnect, onReconnectEnd, isValidConnection } =
    useCanvasEdgeConnection({ nodes, edges, edgeOpts, setEdges });

  const align = useCallback((a: AlignKind) => setNodes((nds) => applyAlign(nds as PanelFlowNode[], a)), [setNodes]);
  const distribute = useCallback((d: 'h' | 'v') => setNodes((nds) => applyDistribute(nds as PanelFlowNode[], d)), [setNodes]);

  useEffect(() => {
    setCanvasHud({
      edgeOpts,
      setEdgeOpts,
      bg,
      setBg,
      snap,
      setSnap,
      onPreset: applyPreset,
      onTidy: reset,
      tools: {
        selCount,
        onAlign: align,
        onDistribute: distribute,
        canUndo: histIdxRef.current > 0,
        canRedo: histIdxRef.current < historyRef.current.length - 1,
        onUndo: undo,
        onRedo: redo,
      },
    });
    return () => setCanvasHud(null);
  }, [
    edgeOpts,
    setEdgeOpts,
    bg,
    setBg,
    snap,
    setSnap,
    applyPreset,
    reset,
    selCount,
    align,
    distribute,
    undo,
    redo,
    setCanvasHud,
  ]);

  const focusNode = useCallback(
    (id: string) => {
      const n = nodesRef.current.find((x) => x.id === id);
      if (n) fitView({ padding: FIT_PADDING_FOCUS, duration: FIT_VIEW_DURATION_MS, nodes: [n] });
    },
    [fitView],
  );

  const ensureAndFocusPanel = useCallback(
    (id: string, nearId?: string) => {
      const zoom = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => focusNode(id));
        });
      };

      const applySelectRelayout = (nds: PanelFlowNode[]) =>
        nds.map((n) => {
          if (n.id === id && n.data.collapsed) return togglePanelCollapse(n);
          return { ...n, selected: n.id === id };
        });

      const existing = nodesRef.current.find((n) => n.id === id);
      if (existing) {
        setNodes((nds) => applySelectRelayout(nds as PanelFlowNode[]));
        zoom();
        return;
      }

      removedRef.current[key]?.delete(id);
      const near = nearId ? nodesRef.current.find((n) => n.id === nearId) : undefined;
      const position = near
        ? { x: near.position.x + (near.width ?? 360) + 40, y: near.position.y }
        : { x: 0, y: 0 };
      const node = nodeForKind(plugin, id, position);
      const present = new Set([...nodesRef.current.map((n) => n.id), id]);
      const newEdges = styleEdges(edgesForKind(plugin, mode, id, present), edgeOpts).filter(
        (ne) => !edges.some((ee) => ee.id === ne.id),
      );
      setNodes((nds) => applySelectRelayout([...(nds as PanelFlowNode[]), { ...node, selected: true }]));
      if (newEdges.length) setEdges((eds) => [...eds, ...newEdges]);
      zoom();
    },
    [plugin, mode, key, edgeOpts, edges, setNodes, setEdges, focusNode, layoutOpts],
  );

  const spawnConnectedPanel = useCallback(
    (panelId: string, fromId: string) => ensureAndFocusPanel(panelId, fromId),
    [ensureAndFocusPanel],
  );

  const advancePractice = useCallback(
    (fromId: string) => {
      const nextId = nextPracticePanel(plugin, mode, fromId);
      if (!nextId) return;
      // A side-dock tab (e.g. Simulate) opens in the dock instead of spawning a canvas node.
      if (sidePanelTabs(plugin, mode).some((t) => t.id === nextId)) setSidePanelTab(nextId);
      else ensureAndFocusPanel(nextId, fromId);
    },
    [plugin, mode, ensureAndFocusPanel, setSidePanelTab],
  );

  const { onNodeClick, recolorNode, minimizeNode, removeNode, toggleNodeLock } =
    useCanvasNodeMutations({ setNodes, setEdges });

  const canvasActions = useMemo(
    () => ({ focusPanel: focusNode, advancePractice, spawnConnectedPanel, layoutVisualizeOptions: layoutOpts }),
    [focusNode, advancePractice, spawnConnectedPanel, layoutOpts],
  );

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault();
      const d = node.data as PanelNodeData;
      const { x, y } = menuPos(e);
      setMenu({
        x,
        y,
        items: [
          { label: 'Focus', icon: <Crosshair className="h-4 w-4" />, onClick: () => focusNode(node.id) },
          { label: 'Recolour', icon: <Palette className="h-4 w-4" />, onClick: () => recolorNode(node.id) },
          { label: d.collapsed ? 'Restore' : 'Minimize', icon: <ChevronsDownUp className="h-4 w-4" />, onClick: () => minimizeNode(node.id) },
          {
            label: d.locked ? 'Unlock panel' : 'Lock panel',
            icon: <Lock className="h-4 w-4" />,
            onClick: () => toggleNodeLock(node.id),
          },
          ...(d.locked
            ? []
            : [{ label: 'Remove panel', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => removeNode(node.id) }]),
        ],
      });
    },
    [focusNode, recolorNode, minimizeNode, removeNode, toggleNodeLock],
  );

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      const { x, y } = menuPos(e);
      setMenu({
        x,
        y,
        items: [
          { label: 'Fit view', icon: <Maximize className="h-4 w-4" />, onClick: () => fitView({ padding: FIT_PADDING_VIEW, duration: FIT_VIEW_DURATION_MS }) },
          { label: 'Tidy layout', icon: <LayoutGrid className="h-4 w-4" />, onClick: () => reset() },
          { label: lock ? 'Unlock canvas' : 'Lock canvas', icon: <Lock className="h-4 w-4" />, onClick: () => setLock((l) => !l) },
        ],
      });
    },
    [fitView, reset, lock],
  );

  // Select-all (⌘A). Undo/redo (⌘Z/⌘Y) are handled by the merged keyboard effect above.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (isEditableTarget(t)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setNodes]);

  const staticValue = useMemo(
    () => ({
      plugin,
      item,
      inputId,
      setInputId,
      customInput,
      setCustomInput,
      inputFrameCounts,
      selectedNode,
      setSelectedNode,
    }),
    [plugin, item, inputId, setInputId, customInput, setCustomInput, inputFrameCounts, selectedNode],
  );
  const frameValue = useMemo(() => ({ frames: displayFrames, player, frame }), [displayFrames, player, frame]);

  const bgVariant =
    bg === 'lines' ? BackgroundVariant.Lines : bg === 'cross' ? BackgroundVariant.Cross : BackgroundVariant.Dots;

  // --- xyflow guards / callbacks --------------------------------------------
  const onBeforeDelete = useCallback(
    async ({ nodes: del }: { nodes: Node[]; edges: Edge[] }) =>
      !del.some((n) => (n.data as PanelNodeData | undefined)?.locked),
    [],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const set = (removedRef.current[key] ??= new Set());
      for (const n of deleted) set.add((n.data as PanelNodeData | undefined)?.kind ?? n.id);
    },
    [key],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const set = (removedEdgesRef.current[key] ??= new Set());
      for (const e of deleted) set.add(e.id);
    },
    [key],
  );

  const onError = useCallback(onReactFlowError, []);

  return (
    <CanvasStaticProvider value={staticValue}>
      <CanvasFrameProvider value={frameValue}>
        <CanvasActionsProvider value={canvasActions}>
        <div className="flex h-full min-h-0 w-full">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={wrapperRef} onPointerMove={onPanePointerMove} className={cn('relative min-h-0 flex-1 bg-bg', dragOver && 'ring-2 ring-inset ring-good/40')}>
          <ConnectedComponentsProvider nodeIds={nodes.map((n) => n.id)} edges={edges}>
          <ReactFlow
            style={{ width: '100%', height: '100%' }}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={(_e, n) => focusNode(n.id)}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onSelectionContextMenu={onPaneContextMenu}
            onPaneClick={() => setMenu(null)}
            onMove={(_e, vp) => {
              setMenu(null);
              if (collab.isCollaborating) collab.broadcastViewport({ x: vp.x, y: vp.y, zoom: vp.zoom });
            }}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onBeforeDelete={onBeforeDelete}
            isValidConnection={isValidConnection}
            onError={onError}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={theme}
            fitView
            fitViewOptions={{ padding: FIT_PADDING, maxZoom: 1.0 }}
            minZoom={0.2}
            maxZoom={1.75}
            nodeClickDistance={5}
            nodeDragThreshold={2}
            paneClickDistance={4}
            reconnectRadius={18}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={!lock}
            nodesDraggable={!lock}
            elementsSelectable={!lock}
            connectOnClick={false}
            autoPanOnNodeDrag
            autoPanOnConnect
            connectionRadius={42}
            connectionLineType={connectionLineType(edgeOpts.pathType)}
            connectionLineComponent={DashedConnectionLine}
            defaultEdgeOptions={{ type: 'removable' }}
            selectionMode={SelectionMode.Partial}
            onlyRenderVisibleElements
            elevateNodesOnSelect
            elevateEdgesOnSelect
            zoomOnDoubleClick={false}
            panOnScroll={scrollPan}
            zoomOnScroll={!scrollPan}
            deleteKeyCode={['Delete', 'Backspace']}
            snapToGrid={snap}
            snapGrid={[16, 16]}
            noDragClassName="nodrag"
            noWheelClassName="nowheel"
            noPanClassName="nopan"
            className="algo-canvas h-full w-full"
          >
            {bg !== 'none' && (
              <Background variant={bgVariant} gap={20} size={1} color="color-mix(in srgb, var(--text) 12%, transparent)" />
            )}
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              nodeColor={minimapNodeColor}
              nodeStrokeWidth={2}
              maskColor="color-mix(in srgb, var(--bg) 62%, transparent)"
              bgColor="color-mix(in srgb, var(--surface) 88%, transparent)"
              className="!bottom-[calc(var(--chrome-bottom,0px)+8px)] !right-2 !m-0 hidden overflow-hidden rounded-md border border-edge shadow-[var(--shadow-md)] lg:block"
              style={{ width: 132, height: 92 }}
            />
            {!present && <CanvasFloatingHud />}
            {!present && <CanvasToolbar lock={lock} onToggleLock={() => setLock((l) => !l)} onTidy={reset} />}
            <CanvasCollabOverlays />
            <CommentLayer />
          </ReactFlow>
          </ConnectedComponentsProvider>

          {lock && (
            <div
              className="pointer-events-none absolute inset-0 z-[5] bg-bg/20 backdrop-blur-[1px]"
              aria-hidden
            />
          )}

          <TracePreviewPanel />

          {menu && !present && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}

          {present && <LaserPointer host={wrapperRef} />}

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className={cn('rounded-lg border border-edge bg-panel/80 px-4 py-2 text-ink2 shadow-sm backdrop-blur', chromeText.base)}>
                Empty canvas — use + in the toolbar or right-click to add panels.
              </p>
            </div>
          )}
        </div>
        </div>
        </div>
        </CanvasActionsProvider>
      </CanvasFrameProvider>
    </CanvasStaticProvider>
  );
}

export function CanvasStage(props: CanvasStageProps) {
  return (
    <CanvasCollabProvider>
      <ReactFlowProvider>
        <div className="h-full min-h-0 w-full">
          <Inner {...props} />
        </div>
      </ReactFlowProvider>
    </CanvasCollabProvider>
  );
}

/** Re-export kept for widget registry / saved-canvas flows (not mounted in standalone canvas). */
export { UnifiedRightSidebar } from './UnifiedRightSidebar';
