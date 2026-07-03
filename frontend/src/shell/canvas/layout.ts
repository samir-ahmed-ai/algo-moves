import dagre from '@dagrejs/dagre';
import { ConnectionLineType, MarkerType, Position, type Connection, type Edge, type Node, type XYPosition } from '@xyflow/react';
import type { CanvasMode, ProblemPlugin } from '../../core';
import {
  DOCK_ONLY_PANELS,
  modeBuiltins,
  modeOptional,
  panelCategory,
  panelTitle,
} from '../../core/panelRegistry';
import type { PanelFlowNode } from './PanelNode';
import { getMeasuredHeight } from './measuredCache';
import {
  CANVAS_MARGIN,
  CANVAS_NODE_SEP,
  canvasNodeSep,
  MIN_VIEWPORT_HEIGHT,
  vizMinWidth,
  vizWireGap,
} from './canvasTokens';
import {
  layoutEstimate,
  layoutHeight,
  layoutSize,
  sizeOf,
  STRUDEL_NODE_W,
} from './nodeTokens';
// Canvas layout/edge preference data + types are homed in the lib leaf so store
// and lib can share them; re-exported here for layout.ts's existing consumers.
import {
  LAYOUT_PRESETS,
  defaultEdgeOpts,
  type LayoutPreset,
  type LayoutVisualizeOptions,
  type BgVariant,
  type EdgePathType,
  type EdgeOpts,
} from '@/lib/canvas/layoutPrefs';

export { layoutEstimate, layoutCap, layoutFixedWidth, layoutSize, nodeTier } from './nodeTokens';
export { CANVAS_MARGIN, CANVAS_NODE_SEP, VIZ_WIRE_GAP } from './canvasTokens';
export { LAYOUT_PRESETS, defaultEdgeOpts };
export type { LayoutPreset, LayoutVisualizeOptions, BgVariant, EdgePathType, EdgeOpts };
export { CATEGORY_ORDER, DOCK_ONLY_PANELS } from '../../core/panelRegistry';

/** Width of the right-side dock that hosts `mode:'visualize'` plugin tabs (e.g. Cases). */
export const SIDE_DOCK_WIDTH = STRUDEL_NODE_W;

/** Built-in panels shown per mode by default (plugin tabs are added by their tab.mode). */
const MODE_BUILTINS: Record<CanvasMode, string[]> = {
  visualize: modeBuiltins('visualize'),
  learn: modeBuiltins('learn'),
};

/** Built-ins known to a mode but hidden until added from the ＋ menu. */
const MODE_OPTIONAL: Record<CanvasMode, string[]> = {
  visualize: modeOptional('visualize'),
  learn: modeOptional('learn'),
};

export function nodeCategory(id: string): string {
  return panelCategory(id);
}

export function kindTitle(plugin: ProblemPlugin<any, any>, id: string): string {
  return panelTitle(id, plugin.tabs?.find((t) => t.id === id)?.label);
}

function makeNode(id: string, title: string, position: XYPosition): PanelFlowNode {
  const { w } = sizeOf(id);
  return { id, type: 'panel', position, width: w, data: { kind: id, title } };
}

function tabInMode(tab: { mode?: string }, mode: CanvasMode): boolean {
  const tm = tab.mode ?? 'visualize';
  if (mode === 'learn') return tm === 'learn' || tm === 'practice';
  return tm === mode;
}

/**
 * Tabs that render in the right-side dock instead of as canvas nodes:
 * any `mode:'visualize'` tab (e.g. Cases), or any tab that opts in with `side:true`.
 */
function isSideTab(tab: { mode?: string; side?: boolean }): boolean {
  return tab.side === true || (tab.mode ?? 'visualize') === 'visualize';
}

/** Side-dock tabs that belong to the given canvas mode (Cases→visualize, Simulate→learn). */
export function sidePanelTabs(plugin: ProblemPlugin<any, any>, mode: CanvasMode) {
  return (plugin.tabs ?? []).filter((t) => isSideTab(t) && tabInMode(t, mode));
}

function modeTabIds(plugin: ProblemPlugin<any, any>, mode: CanvasMode): string[] {
  return (plugin.tabs ?? []).filter((t) => tabInMode(t, mode) && !isSideTab(t)).map((t) => t.id);
}

