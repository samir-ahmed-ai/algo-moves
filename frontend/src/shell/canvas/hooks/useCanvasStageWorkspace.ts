import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { CanvasMode, Player, ProblemPlugin } from '@/core';
import type { Item } from '@/content';
import { buildMinimalProjectState, sanitizeLoadedNodes } from '@/store/project-state';
import type { ShareState } from '@/store/navigation';
import { setPendingProblemDrop } from '@/store/canvas';
import type { CanvasAddPanel, CanvasHudProps, CanvasProjectApi } from '@/store/workspace/workspace';
import { EFFECT_DND_KEY } from '@/hooks/useDragAndDrop';
import { EFFECTS } from '@/effects/registry';
import { togglePanelCollapse, createEffectByType, type PanelFlowNode } from '../nodes';
import { applyAlign, applyDistribute, type AlignKind } from '../layout/align';
import {
  edgesForKind,
  FIT_PADDING_FOCUS,
  isMultiInstancePanel,
  kindTitle,
  modeNodeIds,
  nextPracticePanel,
  nodeForKind,
  presetRemoved,
  sidePanelTabs,
  standaloneNodeIds,
  styleEdges,
  type BgVariant,
  type EdgeOpts,
  type LayoutPreset,
} from '../layout/layout';
import type { RightSidebarTab } from '@/store/workspace/workspace';
import { FIT_VIEW_DURATION_MS } from '../ui/canvasTokens';
import { DND_KEY, insertionForKind } from './useCanvasDnD';
import type { Saved } from './useCanvasLayoutPersistence';

