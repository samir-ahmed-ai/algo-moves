import type { Edge } from '@xyflow/react';
import type { CanvasMode, ProblemPlugin } from '../../../core';
import type { PanelFlowNode } from '../nodes/PanelNode';
import type { EdgeOpts, LayoutVisualizeOptions } from '@/lib/canvas/layoutPrefs';
import {
  buildNodes,
  buildEdges,
  layoutLearnCanvas,
  layoutGraph,
  styleEdges,
  type LayoutDir,
} from '../layout/layout';
import { restoreNodeWidth } from '../nodes/nodeSnapshot';

/** Persisted per-node position + width (see useCanvasLayoutPersistence `Saved`). */
export type SavedNodeLayout = Record<string, { position: { x: number; y: number }; width?: number }>;

export interface CanvasFrameInput {
  /** Node ids the user removed in this mode. */
  removed?: Set<string>;
  /** Edge ids the user removed in this mode. */
  removedEdges?: Set<string>;
  /** Restored positions/sizes from a previous session in this mode. */
  saved?: SavedNodeLayout;
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
  const { removed, removedEdges, saved, dir, edgeOpts } = input;

  let nodes = buildNodes(plugin, mode);
  if (removed?.size) nodes = nodes.filter((n) => !removed.has(n.id));
  const present = new Set(nodes.map((n) => n.id));
  const rmEdges = removedEdges ?? new Set<string>();
  const raw = buildEdges(plugin, mode)
    .filter((e) => present.has(e.source) && present.has(e.target))
    .filter((e) => !rmEdges.has(e.id));

  nodes =
    mode === 'visualize'
      ? nodes
      : mode === 'learn'
        ? layoutLearnCanvas(nodes, raw)
        : layoutGraph(nodes, raw, dir);

  if (saved) {
    nodes = nodes.map((n) => {
      if (!saved[n.id]) return n;
      const kind = n.data.kind ?? n.id;
      const width =
        mode === 'visualize' && kind === 'viz'
          ? n.width
          : restoreNodeWidth(kind, saved[n.id].width, n.width);
      if (mode === 'learn') {
        return { ...n, position: n.position, width };
      }
      return { ...n, position: saved[n.id].position, width };
    });
  }

  return { nodes, edges: styleEdges(raw, edgeOpts) };
}
