import type { Edge } from '@xyflow/react';
import type { ProblemPlugin } from '../../core';
import {
  buildEdges,
  DEPRECATED_VISUALIZE_EDGES,
  REQUIRED_VISUALIZE_EDGES,
  defaultEdgeOpts,
  styleEdges,
} from './layout';

/** Drop retired shell edges; restore required wires unless the user removed them. */
export function sanitizeVisualizeEdges(
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
