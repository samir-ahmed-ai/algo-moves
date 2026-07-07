import { cn } from '@/lib/utils/cn';
import { computeInputFrameCounts, buildFrameContextValue } from '@/lib/canvas';
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
import type { CanvasMode, Frame, Player, ProblemPlugin } from '../../core';
import { usePlayer } from '../../core';
import type { Item } from '../../content';
import { useWorkspace } from '@/store/workspace';
import { loadCanvasPrefs } from '@/store/canvas-layout';
import { consumePendingProblemDrop } from '@/store/canvas';
import { ConnectedComponentsProvider } from '@/lib/canvas';
import { useWorkflowRunner } from '../../hooks/useWorkflowRunner';
import { CanvasActionsProvider, CanvasFrameProvider, CanvasStaticProvider } from './CanvasContext';
import {
  CanvasToolbar,
  InterviewPanelTray,
  ContextMenu,
  LaserPointer,
  type MenuItem,
  CanvasFloatingHud,
  TracePreviewPanel,
  UnifiedRightSidebar,
  FIT_VIEW_DURATION_MS,
} from './ui';
import {
  PanelNode,
  panelAccent,
  EffectNode,
  type PanelFlowNode,
  type PanelNodeData,
} from './nodes';
import { RemovableEdge, useCanvasEdgeConnection } from './edges';
import {
  connectionLineType,
  FIT_PADDING,
  STANDALONE_CANVAS_KEY,
  STANDALONE_INTERVIEW_CANVAS_KEY,
  type BgVariant,
} from './layout/layout';
import {
  assignNodeToSlot,
  findLayoutSlotAtPoint,
  relayoutHostSlots,
  unparentOnHostDelete,
} from './layout/layoutSlots';
import { setLayoutDropTarget } from './layout/layoutDropState';
import { buildCanvasFrame } from './frame';
import { anchorFrameAtPointer } from './frame/framePlacement';
import {
  useCanvasLayoutPersistence,
  useCanvasLifecycle,
  useCanvasStageWorkspace,
  useCanvasKeyboardShortcuts,
  useCanvasDnD,
  useCanvasPresentation,
  useCanvasNodeMutations,
  useCanvasStageMenus,
} from './hooks';
import { CanvasCollabProvider, useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import { useCanvasDocSync } from '@/shell/collab/sync/useCanvasDocSync';
import { useCanvasFollow } from '@/shell/collab/sync/useCanvasFollow';
import { InterviewHud, GuestNameGate } from '@/shell/interview';
import { InterviewControlsBridge } from '@/shell/interview/InterviewControlsBridge';
import { useInterviewBoardPersistence } from '@/shell/interview/useInterviewBoardPersistence';
import { canMoveCanvasNodes } from '@/shell/collab/protocol/subdocPermissions';
import { CanvasCollabOverlays, CommentLayer } from '@/shell/collab';

const nodeTypes: Record<string, typeof PanelNode> = {
  panel: PanelNode,
  effect: EffectNode as unknown as typeof PanelNode,
};
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
    canvasVariant,
  } = useWorkspace();
  const pluginId = plugin.meta.id;
  const isInterviewCanvas = standalone && canvasVariant === 'interview';
  const key = standalone
    ? isInterviewCanvas
      ? STANDALONE_INTERVIEW_CANVAS_KEY
      : STANDALONE_CANVAS_KEY
    : `${pluginId}:${mode}`;
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
  const { layoutRef, removedRef, removedEdgesRef, viewportRef, persist } =
    useCanvasLayoutPersistence();

  const { fitView, screenToFlowPosition, setCenter, setViewport } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const wrapperRef = useRef<HTMLDivElement>(null);
  useCanvasPresentation(wrapperRef);

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
    (m: CanvasMode, k: string): { nodes: PanelFlowNode[]; edges: Edge[] } => {
      const built = buildCanvasFrame(plugin, m, {
        removed: removedRef.current[k],
        removedEdges: removedEdgesRef.current[k],
        saved: layoutRef.current[k],
        seedProblemCanvas: !standalone,
        seedInterviewCanvas: isInterviewCanvas,
        layoutOpts: layoutOpts(),
        dir,
        edgeOpts,
      });
      const anchor = !standalone ? consumePendingProblemDrop(item.id) : null;
      if (anchor && m === 'visualize') {
        return { ...built, nodes: anchorFrameAtPointer(built.nodes, anchor) };
      }
      return built;
    },
    [plugin, edgeOpts, dir, layoutOpts, standalone, isInterviewCanvas, item.id],
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
    persistViewport,
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
  });

  const frame = displayFrames[player.index] ?? displayFrames[0];

  const {
    lock,
    setLock,
    scrollPan,
    onProblemDrop,
    canvasActions,
    focusNode,
    onMinimapClick,
    onMinimapNodeClick,
  } = useCanvasStageWorkspace({
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
  });

  useCanvasKeyboardShortcuts({ fitView, undo, redo, toggleFocusCanvas, nodesRef });

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

  const [menu, setMenu] = useState<Menu | null>(null);

  // Edge connect / reconnect / validation.
  const { onConnect, onReconnectStart, onReconnect, onReconnectEnd, isValidConnection } =
    useCanvasEdgeConnection({ nodes, edges, edgeOpts, setEdges });
  const onNodeDrag = useCallback<OnNodeDrag<PanelFlowNode>>(
    (e) => {
      if (lock || mode !== 'visualize') return;
      const clientX = 'clientX' in e ? e.clientX : (e.touches[0]?.clientX ?? 0);
      const clientY = 'clientY' in e ? e.clientY : (e.touches[0]?.clientY ?? 0);
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
      const clientX = 'clientX' in e ? e.clientX : (e.changedTouches[0]?.clientX ?? 0);
      const clientY = 'clientY' in e ? e.clientY : (e.changedTouches[0]?.clientY ?? 0);
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
    [
      lock,
      mode,
      collab.role,
      collab.session,
      collab.isCollaborating,
      setNodes,
      updateNodeInternals,
    ],
  );

  const {
    onNodeClick,
    recolorNode,
    minimizeNode,
    removeNode: removeNodeRaw,
    toggleNodeLock,
  } = useCanvasNodeMutations({ setNodes, setEdges });

  const removeNode = useCallback(
    (id: string) => {
      suppressAutoRestoreForKey();
      removeNodeRaw(id);
    },
    [removeNodeRaw, suppressAutoRestoreForKey],
  );

  const { onNodeContextMenu, onPaneContextMenu } = useCanvasStageMenus({
    wrapperRef,
    focusNode,
    fitView,
    reset,
    lock,
    setLock,
    setMenu,
    setNodes,
    recolorNode,
    minimizeNode,
    removeNode,
    toggleNodeLock,
  });

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
    [
      plugin,
      item,
      inputId,
      setInputId,
      customInput,
      setCustomInput,
      inputFrameCounts,
      selectedNode,
    ],
  );
  const frameValue = useMemo(
    () => buildFrameContextValue(displayFrames, player, frame),
    [displayFrames, player, frame],
  );

  const bgVariant =
    bg === 'lines'
      ? BackgroundVariant.Lines
      : bg === 'cross'
        ? BackgroundVariant.Cross
        : BackgroundVariant.Dots;

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
              <div
                ref={wrapperRef}
                onPointerMove={onPanePointerMove}
                data-present={present || undefined}
                className={cn(
                  'relative min-h-0 flex-1 bg-bg',
                  present && 'canvas-stage--present',
                  dragOver && 'ring-2 ring-inset ring-good/40',
                )}
              >
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
                      if (collab.isCollaborating)
                        collab.broadcastViewport({ x: vp.x, y: vp.y, zoom: vp.zoom });
                    }}
                    onMoveEnd={(_e, vp) => persistViewport(vp)}
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
                    nodesDraggable={
                      !lock &&
                      canMoveCanvasNodes({
                        role: collab.role,
                        session: collab.session,
                        isCollaborating: collab.isCollaborating,
                      })
                    }
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
                      <Background
                        variant={bgVariant}
                        gap={20}
                        size={1}
                        color="color-mix(in srgb, var(--text) 12%, transparent)"
                      />
                    )}
                    {!present && (
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
                        onClick={onMinimapClick}
                        onNodeClick={onMinimapNodeClick}
                      />
                    )}
                    {!present && <CanvasFloatingHud />}
                    {!present && <InterviewPanelTray />}
                    {!present && (
                      <CanvasToolbar
                        lock={lock}
                        onToggleLock={() => setLock((l) => !l)}
                        onTidy={reset}
                        standalone={standalone}
                      />
                    )}
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

                {menu && !present && (
                  <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    items={menu.items}
                    onClose={() => setMenu(null)}
                  />
                )}

                {present && <LaserPointer host={wrapperRef} />}

                <GuestNameGate />

                {nodes.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border border-edge bg-panel/85 px-4 py-3 text-ink2 shadow-sm backdrop-blur',
                        chromeText.base,
                      )}
                    >
                      <p>
                        Empty canvas — use the dock panel (top-left) or right-click to add panels.
                      </p>
                      {!standalone && mode === 'visualize' && (
                        <button
                          type="button"
                          onClick={restoreProblemStarterPanels}
                          className="pointer-events-auto rounded-full bg-accent px-3 py-1 text-[length:var(--fs-xs)] font-semibold text-white"
                        >
                          Restore starter panels
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!present && mode === 'visualize' && <UnifiedRightSidebar />}
          </div>
        </CanvasActionsProvider>
      </CanvasFrameProvider>
    </CanvasStaticProvider>
  );
}

export function CanvasStage(props: CanvasStageProps) {
  return (
    <CanvasCollabProvider>
      <InterviewControlsBridge />
      <ReactFlowProvider>
        <div className="h-full min-h-0 w-full">
          <Inner {...props} />
        </div>
      </ReactFlowProvider>
    </CanvasCollabProvider>
  );
}

/** Re-export kept for widget registry / saved-canvas flows. */
export { UnifiedRightSidebar } from './ui/UnifiedRightSidebar';