export type UseCanvasStageWorkspaceOptions = {
  plugin: ProblemPlugin<any, any>;
  item: Item;
  mode: CanvasMode;
  key: string;
  standalone: boolean;
  nodes: PanelFlowNode[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<PanelFlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  edgeOpts: EdgeOpts;
  setEdgeOpts: Dispatch<SetStateAction<EdgeOpts>>;
  bg: BgVariant;
  setBg: Dispatch<SetStateAction<BgVariant>>;
  snap: boolean;
  setSnap: Dispatch<SetStateAction<boolean>>;
  layoutRef: MutableRefObject<Record<string, Saved>>;
  removedRef: MutableRefObject<Record<string, Set<string>>>;
  removedEdgesRef: MutableRefObject<Record<string, Set<string>>>;
  nodesRef: MutableRefObject<PanelFlowNode[]>;
  historyRef: MutableRefObject<{ nodes: PanelFlowNode[]; edges: Edge[] }[]>;
  histIdxRef: MutableRefObject<number>;
  builtKeyRef: MutableRefObject<string>;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  persist: () => void;
  buildFor: (m: CanvasMode, k: string) => { nodes: PanelFlowNode[]; edges: Edge[] };
  layoutOpts: () => { preset?: LayoutPreset; viewport?: { width: number; height: number } };
  fitView: (options?: {
    padding?: number;
    duration?: number;
    maxZoom?: number;
    nodes?: { id: string }[];
  }) => void;
  fitCanvas: (duration?: number) => void;
  setCenter: (x: number, y: number, options?: { duration?: number }) => void;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  wrapperRef: RefObject<HTMLDivElement | null>;
  player: Player;
  theme: string;
  palette: string;
  themePreset: string;
  dir: string;
  inputId: string;
  setLayoutPreset: (preset: LayoutPreset) => void;
  setSidePanelTab: (tab: string) => void;
  setCanvasAdd: (value: CanvasAddPanel | null) => void;
  setCanvasProject: (value: CanvasProjectApi | null) => void;
  setCanvasHud: (value: CanvasHudProps | null) => void;
  setMode: (mode: CanvasMode) => void;
  setPresent: (present: boolean) => void;
  setRightOpen: (open: boolean) => void;
  setRightTab: (tab: RightSidebarTab) => void;
  requestFitCanvas: () => void;
  enterProblemInMode: (itemId: string, mode: CanvasMode) => void;
};

export function useCanvasStageWorkspace({
  plugin,
  item,
  mode,
  key,
  standalone,
  nodes,
  edges,
  setNodes,
  setEdges,
  edgeOpts,
  setEdgeOpts,
  bg,
  setBg,
  snap,
  setSnap,
  layoutRef,
  removedRef,
  removedEdgesRef,
  nodesRef,
  historyRef,
  histIdxRef,
  builtKeyRef,
  undo,
  redo,
  reset,
  persist,
  buildFor,
  layoutOpts,
  fitView,
  fitCanvas,
  setCenter,
  screenToFlowPosition,
  wrapperRef,
  player,
  theme,
  palette,
  themePreset,
  dir,
  inputId,
  setLayoutPreset,
  setSidePanelTab,
  setCanvasAdd,
  setCanvasProject,
  setCanvasHud,
  setMode,
  setPresent,
  setRightOpen,
  setRightTab,
  requestFitCanvas,
  enterProblemInMode,
}: UseCanvasStageWorkspaceOptions) {
  const [lock, setLock] = useState(false);
  const [scrollPan] = useState(false);

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
    [
      plugin,
      mode,
      key,
      buildFor,
      setNodes,
      setEdges,
      persist,
      fitCanvas,
      setLayoutPreset,
      setRightOpen,
      setRightTab,
      setPresent,
      requestFitCanvas,
      removedRef,
      layoutRef,
      builtKeyRef,
    ],
  );

  const onProblemDrop = useCallback(
    (itemId: string, position: { x: number; y: number }) => {
      setPendingProblemDrop(itemId, position);
      enterProblemInMode(itemId, 'visualize');
      requestFitCanvas();
    },
    [enterProblemInMode, requestFitCanvas],
  );

  const addableKinds = useMemo(() => {
    const present = new Set(nodes.map((n) => n.id));
    const ids = standalone ? standaloneNodeIds() : modeNodeIds(plugin, mode);
    return ids
      .filter((id) => isMultiInstancePanel(id) || !present.has(id))
      .map((id) => ({ id, title: kindTitle(plugin, id) }));
  }, [nodes, plugin, mode, standalone]);

  const addKind = useCallback(
    (kind: string) => {
      const r = wrapperRef.current?.getBoundingClientRect();
      const center = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 240, y: 240 };
      const position = screenToFlowPosition(center);
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
      removedRef.current[key]?.delete(kind);
      setNodes((nds) => [...nds, insertion.node]);
      if (insertion.newEdges.length) setEdges((eds) => [...eds, ...insertion.newEdges]);
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          fitView({
            padding: FIT_PADDING_FOCUS,
            duration: FIT_VIEW_DURATION_MS,
            nodes: [{ id: insertion.node.id }],
          }),
        ),
      );
    },
    [
      plugin,
      mode,
      key,
      edgeOpts,
      edges,
      screenToFlowPosition,
      setNodes,
      setEdges,
      fitView,
      nodesRef,
      removedRef,
      wrapperRef,
    ],
  );

  const addEffect = useCallback(
    (effectId: string) => {
      const r = wrapperRef.current?.getBoundingClientRect();
      const center = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 240, y: 240 };
      const position = screenToFlowPosition(center);
      const node = createEffectByType(effectId, position);
      setNodes((nds) => [...nds, node as unknown as PanelFlowNode]);
    },
    [screenToFlowPosition, setNodes, wrapperRef],
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
      ...(standalone
        ? { focus: 'canvas' as const }
        : { item: item.id, input: inputId || undefined, focus: 'problem' as const }),
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
    [shareSnapshot, mode, key, edges, player.speed, nodesRef, removedRef, removedEdgesRef],
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
    [
      key,
      edgeOpts,
      persist,
      player,
      setNodes,
      setEdges,
      requestFitCanvas,
      removedRef,
      removedEdgesRef,
    ],
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
    [mode, key, setMode, applyPreset, addKind, nodesRef, removedRef],
  );

  useEffect(() => {
    setCanvasProject({ getProjectState, applyProjectState, applyWorkflowPreset });
    return () => setCanvasProject(null);
  }, [getProjectState, applyProjectState, applyWorkflowPreset, setCanvasProject]);

  const align = useCallback(
    (a: AlignKind) => setNodes((nds) => applyAlign(nds as PanelFlowNode[], a)),
    [setNodes],
  );
  const distribute = useCallback(
    (d: 'h' | 'v') => setNodes((nds) => applyDistribute(nds as PanelFlowNode[], d)),
    [setNodes],
  );
  const selCount = nodes.filter((n) => n.selected).length;

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
    histIdxRef,
    historyRef,
  ]);

  const focusNode = useCallback(
    (id: string) => {
      const n = nodesRef.current.find((x) => x.id === id);
      if (n) fitView({ padding: FIT_PADDING_FOCUS, duration: FIT_VIEW_DURATION_MS, nodes: [n] });
    },
    [fitView, nodesRef],
  );

  const onMinimapClick = useCallback(
    (_e: React.MouseEvent, position: { x: number; y: number }) => {
      const selected = nodesRef.current.filter((n) => n.selected);
      if (selected.length) {
        fitView({
          padding: FIT_PADDING_FOCUS,
          duration: FIT_VIEW_DURATION_MS,
          nodes: selected,
          maxZoom: 1.0,
        });
        return;
      }
      setCenter(position.x, position.y, { duration: FIT_VIEW_DURATION_MS });
    },
    [fitView, setCenter, nodesRef],
  );

  const onMinimapNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
      focusNode(node.id);
    },
    [focusNode, setNodes],
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
      setNodes((nds) =>
        applySelectRelayout([...(nds as PanelFlowNode[]), { ...node, selected: true }]),
      );
      if (newEdges.length) setEdges((eds) => [...eds, ...newEdges]);
      zoom();
    },
    [plugin, mode, key, edgeOpts, edges, setNodes, setEdges, focusNode, nodesRef, removedRef],
  );

  const spawnConnectedPanel = useCallback(
    (panelId: string, fromId: string) => ensureAndFocusPanel(panelId, fromId),
    [ensureAndFocusPanel],
  );

  const advancePractice = useCallback(
    (fromId: string) => {
      const nextId = nextPracticePanel(plugin, mode, fromId);
      if (!nextId) return;
      if (sidePanelTabs(plugin, mode).some((t) => t.id === nextId)) setSidePanelTab(nextId);
      else ensureAndFocusPanel(nextId, fromId);
    },
    [plugin, mode, ensureAndFocusPanel, setSidePanelTab],
  );

  const canvasActions = useMemo(
    () => ({
      focusPanel: focusNode,
      advancePractice,
      spawnConnectedPanel,
      layoutVisualizeOptions: layoutOpts,
    }),
    [focusNode, advancePractice, spawnConnectedPanel, layoutOpts],
  );

  return {
    lock,
    setLock,
    scrollPan,
    onProblemDrop,
    canvasActions,
    focusNode,
    onMinimapClick,
    onMinimapNodeClick,
  };
}