/** All node ids a mode knows about (default + optional + tabs) — used for ＋-menu/edges/removal. */
export function modeNodeIds(plugin: ProblemPlugin<any, any>, mode: CanvasMode): string[] {
  const ids = [...MODE_BUILTINS[mode], ...MODE_OPTIONAL[mode], ...modeTabIds(plugin, mode)];
  if (mode === 'visualize') return ids.filter((id) => !DOCK_ONLY_PANELS.has(id));
  return ids;
}

/** Node ids shown by default (excludes optional, ＋-menu-only panels). */
function defaultNodeIds(plugin: ProblemPlugin<any, any>, mode: CanvasMode): string[] {
  return [...MODE_BUILTINS[mode], ...modeTabIds(plugin, mode)];
}

export function buildNodes(plugin: ProblemPlugin<any, any>, mode: CanvasMode): PanelFlowNode[] {
  return defaultNodeIds(plugin, mode).map((id) => makeNode(id, kindTitle(plugin, id), { x: 0, y: 0 }));
}

// ---- named layout presets (#74) — LAYOUT_PRESETS/LayoutPreset live in lib/canvas/layoutPrefs ----

/** UI copy for preset picker — icons stay in PresetPopover. */
export const LAYOUT_PRESET_META: Record<
  LayoutPreset,
  { label: string; description: string; sketch: string }
> = {
  Full: {
    label: 'Full',
    description: 'Every panel — maximum context',
    sketch: '[P][V][+][+][+]',
  },
  Study: {
    label: 'Study',
    description: 'Core learn panels — problem path + code',
    sketch: '[P][V] · predict · code',
  },
  Minimal: {
    label: 'Minimal',
    description: 'Bare essentials, no extras',
    sketch: '[P][V]',
  },
  Theater: {
    label: 'Theater',
    description: 'Wide visualizer — tighter wire corridor',
    sketch: '[P]|████████V████████|',
  },
  Demo: {
    label: 'Demo',
    description: 'Theater layout + presentation hint',
    sketch: '[P]|████V████| 🎯',
  },
};


/** Default panels each preset keeps per mode (undefined mode = keep all). */
const PRESET_KEEP: Record<LayoutPreset, Partial<Record<CanvasMode, string[]>>> = {
  Full: {},
  Study: {
    visualize: ['problem', 'viz'],
    learn: ['predict', 'mastery', 'code'],
  },
  Minimal: {
    visualize: ['problem', 'viz'],
    learn: ['predict', 'code'],
  },
  Theater: {
    visualize: ['problem', 'viz'],
  },
  Demo: {
    visualize: ['problem', 'viz'],
  },
};

/** Ids to mark removed for a preset (so buildFor hides them). Empty = show everything. */
export function presetRemoved(plugin: ProblemPlugin<any, any>, mode: CanvasMode, preset: LayoutPreset): string[] {
  const keep = PRESET_KEEP[preset]?.[mode];
  if (!keep) return [];
  return modeNodeIds(plugin, mode).filter((id) => !keep.includes(id));
}

/** A single node for a kind at a drop position (drag-to-add). */
export function nodeForKind(
  plugin: ProblemPlugin<any, any>,
  id: string,
  position: XYPosition,
): PanelFlowNode {
  return makeNode(id, kindTitle(plugin, id), position);
}

/** Obsolete shell edges from before the unified problem panel; stripped on load. */
export const DEPRECATED_VISUALIZE_EDGES = new Set(['examples->problem', 'examples->viz']);

/** Shell edges always restored on sanitize (data path). */
export const REQUIRED_VISUALIZE_EDGES = new Set(['problem->viz']);

/** Shared input port on the visualizer — problem wires here. */
export const VIZ_INPUT_HANDLE = 'viz-in';

const SHELL_WIRES: Record<CanvasMode, [string, string, string?][]> = {
  visualize: [
    ['problem', 'viz'],
    ['viz', 'code'],
    ['viz', 'reassemble'],
    ['viz', 'recall'],
  ],
  learn: [
    ['predict', 'mastery'],
    ['mastery', 'code'],
    ['code', 'explain'],
    ['explain', 'badges'],
  ],
};

function pluginWires(plugin: ProblemPlugin<any, any>, mode: CanvasMode): [string, string, string?][] {
  if (mode === 'learn') return plugin.wires?.learn ?? plugin.wires?.practice ?? [];
  return plugin.wires?.[mode] ?? [];
}

