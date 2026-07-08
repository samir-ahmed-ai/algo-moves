import type { Edge } from '@xyflow/react';
import type { CanvasMode, ProblemPlugin } from '../../../core';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { EdgeOpts, LayoutVisualizeOptions } from '@/lib/canvas/layoutPrefs';
import {
  buildNodes,
  buildEdges,
  layoutVisualizeCanvas,
  layoutLearnCanvas,
  layoutGraph,
  layoutGraphAsync,
  nodeForKind,
  styleEdges,
  type LayoutDir,
} from '../layout/layout';
import { restoreNodeWidth } from '../nodes/nodeSnapshot';
import { buildInterviewBoardNodes } from '@/shell/interview/interviewLayout';

import type { PanelNodeStyle } from '@/core/panelFlowTypes';

/** Persisted per-node position + width (see useCanvasLayoutPersistence `Saved`). */
export type SavedNodeLayout = Record<
  string,
  {
    position: { x: number; y: number };
    width?: number;
    height?: number;
    parentId?: string;
    layoutSlots?: (string | null)[];
    slotIndex?: number;
    collapsed?: boolean;
    locked?: boolean;
    snapFill?: boolean;
    accent?: string;
    style?: PanelNodeStyle;
  }
>;

export interface CanvasFrameInput {
  /** Node ids the user removed in this mode. */
  removed?: Set<string>;
  /** Edge ids the user removed in this mode. */
  removedEdges?: Set<string>;
  /** Restored positions/sizes from a previous session in this mode. */
  saved?: SavedNodeLayout;
  /** Seed the first problem-backed visualize canvas with useful panels. */
  seedProblemCanvas?: boolean;
  /** Seed the standalone canvas with the interview board layout (whiteboard + notes + collab code). */
  seedInterviewCanvas?: boolean;
  layoutOpts: LayoutVisualizeOptions;
  dir: LayoutDir;
  edgeOpts: EdgeOpts;
}

/**
 * Pure node+edge assembly for a canvas mode — respects removals, runs the
 * mode's layout (dagre for graph, stacked for learn), and restores
 * saved positions/widths. Visualize mode is freeform (no auto-layout).
 */
