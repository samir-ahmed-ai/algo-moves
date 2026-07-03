import type { Edge } from '@xyflow/react';
import type { CanvasMode, ProblemPlugin } from '../../core';
import type { PanelFlowNode } from './PanelNode';
import type { EdgeOpts, LayoutVisualizeOptions } from '@/lib/canvas/layoutPrefs';
import {
  buildNodes,
  buildEdges,
  layoutVisualizeCanvas,
  layoutLearnCanvas,
  layoutGraph,
  styleEdges,
  type LayoutDir,
} from './layout';
import { restoreNodeWidth } from './nodeSnapshot';

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
 * mode's layout (dagre for graph, stacked for visualize/learn), and restores
 * saved positions/widths. Extracted from CanvasStage.buildFor so the layout
 * math is testable and side-effect free (it reads no refs and no React state).
 */
export function buildCanvasFrame(
  plugin: ProblemPlugin<any, any>,
  mode: CanvasMode,
  input: CanvasFrameInput,
): { nodes: PanelFlowNode[]; edges: Edge[] } {
  const { removed, removedEdges, saved, layoutOpts, dir, edgeOpts } = input;

  let nodes = buildNodes(plugin, mode);
  if (removed?.size) nodes = nodes.filter((n) => !removed.has(n.id));
  const present = new Set(nodes.map((n) => n.id));
  const rmEdges = removedEdges ?? new Set<string>();
  const raw = buildEdges(plugin, mode)
    .filter((e) => present.has(e.source) && present.has(e.target))
    .filter((e) => !rmEdges.has(e.id));

  nodes =
    mode === 'visualize'
      ? layoutVisualizeCanvas(nodes, layoutOpts)
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
      // Visualize / Learn: keep canonical stacked layout; restore widths only.
      if (mode === 'visualize' || mode === 'learn') {
        return { ...n, position: n.position, width };
      }
      return { ...n, position: saved[n.id].position, width };
    });
  }

  return { nodes, edges: styleEdges(raw, edgeOpts) };
}