function allWires(plugin: ProblemPlugin<any, any>, mode: CanvasMode): [string, string, string?][] {
  return [...SHELL_WIRES[mode], ...pluginWires(plugin, mode)];
}

function rawEdge(a: string, b: string, label?: string): Edge {
  const id = `${a}->${b}`;
  const targetHandle = b === 'viz' && a === 'problem' ? VIZ_INPUT_HANDLE : undefined;
  const data: Record<string, unknown> = { pathType: 'bezier' as EdgePathType };
  if (label) data.label = label;
  return {
    id,
    source: a,
    target: b,
    type: 'removable',
    ...(targetHandle ? { targetHandle } : {}),
    data,
  };
}

export function buildEdges(plugin: ProblemPlugin<any, any>, mode: CanvasMode): Edge[] {
  const ids = new Set(modeNodeIds(plugin, mode));
  return allWires(plugin, mode)
    .filter(([a, b]) => ids.has(a) && ids.has(b))
    .map(([a, b, label]) => rawEdge(a, b, label));
}

/** Next panel in a mode's wire chain after `fromId`, if any. */
export function nextPracticePanel(plugin: ProblemPlugin<any, any>, mode: CanvasMode, fromId: string): string | null {
  const edge = allWires(plugin, mode).find(([a]) => a === fromId);
  return edge ? edge[1] : null;
}

/** Edges touching `id` whose other endpoint is present (used when re-adding a dropped node). */
export function edgesForKind(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
  id: string,
  present: Set<string>,
): Edge[] {
  return allWires(plugin, mode)
    .filter(([a, b]) => (a === id || b === id) && present.has(a) && present.has(b))
    .map(([a, b, label]) => rawEdge(a, b, label));
}

export type LayoutDir = 'TB' | 'LR';

const LEARN_NODE_SEP = CANVAS_NODE_SEP;
const LEARN_RANK_SEP = 40;

const nodeW = (n: PanelFlowNode) => n.width ?? layoutEstimate(n.data.kind ?? n.id).w;
const nodeH = (n: PanelFlowNode) => layoutHeight(n.data.kind ?? n.id, n.id, n.height);

const stackHandles = (n: PanelFlowNode) => ({
  ...n,
  sourcePosition: Position.Bottom,
  targetPosition: Position.Top,
});

const rowHandles = (n: PanelFlowNode) => ({
  ...n,
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
});

/** Order row nodes left-to-right by wire chain (topological walk). */
function wireOrderRow(nodes: PanelFlowNode[], edges: Edge[]): PanelFlowNode[] {
  if (nodes.length <= 1) return nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ids = new Set(nodes.map((n) => n.id));
  const next = new Map<string, string>();
  const inCount = new Map<string, number>();
  for (const id of ids) inCount.set(id, 0);
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    if (!next.has(e.source)) next.set(e.source, e.target);
    inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1);
  }
  const ordered: PanelFlowNode[] = [];
  const visited = new Set<string>();
  const heads = nodes.filter((n) => (inCount.get(n.id) ?? 0) === 0);
  for (const head of heads) {
    let cur: string | undefined = head.id;
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const n = byId.get(cur);
      if (n) ordered.push(n);
      cur = next.get(cur);
    }
  }
  for (const n of nodes) {
    if (!visited.has(n.id)) ordered.push(n);
  }
  return ordered;
}

function isLearnAnchor(n: PanelFlowNode) {
  const k = n.data.kind ?? n.id;
  return k === 'code' || k === 'scratch';
}

function findKind(nodes: PanelFlowNode[], kind: string) {
  return nodes.find((n) => n.id === kind || n.data.kind === kind);
}

/** Vertically center a stack of height `colH` within a span of height `spanH`. */
function centerStackY(colY: number, spanH: number, colH: number): number {
  return colY + Math.max(0, (spanH - colH) / 2);
}

/** Position the unified problem panel in the left column. */
function layoutLeftColumn(
  problem: PanelFlowNode | undefined,
  x: number,
  y: number,
): { nodes: PanelFlowNode[]; colW: number; colH: number } {
  const fixedW = layoutEstimate('problem').w;
  if (!problem) return { nodes: [], colW: fixedW, colH: 0 };

  const problemNode = rowHandles({
    ...problem,
    position: { x, y } as XYPosition,
    width: fixedW,
  });
  return { nodes: [problemNode], colW: fixedW, colH: nodeH(problemNode) };
}

function leftColumnHeight(problem: PanelFlowNode | undefined): number {
  return problem ? nodeH(problem) : 0;
}

