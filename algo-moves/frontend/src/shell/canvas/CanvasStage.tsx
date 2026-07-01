import { cn } from '../../lib/cn';
import { computeInputFrameCounts } from '../../lib/inputFrameCounts';
import { isEditableTarget } from '../../lib/keyboard';
import { chromeText } from '../chromeUi';
import { onReactFlowError } from './canvasFlowErrors';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  SelectionMode,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
  type Connection,
  type ConnectionLineComponentProps,
  type Edge,
  type Node,
} from '@xyflow/react';
import { Crosshair, ChevronsDownUp, Trash2, Palette, Maximize, LayoutGrid, Lock } from 'lucide-react';
import type { CanvasMode, Frame, Player, ProblemPlugin } from '../../core';
import type { Item } from '../../content';
import { useWorkspace } from '../../lib/workspace';
import { loadCanvasPrefs, saveCanvasPrefs } from '../../lib/canvasPrefs';
import { loadLayouts, saveLayouts, type LayoutEntry } from '../../lib/layoutStore';
import type { PanelNodeStyle } from './panelStyle';
import { styleSig } from './panelStyle';
import { togglePanelCollapse } from './panelCollapse';
import { CanvasActionsProvider, CanvasFrameProvider, CanvasStaticProvider } from './CanvasContext';
import { UnifiedRightSidebar } from './UnifiedRightSidebar';
import { PanelNode, panelAccent, type PanelFlowNode, type PanelNodeData } from './PanelNode';
import { CanvasProblemNav } from './CanvasProblemNav';
import { RemovableEdge } from './RemovableEdge';
import { ContextMenu, LaserPointer, type MenuItem } from './CanvasTools';
import { CanvasFloatingHud } from './CanvasFloatingHud';
import { TracePreviewPanel } from './TracePreviewPanel';
import { EffectNode, createEffectByType } from './EffectNode';
import { ConnectedComponentsProvider } from '../../lib/ConnectedComponentsContext';
import { useWorkflowRunner } from '../../hooks/useWorkflowRunner';
import { EFFECT_DND_KEY } from '../../hooks/useDragAndDrop';
import { EFFECTS } from '../../effects/registry';
import { buildMinimalProjectState, sanitizeLoadedNodes } from '../../lib/projectState';
import {
  FIRST_VISIT_PRESET_ID,
  WORKFLOW_PRESET_ACTIONS,
  hasSeenDemoWorkflow,
  markDemoWorkflowSeen,
} from '../../data/workflowPresets';
import type { ShareState } from '../../lib/shareState';
import { applyAlign, applyDistribute, type AlignKind } from './align';
import { FIT_VIEW_DURATION_MS } from './canvasTokens';
import {
  ACCENTS,
  DOCK_ONLY_PANELS,
  buildEdges,
  buildNodes,
  DEPRECATED_VISUALIZE_EDGES,
  REQUIRED_VISUALIZE_EDGES,
  connectionLineType,
  defaultEdgeOpts,
  edgeConnectionLabel,
  FIT_PADDING,
  FIT_PADDING_FOCUS,
  FIT_PADDING_VIEW,
  edgesForKind,
  kindTitle,
  layoutFixedWidth,
  layoutGraph,
  layoutLearnCanvas,
  layoutVisualizeCanvas,
  modeNodeIds,
  nextPracticePanel,
  sidePanelTabs,
  nodeForKind,
  presetRemoved,
  styleEdges,
  type BgVariant,
  type LayoutPreset,
} from './layout';

const nodeTypes: Record<string, typeof PanelNode> = { panel: PanelNode, effect: EffectNode as unknown as typeof PanelNode };
const edgeTypes = { removable: RemovableEdge };
const DND_KEY = 'application/algomove';

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

function snapNodeWidth(n: PanelFlowNode): number | undefined {
  return n.width ?? undefined;
}

/** Persist position + width; viz width is layout-owned in visualize mode. */
function snapNodeLayout(n: PanelFlowNode): { position: { x: number; y: number }; width?: number } {
  const kind = (n.data as PanelNodeData | undefined)?.kind ?? n.id;
  const entry: { position: { x: number; y: number }; width?: number } = { position: n.position };
  if (kind !== 'viz') {
    const w = snapNodeWidth(n);
    if (w != null) entry.width = w;
  }
  return entry;
}

function restoreNodeWidth(kind: string, savedWidth: number | undefined, layoutWidth: number | undefined): number | undefined {
  const raw = savedWidth ?? layoutWidth;
  const maxW = layoutFixedWidth(kind);
  if (raw == null) return raw;
  return maxW != null ? Math.min(raw, maxW) : raw;
}

