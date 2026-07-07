/**
 * React Flow ↔ Yjs binding helpers for the canvas collab spike.
 */
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import * as Y from 'yjs';
import { bindYjsCanvasMaps } from './yjsCanvasDoc';

export type CanvasGraph = { nodes: PanelFlowNode[]; edges: Edge[] };

/** Upsert graph into Yjs maps inside a single transaction. */
export function writeCanvasGraph(doc: Y.Doc, graph: CanvasGraph): void {
  const { nodes, edges } = bindYjsCanvasMaps(doc);
  doc.transact(() => {
    const nextNodeIds = new Set(graph.nodes.map((n) => n.id));
    for (const id of [...nodes.keys()]) {
      if (!nextNodeIds.has(id)) nodes.delete(id);
    }
    for (const node of graph.nodes) nodes.set(node.id, node);

    const nextEdgeIds = new Set(graph.edges.map((e) => e.id));
    for (const id of [...edges.keys()]) {
      if (!nextEdgeIds.has(id)) edges.delete(id);
    }
    for (const edge of graph.edges) edges.set(edge.id, edge);
  });
}

/** Read current graph from Yjs maps. */
export function readCanvasGraph(doc: Y.Doc): CanvasGraph {
  const { nodes, edges } = bindYjsCanvasMaps(doc);
  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

/** Subscribe to node/edge map changes; returns unsubscribe. */
export function observeCanvasGraph(
  doc: Y.Doc,
  onChange: (graph: CanvasGraph) => void,
): () => void {
  const maps = bindYjsCanvasMaps(doc);
  const handler = () => onChange(readCanvasGraph(doc));
  maps.nodes.observeDeep(handler);
  maps.edges.observeDeep(handler);
  return () => {
    maps.nodes.unobserveDeep(handler);
    maps.edges.unobserveDeep(handler);
  };
}