/** Visualize mode: unified problem panel on the left, vertically centered against the visualizer. */
export function layoutVisualizeCanvas(
  nodes: PanelFlowNode[],
  options?: LayoutVisualizeOptions,
): PanelFlowNode[] {
  if (nodes.length === 0) return nodes;

  const vp = options?.viewport;
  const theater = options?.preset === 'Theater' || options?.preset === 'Demo';
  const problem = findKind(nodes, 'problem');
  const viz = findKind(nodes, 'viz');
  const rest = nodes.filter((n) => n !== problem && n !== viz);

  const colW = vp ? layoutSize('problem', vp).w : layoutEstimate('problem').w;
  const nodeSep = canvasNodeSep(colW);
  const wireGap = vizWireGap(colW, theater ? 'theater' : 'default');
  const colX = CANVAS_MARGIN;
  const colY = CANVAS_MARGIN;

  if (problem && viz && vp) {
    const availW = Math.max(
      vizMinWidth(colW),
      vp.width - CANVAS_MARGIN * 2 - colW - wireGap,
    );
    const availH = Math.max(MIN_VIEWPORT_HEIGHT, vp.height - CANVAS_MARGIN * 2);
    const colH = leftColumnHeight(problem);
    const stackY = centerStackY(colY, availH, colH);

    const { nodes: colNodes } = layoutLeftColumn(problem, colX, stackY);

    const vizX = colX + colW + wireGap;
    // The visualizer hugs its board + rail (measured) rather than stretching to
    // the full viewport height, so it no longer leaves a tall empty node.
    // Centre it against the same span as the left column.
    const vizH = Math.min(availH, viz.measured?.height ?? getMeasuredHeight(viz.id) ?? nodeH(viz));
    const vizY = colY + Math.max(0, (availH - vizH) / 2);
    const positioned: PanelFlowNode[] = [
      ...colNodes,
      rowHandles({
        ...viz,
        position: { x: vizX, y: vizY },
        width: availW,
        height: vizH,
      }),
    ];

    let x = vizX + availW + nodeSep;
    for (const n of rest) {
      positioned.push(
        rowHandles({
          ...n,
          position: { x, y: colY + Math.max(0, (availH - nodeH(n)) / 2) },
        }),
      );
      x += nodeW(n) + CANVAS_NODE_SEP;
    }
    return positioned;
  }

  const colH = leftColumnHeight(problem);
  const vizH = viz ? Math.max(nodeH(viz), colH) : colH;
  const stackY = viz ? centerStackY(colY, vizH, colH) : colY;
  const { nodes: colNodes } = layoutLeftColumn(problem, colX, stackY);
  const positioned: PanelFlowNode[] = [...colNodes];

  let x = colX + colW + wireGap;
  const rowH = Math.max(colH, viz ? nodeH(viz) : 0, ...rest.map((n) => nodeH(n)));

  if (viz) {
    positioned.push(
      rowHandles({
        ...viz,
        position: { x, y: colY },
        height: Math.max(nodeH(viz), colH),
      }),
    );
    x += nodeW(viz) + CANVAS_NODE_SEP;
  }

  for (const n of rest) {
    positioned.push(
      rowHandles({
        ...n,
        position: { x, y: colY + Math.max(0, (rowH - nodeH(n)) / 2) },
      }),
    );
    x += nodeW(n) + CANVAS_NODE_SEP;
  }

  // Nodes with no problem/viz match (edge case): lay out in a row
  if (positioned.length === 0) {
    let rx = CANVAS_MARGIN;
    const rH = Math.max(...nodes.map((n) => nodeH(n)));
    return nodes.map((n) => {
      const pos = { x: rx, y: CANVAS_MARGIN + Math.max(0, (rH - nodeH(n)) / 2) };
      rx += nodeW(n) + CANVAS_NODE_SEP;
      return rowHandles({ ...n, position: pos });
    });
  }

  return positioned;
}