/** Drop retired shell edges; restore required wires unless the user removed them. */
function sanitizeVisualizeEdges(
  edges: Edge[],
  plugin: ProblemPlugin<any, any>,
  present: Set<string>,
  edgeOpts: typeof defaultEdgeOpts,
  removedEdgeIds: Set<string>,
): Edge[] {
  const filtered = edges.filter((e) => !DEPRECATED_VISUALIZE_EDGES.has(e.id));
  const canonical = buildEdges(plugin, 'visualize').filter(
    (e) =>
      present.has(e.source) &&
      present.has(e.target) &&
      REQUIRED_VISUALIZE_EDGES.has(e.id) &&
      !removedEdgeIds.has(e.id),
  );
  const canonicalById = new Map(canonical.map((e) => [e.id, e]));
  const enriched = filtered.map((e) => {
    const canon = canonicalById.get(e.id);
    if (!canon) return e;
    const targetHandle = e.targetHandle ?? canon.targetHandle;
    if (targetHandle === e.targetHandle) return e;
    return {
      ...e,
      ...(targetHandle ? { targetHandle } : {}),
    };
  });
  const ids = new Set(enriched.map((e) => e.id));
  const merged = [...enriched, ...canonical.filter((e) => !ids.has(e.id))];
  return styleEdges(merged, edgeOpts);
}

/** Migrate legacy separate inspector node into the merged viz node; strip dock-only panels. */
function migrateVisualizeLayoutEntry(entry: LayoutEntry): LayoutEntry {
  const inspector = entry.nodes.inspector;
  const alreadyRemoved = entry.removed.includes('inspector');
  let nodes = { ...entry.nodes };
  let removed = [...entry.removed];

  if (inspector) {
    const viz = nodes.viz;
    if (viz) {
      nodes.viz = {
        ...viz,
        width: (viz.width ?? 680) + (inspector.width ?? 400),
      };
    }
    delete nodes.inspector;
    if (!alreadyRemoved) removed.push('inspector');
  } else if (alreadyRemoved) {
    // keep removed as-is
  }

  for (const id of DOCK_ONLY_PANELS) {
    if (nodes[id]) {
      delete nodes[id];
      if (!removed.includes(id)) removed.push(id);
    }
  }

  // Default problem+viz layouts should include the split examples panel unless viz/problem were removed.
  if (!removed.includes('problem') && !removed.includes('viz')) {
    removed = removed.filter((id) => id !== 'examples');
  }

  return { nodes, removed };
}

/** Migrate legacy code+scratch layouts to unified Code Studio. */
function migrateCodeLayoutEntry(entry: LayoutEntry): LayoutEntry {
  const scratch = entry.nodes.scratch;
  if (!scratch) return entry;
  const nodes = { ...entry.nodes };
  if (nodes.code) {
    nodes.code = {
      ...nodes.code,
      width: Math.max(nodes.code.width ?? 0, scratch.width ?? 0) || nodes.code.width,
    };
  } else {
    nodes.code = scratch;
  }
  delete nodes.scratch;
  const removed = entry.removed.includes('scratch') ? entry.removed : [...entry.removed, 'scratch'];
  return { nodes, removed };
}

function mergeLearnLayoutEntries(a: LayoutEntry, b?: LayoutEntry): LayoutEntry {
  const nodes = { ...a.nodes };
  if (b) {
    for (const [id, saved] of Object.entries(b.nodes)) {
      if (id === 'code' && nodes.code) {
        nodes.code = {
          ...nodes.code,
          width: Math.max(nodes.code.width ?? 0, saved.width ?? 0) || saved.width,
        };
      } else if (id === 'code' || !nodes[id]) {
        nodes[id] = saved;
      }
    }
  }
  const removed = [...new Set([...a.removed, ...(b?.removed ?? [])])];
  return { nodes, removed };
}

function stripLayoutHeights(entry: LayoutEntry): LayoutEntry {
  const nodes: LayoutEntry['nodes'] = {};
  for (const [id, saved] of Object.entries(entry.nodes)) {
    const { height: _, ...rest } = saved;
    nodes[id] = rest;
  }
  return { ...entry, nodes };
}