export function buildCanvasFrame(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
  input: CanvasFrameInput,
): { nodes: PanelFlowNode[]; edges: Edge[] } {
  const { removed, removedEdges, saved, seedProblemCanvas, seedInterviewCanvas, dir, edgeOpts } =
    input;

  let nodes = buildNodes(plugin, mode);
  const hasSavedLayout = !!saved && Object.keys(saved).length > 0;
  const hasRemovedNodes = !!removed?.size;
  const canSeed = mode === 'visualize' && nodes.length === 0 && !hasSavedLayout && !hasRemovedNodes;
  const seededProblemCanvas = !!seedProblemCanvas && canSeed;
  // The interview board seeds whenever the canvas would otherwise boot empty:
  // seeded node ids are generated per session, so a stale saved layout or
  // removal set can never materialize nodes and must not block the board.
  const seededInterviewCanvas =
    !seededProblemCanvas && !!seedInterviewCanvas && mode === 'visualize' && nodes.length === 0;
  if (seededProblemCanvas) {
    nodes = [nodeForKind(plugin, 'workbench', { x: 0, y: 0 })];
  } else if (seededInterviewCanvas) {
    nodes = buildInterviewBoardNodes({ includeNotes: true, includeProblem: false });
  }
  if (removed?.size && !seededInterviewCanvas) nodes = nodes.filter((n) => !removed.has(n.id));
  const present = new Set(nodes.map((n) => n.id));
  const rmEdges = removedEdges ?? new Set<string>();
  const raw = buildEdges(plugin, mode)
    .filter((e) => present.has(e.source) && present.has(e.target))
    .filter((e) => !rmEdges.has(e.id));

  nodes =
    mode === 'visualize'
      ? seededProblemCanvas
        ? layoutVisualizeCanvas(nodes, input.layoutOpts)
        : nodes
      : mode === 'learn'
        ? layoutLearnCanvas(nodes, raw)
        : layoutGraph(nodes, raw, dir);

  if (saved) {
    nodes = nodes.map((n) => {
      const s = saved[n.id];
      if (!s) return n;
      const kind = n.data.kind ?? n.id;
      const width =
        mode === 'visualize' && (kind === 'viz' || kind === 'workbench')
          ? n.width
          : restoreNodeWidth(kind, s.width, n.width);
      const height = s.height ?? n.height;
      const layoutSlots = s.layoutSlots?.length ? [...s.layoutSlots] : n.data.layoutSlots;
      const slotIndex = s.slotIndex ?? n.data.slotIndex;
      const parentId = s.parentId ?? n.parentId;
      const base =
        mode === 'learn'
          ? {
              ...n,
              position: n.position,
              width,
              height,
              ...(parentId ? { parentId, extent: 'parent' as const } : {}),
            }
          : {
              ...n,
              position: s.position,
              width,
              height,
              ...(parentId ? { parentId, extent: 'parent' as const } : {}),
            };
      return {
        ...base,
        data: {
          ...n.data,
          ...(layoutSlots?.some(Boolean) ? { layoutSlots } : {}),
          ...(slotIndex != null ? { slotIndex } : {}),
          ...(s.collapsed ? { collapsed: true } : {}),
          ...(s.locked ? { locked: true } : {}),
          ...(s.snapFill && !s.collapsed ? { snapFill: true } : {}),
          ...(s.accent ? { accent: s.accent } : {}),
          ...(s.style ? { style: { ...n.data.style, ...s.style } } : {}),
        },
      } as PanelFlowNode;
    });
  }

  return { nodes, edges: styleEdges(raw, edgeOpts) };
}

export function organizeCurrentCanvasFrame(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
  nodes: PanelFlowNode[],
  input: Pick<CanvasFrameInput, 'layoutOpts' | 'dir' | 'edgeOpts'>,
): { nodes: PanelFlowNode[]; edges: Edge[] } {
  const present = new Set(nodes.map((n) => n.id));
  const raw = buildEdges(plugin, mode).filter(
    (e) => present.has(e.source) && present.has(e.target),
  );
  let kept: PanelFlowNode[] = nodes.map((n) => ({
    ...n,
    position: { x: 0, y: 0 },
    selected: false,
  }));
  kept =
    mode === 'visualize'
      ? layoutVisualizeCanvas(kept, input.layoutOpts)
      : mode === 'learn'
        ? layoutLearnCanvas(kept, raw)
        : layoutGraph(kept, raw, input.dir);
  return { nodes: kept, edges: styleEdges(raw, input.edgeOpts) };
}

/** Async organize — uses ELK when {@link resolveLayoutEngine} selects it. */
export async function organizeCurrentCanvasFrameAsync(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
  nodes: PanelFlowNode[],
  input: Pick<CanvasFrameInput, 'layoutOpts' | 'dir' | 'edgeOpts'>,
): Promise<{ nodes: PanelFlowNode[]; edges: Edge[] }> {
  const present = new Set(nodes.map((n) => n.id));
  const raw = buildEdges(plugin, mode).filter(
    (e) => present.has(e.source) && present.has(e.target),
  );
  let kept: PanelFlowNode[] = nodes.map((n) => ({
    ...n,
    position: { x: 0, y: 0 },
    selected: false,
  }));
  if (mode === 'visualize') {
    kept = layoutVisualizeCanvas(kept, input.layoutOpts);
  } else if (mode === 'learn') {
    kept = layoutLearnCanvas(kept, raw);
  } else {
    kept = await layoutGraphAsync(kept, raw, input.dir);
  }
  return { nodes: kept, edges: styleEdges(raw, input.edgeOpts) };
}