/** Learn mode: compact practice panels in a top row, wide Code Studio anchored below. */
export function layoutLearnCanvas(nodes: PanelFlowNode[], edges: Edge[] = []): PanelFlowNode[] {
  if (nodes.length === 0) return nodes;
  const anchor = nodes.find(isLearnAnchor);
  const rowNodes = nodes.filter((n) => !isLearnAnchor(n));
  if (!anchor && rowNodes.length === 0) return nodes;
  if (!anchor) return layoutGraph(nodes, edges, 'TB');
  if (rowNodes.length === 0) {
    return [stackHandles({ ...anchor, position: { x: CANVAS_MARGIN, y: CANVAS_MARGIN } })];
  }

  const rowEdges = edges.filter((e) => rowNodes.some((n) => n.id === e.source) && rowNodes.some((n) => n.id === e.target));
  const orderedRow = wireOrderRow(rowNodes, rowEdges);
  const rowWidth = orderedRow.reduce((sum, n, i) => sum + nodeW(n) + (i > 0 ? LEARN_NODE_SEP : 0), 0);
  const spanW = Math.max(nodeW(anchor), rowWidth);

  const rowY = CANVAS_MARGIN;
  let x = CANVAS_MARGIN + Math.max(0, (spanW - rowWidth) / 2);
  const positionedRow = orderedRow.map((n) => {
    const pos = { x, y: rowY };
    x += nodeW(n) + LEARN_NODE_SEP;
    return { ...n, position: pos };
  });

  const rowH = Math.max(...orderedRow.map((n) => nodeH(n)));
  const anchorY = rowY + rowH + LEARN_RANK_SEP;
  const anchorX = CANVAS_MARGIN + Math.max(0, (spanW - nodeW(anchor)) / 2);

  return [...positionedRow.map(stackHandles), stackHandles({ ...anchor, position: { x: anchorX, y: anchorY } })];
}

/** Auto-organize the graph with dagre (top-to-bottom by default, left-to-right optional). */
export function layoutGraph(nodes: PanelFlowNode[], edges: Edge[], rankdir: LayoutDir = 'TB'): PanelFlowNode[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 40, ranksep: 52, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => {
    const est = layoutEstimate(n.data.kind ?? n.id);
    g.setNode(n.id, { width: n.width ?? est.w, height: n.height ?? est.estH });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    const est = layoutEstimate(n.data.kind ?? n.id);
    const w = n.width ?? est.w;
    const h = n.height ?? est.estH;
    return { ...n, position: { x: p.x - w / 2, y: p.y - h / 2 } };
  });
}

// ---- user-controllable edge appearance ----

/** Accent swatches a node can be re-coloured to (NodeToolbar / context menu). */
export const ACCENTS = ['var(--accent)', 'var(--good)', 'var(--bad)', 'var(--team1-stroke)', 'var(--team2-stroke)', 'var(--edge-active)'];

/** Fit-view padding constants — single source for canvas chrome-aware framing. */
export const FIT_PADDING = 0.08;
export const FIT_PADDING_VIEW = 0.2;
export const FIT_PADDING_FOCUS = 0.4;

export function connectionLineType(pathType: EdgePathType): ConnectionLineType {
  switch (pathType) {
    case 'bezier':
      return ConnectionLineType.Bezier;
    case 'straight':
      return ConnectionLineType.Straight;
    case 'step':
    case 'smoothstep':
    default:
      return ConnectionLineType.SmoothStep;
  }
}

/** Short label shown on removable edges (Strudel Flow ButtonEdge analogue). */
export function edgeConnectionLabel(connection: Pick<Connection, 'source' | 'target'>, nodes: Node[]): string {
  const src = nodes.find((n) => n.id === connection.source);
  const tgt = nodes.find((n) => n.id === connection.target);
  if (src?.type === 'effect' && tgt?.type === 'effect') return '→';
  if (tgt?.type === 'effect') return 'in';
  if (src?.type === 'effect') return 'out';
  return '·';
}

export function styleEdges(edges: Edge[], o: EdgeOpts, nodes?: Node[]): Edge[] {
  return edges.map((e) => {
    const stroke = (e.data as { stroke?: string } | undefined)?.stroke ?? 'var(--edge)';
    const pathType = (e.data as { pathType?: EdgePathType } | undefined)?.pathType ?? o.pathType;
    const existingLabel = (e.data as { label?: string } | undefined)?.label;
    const label = existingLabel ?? (nodes ? edgeConnectionLabel(e, nodes) : undefined);
    return {
      ...e,
      type: 'removable',
      animated: o.animated,
      markerEnd: o.arrow
        ? { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 }
        : undefined,
      style: { ...e.style, stroke, strokeWidth: o.strokeWidth },
      data: { ...(e.data ?? {}), pathType, ...(label ? { label } : {}) },
    };
  });
}