function migrateLayouts(stored: Record<string, LayoutEntry>): Record<string, LayoutEntry> {
  const temp: Record<string, LayoutEntry> = {};
  for (const [key, entry] of Object.entries(stored)) {
    let migrated = entry;
    if (key.endsWith(':code') || key.endsWith(':practice') || key.endsWith(':learn')) {
      migrated = migrateCodeLayoutEntry(migrated);
    } else if (key.endsWith(':visualize')) {
      migrated = migrateVisualizeLayoutEntry(migrated);
    }
    temp[key] = stripLayoutHeights(migrated);
  }

  const out: Record<string, LayoutEntry> = {};
  const mergedPlugins = new Set<string>();

  for (const key of Object.keys(temp)) {
    if (!key.endsWith(':practice') && !key.endsWith(':code')) continue;
    const pluginId = key.slice(0, key.lastIndexOf(':'));
    if (mergedPlugins.has(pluginId)) continue;
    mergedPlugins.add(pluginId);
    const practice = temp[`${pluginId}:practice`];
    const code = temp[`${pluginId}:code`];
    const existingLearn = temp[`${pluginId}:learn`];
    let learn: LayoutEntry = practice && code
      ? mergeLearnLayoutEntries(practice, code)
      : practice ?? code ?? existingLearn!;
    if (existingLearn) learn = mergeLearnLayoutEntries(learn, existingLearn);
    out[`${pluginId}:learn`] = learn;
  }

  for (const [key, entry] of Object.entries(temp)) {
    if (key.endsWith(':practice') || key.endsWith(':code')) continue;
    if (key.endsWith(':learn') && mergedPlugins.has(key.slice(0, key.lastIndexOf(':')))) continue;
    out[key] = entry;
  }

  return out;
}

interface Menu {
  x: number;
  y: number;
  items: MenuItem[];
}

type Saved = Record<string, { position: { x: number; y: number }; width?: number }>;

interface CanvasStageProps {
  plugin: ProblemPlugin<any, any>;
  item: Item;
  inputId: string;
  setInputId: (id: string) => void;
  customInput: unknown;
  setCustomInput: (v: unknown) => void;
  baseFrames: Frame<any>[];
  player: Player;
}

