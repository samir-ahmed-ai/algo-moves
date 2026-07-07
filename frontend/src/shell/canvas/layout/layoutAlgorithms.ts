import dagre from '@dagrejs/dagre';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Position, type Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { LayoutVisualizeOptions } from '@/lib/canvas/layoutPrefs';
import {
  CANVAS_MARGIN,
  CANVAS_NODE_SEP,
  MIN_VIEWPORT_HEIGHT,
  STRUDEL_NODE_W,
  layoutEstimate,
  layoutHeight,
} from '../tokens';

export type LayoutDir = 'TB' | 'LR';
export type LayoutEngine = 'dagre' | 'elk';

const elk = new ELK();
const ELK_NODE_THRESHOLD = 20;

/** Pick layout engine from env or graph size (large graphs benefit from ELK layered). */
export function resolveLayoutEngine(nodeCount: number): LayoutEngine {
  const pref = import.meta.env.VITE_LAYOUT_ENGINE;
  if (pref === 'elk') return 'elk';
  if (pref === 'dagre') return 'dagre';
  return nodeCount >= ELK_NODE_THRESHOLD ? 'elk' : 'dagre';
}

function elkDirection(rankdir: LayoutDir): string {
  return rankdir === 'LR' ? 'RIGHT' : 'DOWN';
}

function handlesForDir(rankdir: LayoutDir) {
  return rankdir === 'LR'
    ? { sourcePosition: Position.Right, targetPosition: Position.Left }
    : { sourcePosition: Position.Bottom, targetPosition: Position.Top };
}

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

/** Visualize mode: unified workbench fills the viewport; optional panels lay out to the right. */
export function layoutVisualizeCanvas(
  nodes: PanelFlowNode[],
  options?: LayoutVisualizeOptions,
): PanelFlowNode[] {
  if (nodes.length === 0) return nodes;

  const vp = options?.viewport;
  const workbench = findKind(nodes, 'workbench');
  const rest = nodes.filter((n) => n !== workbench);

  const colX = CANVAS_MARGIN;
  const colY = CANVAS_MARGIN;

  if (workbench && vp) {
    const availW = Math.max(STRUDEL_NODE_W * 2, vp.width - CANVAS_MARGIN * 2);
    const availH = Math.max(MIN_VIEWPORT_HEIGHT, vp.height - CANVAS_MARGIN * 2);
    const wbH = Math.max(availH, nodeH(workbench));
    const positioned: PanelFlowNode[] = [
      rowHandles({
        ...workbench,
        position: { x: colX, y: colY },
        width: availW,
        height: wbH,
      }),
    ];

    let x = colX + availW + CANVAS_NODE_SEP;
    for (const n of rest) {
      positioned.push(
        rowHandles({
          ...n,
          position: { x, y: colY + Math.max(0, (wbH - nodeH(n)) / 2) },
        }),
      );
      x += nodeW(n) + CANVAS_NODE_SEP;
    }
    return positioned;
  }

  if (workbench) {
    const wbH = nodeH(workbench);
    const positioned: PanelFlowNode[] = [
      rowHandles({
        ...workbench,
        position: { x: colX, y: colY },
        width: nodeW(workbench),
        height: wbH,
      }),
    ];
    let x = colX + nodeW(workbench) + CANVAS_NODE_SEP;
    for (const n of rest) {
      positioned.push(
        rowHandles({
          ...n,
          position: { x, y: colY + Math.max(0, (wbH - nodeH(n)) / 2) },
        }),
      );
      x += nodeW(n) + CANVAS_NODE_SEP;
    }
    return positioned;
  }

  let rx = CANVAS_MARGIN;
  const rH = Math.max(...nodes.map((n) => nodeH(n)));
  return nodes.map((n) => {
    const pos = { x: rx, y: CANVAS_MARGIN + Math.max(0, (rH - nodeH(n)) / 2) };
    rx += nodeW(n) + CANVAS_NODE_SEP;
    return rowHandles({ ...n, position: pos });
  });
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

/** ELK layered layout — better for dense graphs; async because elkjs returns a Promise. */
export async function layoutGraphElk(
  nodes: PanelFlowNode[],
  edges: Edge[],
  rankdir: LayoutDir = 'TB',
): Promise<PanelFlowNode[]> {
  if (nodes.length === 0) return nodes;
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDirection(rankdir),
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '52',
    },
    children: nodes.map((n) => {
      const est = layoutEstimate(n.data.kind ?? n.id);
      return {
        id: n.id,
        width: n.width ?? est.w,
        height: n.height ?? est.estH,
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };
  const layouted = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    if (child.id && child.x != null && child.y != null) {
      positions.set(child.id, { x: child.x, y: child.y });
    }
  }
  const handles = handlesForDir(rankdir);
  return nodes.map((n) => {
    const pos = positions.get(n.id);
    if (!pos) return n;
    return { ...n, ...handles, position: { x: pos.x, y: pos.y } };
  });
}

/** Resolve engine preference and run the matching layout (ELK when selected). */
export async function layoutGraphAsync(
  nodes: PanelFlowNode[],
  edges: Edge[],
  rankdir: LayoutDir = 'TB',
  engine?: LayoutEngine,
): Promise<PanelFlowNode[]> {
  const pick = engine ?? resolveLayoutEngine(nodes.length);
  if (pick === 'elk') return layoutGraphElk(nodes, edges, rankdir);
  return layoutGraph(nodes, edges, rankdir);
}
