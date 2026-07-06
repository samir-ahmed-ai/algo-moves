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
  useUpdateNodeInternals,
  type ConnectionLineComponentProps,
  type Edge,
  type Node,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react';
import { Crosshair, ChevronsDownUp, Trash2, Palette, Maximize, LayoutGrid, Lock } from 'lucide-react';
import type { CanvasMode, Frame, Player, ProblemPlugin } from '../../core';
import { createPanelByType } from '../../core/panelRegistry';
import { usePlayer } from '../../core';
import type { Item } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { loadCanvasPrefs } from '@/store/canvas-layout';
import { ConnectedComponentsProvider } from '@/lib/canvas';
import { useWorkflowRunner } from '../../hooks/useWorkflowRunner';
import { EFFECT_DND_KEY } from '../../hooks/useDragAndDrop';
import { EFFECTS } from '../../effects/registry';
import { buildMinimalProjectState, sanitizeLoadedNodes } from '@/store/project-state';
import type { ShareState } from '@/store/navigation';
import { togglePanelCollapse } from './nodes';
import { CanvasActionsProvider, CanvasFrameProvider, CanvasStaticProvider } from './CanvasContext';
import {
  CanvasToolbar,
  ContextMenu,
  LaserPointer,
  type MenuItem,
  CanvasFloatingHud,
  TracePreviewPanel,
  FIT_VIEW_DURATION_MS,
} from './ui';
import { PanelNode, panelAccent, EffectNode, createEffectByType, type PanelFlowNode, type PanelNodeData } from './nodes';
import { RemovableEdge, useCanvasEdgeConnection } from './edges';
import {
  applyAlign,
  applyDistribute,
  type AlignKind,
  connectionLineType,
  FIT_PADDING,
  FIT_PADDING_FOCUS,
  FIT_PADDING_VIEW,
  edgesForKind,
  kindTitle,
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
import {
  assignNodeToSlot,
  findLayoutSlotAtPoint,
  relayoutHostSlots,
  unparentOnHostDelete,
} from './layout/layoutSlots';
import { setLayoutDropTarget } from './layout/layoutDropState';
import { buildCanvasFrame } from './frame';
import {
  useCanvasLayoutPersistence,
  useCanvasLifecycle,
  useCanvasKeyboardShortcuts,
  useCanvasDnD,
  DND_KEY,
  useCanvasNodeMutations,
} from './hooks';
import { CanvasCollabProvider, useCanvasCollab } from './collab/CanvasCollabProvider';
import { useCanvasDocSync } from './collab/sync/useCanvasDocSync';
import { useCanvasFollow } from './collab/sync/useCanvasFollow';
import { InterviewHud } from './collab/interview/InterviewHud';
import { GuestNameGate } from './collab/interview/GuestNameGate';
import { useInterviewBoardPersistence } from './collab/interview/useInterviewBoardPersistence';
import { canMoveCanvasNodes } from './collab/protocol/subdocPermissions';
import { CanvasCollabOverlays } from './collab/CanvasCollabOverlays';
import { CommentLayer } from './collab/CommentLayer';

const nodeTypes: Record<string, typeof PanelNode> = { panel: PanelNode, effect: EffectNode as unknown as typeof PanelNode };
const edgeTypes = { removable: RemovableEdge };

/** Panel kinds that may be added multiple times (dynamic node ids). */
const MULTI_INSTANCE_PANELS = new Set(['whiteboard', 'collab-code']);

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
  const updateNodeInternals = useUpdateNodeInternals();
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
        seedProblemCanvas: !standalone,
        layoutOpts: layoutOpts(),
        dir,
        edgeOpts,
      }),
    [plugin, edgeOpts, dir, layoutOpts, standalone],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => buildFor(mode, key), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [dragOver, setDragOver] = useState(false);

  const handleNodesChange = useCallback(
    (changes: NodeChange<PanelFlowNode>[]) => {
      const removeIds = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removeIds.length) {
        setNodes((nds) => unparentOnHostDelete(nds, new Set(removeIds)));
      }

      onNodesChange(changes);
      const manualIds = new Set<string>();
      const relayoutIds = new Set<string>();
      for (const c of changes) {
        if (c.type === 'position' && 'dragging' in c && c.dragging === false) manualIds.add(c.id);
        if (c.type === 'dimensions') {
          manualIds.add(c.id);
          relayoutIds.add(c.id);
        }
      }
      if (!manualIds.size) return;
      setNodes((nds) => {
        let next = nds;
        let changed = false;
        next = next.map((n) => {
          if (!manualIds.has(n.id) || !n.data.snapFill) return n;
          changed = true;
          const { snapFill: _, ...rest } = n.data;
          return { ...n, data: rest };
        });
        for (const id of relayoutIds) {
          const host = next.find((n) => n.id === id);
          if (host?.data.layoutSlots?.some(Boolean)) {
            next = relayoutHostSlots(next, id);
            changed = true;
          }
        }
        return changed ? next : nds;
      });
    },
    [onNodesChange, setNodes],
  );

  // Real-time collaboration: publish/apply the shared document, mirror a
  // followed peer's viewport. Inert (no network) until a session is joined.
  const collab = useCanvasCollab();
  useCanvasDocSync({ nodes, edges, setNodes, setEdges });
  useCanvasFollow();
  useInterviewBoardPersistence();
  const onPanePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!collab.isCollaborating) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      collab.broadcastCursor(p.x, p.y);
    },
    [collab, screenToFlowPosition],
  );

  const displayFrames = useWorkflowRunner({ baseFrames, nodes, edges });

  const fitCanvas = useCallback(
    (duration = FIT_VIEW_DURATION_MS) => {
      fitView({ padding: FIT_PADDING, duration, maxZoom: 1.0 });
    },
    [fitView],
  );

  const nodesInitialized = useNodesInitialized();

  const {
    nodesRef,
    builtKeyRef,
    historyRef,
    histIdxRef,
    undo,
    redo,
    restoreProblemStarterPanels,
    suppressAutoRestoreForKey,
    reset,
  } = useCanvasLifecycle({
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
  });

  const frame = displayFrames[player.index] ?? displayFrames[0];

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
      .filter((id) => MULTI_INSTANCE_PANELS.has(id) || !present.has(id))
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
      if (!kind) return;
      if (!MULTI_INSTANCE_PANELS.has(kind) && nodesRef.current.some((n) => n.id === kind)) return;
      removedRef.current[key]?.delete(kind);
      const r = wrapperRef.current?.getBoundingClientRect();
      const center = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 240, y: 240 };
      const position = screenToFlowPosition(center);
      const node = MULTI_INSTANCE_PANELS.has(kind)
        ? (createPanelByType(kind, position) as PanelFlowNode)
        : nodeForKind(plugin, kind, position);
      const present = new Set([...nodesRef.current.map((n) => n.id), node.id]);
      const newEdges = styleEdges(edgesForKind(plugin, mode, kind, present), edgeOpts).filter(
        (ne) => !edges.some((ee) => ee.id === ne.id),
      );
      setNodes((nds) => [...nds, node]);
      if (newEdges.length) setEdges((eds) => [...eds, ...newEdges]);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => fitView({ padding: FIT_PADDING_FOCUS, duration: FIT_VIEW_DURATION_MS, nodes: [{ id: node.id }] })),
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
      onCanvasSnap: () => {},
      canCanvasSnap: false,
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

  const onNodeDrag = useCallback<OnNodeDrag<PanelFlowNode>>(
    (e) => {
      if (lock || mode !== 'visualize') return;
      const clientX = 'clientX' in e ? e.clientX : e.touches[0]?.clientX ?? 0;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0]?.clientY ?? 0;
      setLayoutDropTarget(findLayoutSlotAtPoint(clientX, clientY));
    },
    [lock, mode],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<PanelFlowNode>>(
    (e, node) => {
      setLayoutDropTarget(null);
      if (lock || mode !== 'visualize') return;
      if (
        !canMoveCanvasNodes({
          role: collab.role,
          session: collab.session,
          isCollaborating: collab.isCollaborating,
        })
      ) {
        return;
      }
      const data = node.data as PanelNodeData | undefined;
      if (data?.locked) return;
      const clientX = 'clientX' in e ? e.clientX : e.changedTouches[0]?.clientX ?? 0;
      const clientY = 'clientY' in e ? e.clientY : e.changedTouches[0]?.clientY ?? 0;
      const hit = findLayoutSlotAtPoint(clientX, clientY);
      if (!hit || hit.hostId === node.id) return;
      setNodes((nds) => {
        const next = assignNodeToSlot(nds as PanelFlowNode[], hit.hostId, hit.slotIndex, node.id);
        requestAnimationFrame(() => {
          updateNodeInternals(hit.hostId);
          updateNodeInternals(node.id);
        });
        return next;
      });
    },
    [lock, mode, collab.role, collab.session, collab.isCollaborating, setNodes, updateNodeInternals],
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

  const { onNodeClick, recolorNode, minimizeNode, removeNode: removeNodeRaw, toggleNodeLock } =
    useCanvasNodeMutations({ setNodes, setEdges });

  const removeNode = useCallback(
    (id: string) => {
      suppressAutoRestoreForKey();
      removeNodeRaw(id);
    },
    [removeNodeRaw, suppressAutoRestoreForKey],
  );

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
      suppressAutoRestoreForKey();
      const set = (removedRef.current[key] ??= new Set());
      for (const n of deleted) set.add((n.data as PanelNodeData | undefined)?.kind ?? n.id);
    },
    [key, suppressAutoRestoreForKey],
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
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onNodeClick={onNodeClick}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
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
            nodesDraggable={!lock && canMoveCanvasNodes({ role: collab.role, session: collab.session, isCollaborating: collab.isCollaborating })}
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
            {!present && <InterviewHud />}
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

          <GuestNameGate />

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className={cn('flex flex-col items-center gap-2 rounded-lg border border-edge bg-panel/85 px-4 py-3 text-ink2 shadow-sm backdrop-blur', chromeText.base)}>
                <p>Empty canvas — use the dock panel (top-left) or right-click to add panels.</p>
                {!standalone && mode === 'visualize' && (
                  <button
                    type="button"
                    onClick={restoreProblemStarterPanels}
                    className="pointer-events-auto rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-white"
                  >
                    Restore starter panels
                  </button>
                )}
              </div>
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
export { UnifiedRightSidebar } from './ui/UnifiedRightSidebar';