function Inner({ plugin, item, inputId, setInputId, customInput, setCustomInput, baseFrames, player }: CanvasStageProps) {
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
    rightOpen,
    setRightOpen,
    rightTab,
    setRightTab,
  } = useWorkspace();
  const pluginId = plugin.meta.id;
  const key = `${pluginId}:${mode}`;
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
  // Seeded from localStorage so a tweaked canvas survives a reload (#73).
  const persisted = useRef(migrateLayouts(loadLayouts()));
  const layoutRef = useRef<Record<string, Saved>>(
    Object.fromEntries(Object.entries(persisted.current).map(([k, v]) => [k, v.nodes])),
  );
  const removedRef = useRef<Record<string, Set<string>>>(
    Object.fromEntries(Object.entries(persisted.current).map(([k, v]) => [k, new Set(v.removed)])),
  );
  const removedEdgesRef = useRef<Record<string, Set<string>>>(
    Object.fromEntries(
      Object.entries(persisted.current).map(([k, v]) => [k, new Set(v.removedEdges ?? [])]),
    ),
  );

  const persist = useCallback(() => {
    const out: Record<string, LayoutEntry> = {};
    const keys = new Set([
      ...Object.keys(layoutRef.current),
      ...Object.keys(removedRef.current),
      ...Object.keys(removedEdgesRef.current),
    ]);
    for (const k of keys) {
      out[k] = {
        nodes: layoutRef.current[k] ?? {},
        removed: [...(removedRef.current[k] ?? [])],
        removedEdges: [...(removedEdgesRef.current[k] ?? [])],
      };
    }
    saveLayouts(out);
  }, []);

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

  // Build the node+edge set for a mode, respecting removals, dagre layout, and saved positions/sizes.
  const buildFor = useCallback(
    (m: CanvasMode, k: string): { nodes: PanelFlowNode[]; edges: Edge[] } => {
      const removed = removedRef.current[k];
      let nodes = buildNodes(plugin, m);
      if (removed?.size) nodes = nodes.filter((n) => !removed.has(n.id));
      const present = new Set(nodes.map((n) => n.id));
      const removedEdges = removedEdgesRef.current[k] ?? new Set<string>();
      const raw = buildEdges(plugin, m)
        .filter((e) => present.has(e.source) && present.has(e.target))
        .filter((e) => !removedEdges.has(e.id));
      nodes = m === 'visualize'
        ? layoutVisualizeCanvas(nodes, layoutOpts())
        : m === 'learn'
          ? layoutLearnCanvas(nodes, raw)
          : layoutGraph(nodes, raw, dir);
      const saved = layoutRef.current[k];
      if (saved) {
        nodes = nodes.map((n) => {
          if (!saved[n.id]) return n;
          const kind = n.data.kind ?? n.id;
          const width =
            m === 'visualize' && kind === 'viz'
              ? n.width
              : restoreNodeWidth(kind, saved[n.id].width, n.width);
          // Visualize / Learn: keep canonical stacked layout; restore widths only.
          if (m === 'visualize' || m === 'learn') {
            return { ...n, position: n.position, width };
          }
          return {
            ...n,
            position: saved[n.id].position,
            width,
          };
        });
      }
      return { nodes, edges: styleEdges(raw, edgeOpts) };
    },
    [plugin, edgeOpts, dir, layoutOpts],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => buildFor(mode, key), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [dragOver, setDragOver] = useState(false);

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
  }, [displayFrames.length, player]);

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

  // Strip legacy examples→problem edges; restore required examples→viz unless user removed it.
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
    removedRef.current[prevKeyRef.current] = new Set(
      modeNodeIds(plugin, prevModeRef.current).filter((id) => !presentIds.has(id)),
    );
    prevKeyRef.current = key;
    prevModeRef.current = mode;

    const built = buildFor(mode, key);
    builtKeyRef.current = key;
    historyRef.current = [];
    histIdxRef.current = -1;
    lastSigRef.current = '';
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
    if (nodes.some((n) => n.dragging)) return;
    const snap: Saved = {};
    nodes.forEach((n) => {
      snap[n.id] = snapNodeLayout(n);
    });
    layoutRef.current[key] = snap;
    const presentIds = new Set(nodes.map((n) => n.id));
    removedRef.current[key] = new Set(modeNodeIds(plugin, mode).filter((id) => !presentIds.has(id)));
    persist();
  }, [nodes, key, plugin, mode, persist]);

  // ---- undo/redo of canvas edits (#82) ----
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
    if (builtKeyRef.current !== key) return;
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
  }, [nodes, edges, key]);
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

  // Tidy: re-organize the CURRENT panels (keep removals + resizes, forget positions).
  const reset = useCallback(() => {
    const present = nodesRef.current;
    const presentIds = new Set(present.map((n) => n.id));
    removedRef.current[key] = new Set(modeNodeIds(plugin, mode).filter((id) => !presentIds.has(id)));
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
      ? layoutVisualizeCanvas(kept, layoutOpts())
      : mode === 'learn'
        ? layoutLearnCanvas(kept, raw)
        : layoutGraph(kept, raw, dir);
    setNodes(kept);
    setEdges(styleEdges(raw, edgeOpts));
    requestAnimationFrame(() => fitCanvas());
  }, [plugin, mode, key, edgeOpts, dir, setNodes, setEdges, fitCanvas, layoutOpts]);

  // Re-fit when chrome dimensions change or focus-canvas toggles.
  useEffect(() => {
    if (mode === 'visualize') {
      setNodes((nds) => layoutVisualizeCanvas(nds as PanelFlowNode[], layoutOpts()));
    }
    const id = requestAnimationFrame(() => fitCanvas(200));
    return () => cancelAnimationFrame(id);
  }, [fitCanvasSignal, rightOpen, rightTab, layoutPreset, fitCanvas, mode, setNodes, layoutOpts]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let t: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (mode === 'visualize') {
          setNodes((nds) => layoutVisualizeCanvas(nds as PanelFlowNode[], layoutOpts()));
        }
        fitCanvas(150);
      }, 150);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (t) window.clearTimeout(t);
    };
  }, [fitCanvas, mode, setNodes, layoutOpts]);

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

  // Keyboard: Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl/⌘+Y redo (#82); plain 'z' zoom-to-fit/selection (#77).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      const inField = isEditableTarget(t);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (!mod && (e.key === 'z' || e.key === 'Z') && !inField) {
        const selected = nodesRef.current.filter((n) => n.selected);
        fitView({ padding: FIT_PADDING, duration: FIT_VIEW_DURATION_MS, maxZoom: 1.0, nodes: selected.length ? selected : undefined });
        return;
      }
      if (!mod && (e.key === 'c' || e.key === 'C') && !inField) {
        e.preventDefault();
        toggleFocusCanvas();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitView, undo, redo, toggleFocusCanvas]);

  // ---- drag a removed panel back onto the canvas ----
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      const effectId = e.dataTransfer.getData(EFFECT_DND_KEY);
      if (effectId) {
        const node = createEffectByType(effectId, position);
        setNodes((nds) => [...nds, node as unknown as PanelFlowNode]);
        return;
      }

      const kind = e.dataTransfer.getData(DND_KEY);
      if (!kind || nodesRef.current.some((n) => n.id === kind)) return;
      removedRef.current[key]?.delete(kind);
      const node = nodeForKind(plugin, kind, position);
      const present = new Set([...nodesRef.current.map((n) => n.id), kind]);
      const newEdges = styleEdges(edgesForKind(plugin, mode, kind, present), edgeOpts).filter(
        (ne) => !edges.some((ee) => ee.id === ne.id),
      );
      setNodes((nds) => [...nds, node]);
      if (newEdges.length) setEdges((eds) => [...eds, ...newEdges]);
    },
    [plugin, mode, key, edgeOpts, edges, screenToFlowPosition, setNodes, setEdges],
  );

  const addableKinds = useMemo(() => {
    const present = new Set(nodes.map((n) => n.id));
    return modeNodeIds(plugin, mode)
      .filter((id) => !present.has(id))
      .map((id) => ({ id, title: kindTitle(plugin, id) }));
  }, [nodes, plugin, mode]);

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
      item: item.id,
      input: inputId || undefined,
      mode,
      theme,
      palette,
      themePreset,
      dir,
    }),
    [item.id, inputId, mode, theme, palette, themePreset, dir],
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
    [key, edgeOpts, persist, player, setNodes, setEdges, requestFitCanvas],
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

  useEffect(() => {
    if (mode !== 'visualize' || hasSeenDemoWorkflow()) return;
    const demo = WORKFLOW_PRESET_ACTIONS.find((p) => p.id === FIRST_VISIT_PRESET_ID);
    if (demo) applyWorkflowPreset(demo);
    markDemoWorkflowSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect mode: dragging from a handle wires a new (removable, styled) edge.
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      const label = edgeConnectionLabel(c, nodes);
      setEdges((eds) =>
        styleEdges(addEdge({ ...c, type: 'removable', data: { label } }, eds), edgeOpts),
      );
    },
    [setEdges, edgeOpts, nodes],
  );

  // Edge reconnection: drag an edge endpoint to a new handle (drop in empty space deletes it).
  const reconnectOk = useRef(true);
  const onReconnectStart = useCallback(() => {
    reconnectOk.current = false;
  }, []);
  const onReconnect = useCallback(
    (oldEdge: Edge, newConn: Connection) => {
      reconnectOk.current = true;
      setEdges((els) => styleEdges(reconnectEdge(oldEdge, newConn, els), edgeOpts));
    },
    [setEdges, edgeOpts],
  );
  const onReconnectEnd = useCallback(
    (_e: unknown, edge: Edge) => {
      if (!reconnectOk.current) setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      reconnectOk.current = true;
    },
    [setEdges],
  );

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

      const applySelectRelayout = (nds: PanelFlowNode[]) => {
        let next = nds.map((n) => {
          if (n.id === id && n.data.collapsed) return togglePanelCollapse(n);
          return { ...n, selected: n.id === id };
        });
        if (mode === 'visualize') {
          next = layoutVisualizeCanvas(next, layoutOpts());
          next = next.map((n) => ({ ...n, selected: n.id === id }));
        }
        return next;
      };

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

  const onNodeClick = useCallback(
    (e: React.MouseEvent, n: Node) => {
      const t = e.target as HTMLElement;
      if (t.closest('.nodrag') || t.closest('button, input, textarea, .cm-editor')) return;
      setNodes((nds) => nds.map((node) => ({ ...node, selected: node.id === n.id })));
    },
    [setNodes],
  );

  const canvasActions = useMemo(
    () => ({ focusPanel: focusNode, advancePractice, spawnConnectedPanel, layoutVisualizeOptions: layoutOpts }),
    [focusNode, advancePractice, spawnConnectedPanel, layoutOpts],
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
  const isValidConnection = useCallback(
    (c: Connection | Edge) => c.source !== c.target && !edges.some((e) => e.source === c.source && e.target === c.target),
    [edges],
  );

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
        <div ref={wrapperRef} className={cn('relative min-h-0 flex-1 bg-bg', dragOver && 'ring-2 ring-inset ring-good/40')}>
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
            onMove={() => setMenu(null)}
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
            {!present && <CanvasProblemNav />}
            <CanvasFloatingHud />
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
                No {mode} panels — drag one in from the “＋” menu.
              </p>
            </div>
          )}
        </div>
        </div>
        {!present && <UnifiedRightSidebar />}
        </div>
        </CanvasActionsProvider>
      </CanvasFrameProvider>
    </CanvasStaticProvider>
  );
}

export function CanvasStage(props: CanvasStageProps) {
  return (
    <ReactFlowProvider>
      <div className="h-full min-h-0 w-full">
        <Inner {...props} />
      </div>
    </ReactFlowProvider>
  );
}
