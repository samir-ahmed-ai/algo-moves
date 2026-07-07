/**
 * React Flow ↔ Yjs binding helpers for canvas collaboration.
 */
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { CanvasComment } from '../protocol/collabProtocol';
import * as Y from 'yjs';
import { bindYjsCanvasMaps } from './yjsCanvasDoc';

export type CanvasGraph = { nodes: PanelFlowNode[]; edges: Edge[] };

export type CanvasDocLive = CanvasGraph & { comments: CanvasComment[] };

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

/** Upsert graph + comments (Phase D transport). */
export function writeCanvasDoc(doc: Y.Doc, live: CanvasDocLive): void {
  const maps = bindYjsCanvasMaps(doc);
  doc.transact(() => {
    const nextNodeIds = new Set(live.nodes.map((n) => n.id));
    for (const id of [...maps.nodes.keys()]) {
      if (!nextNodeIds.has(id)) maps.nodes.delete(id);
    }
    for (const node of live.nodes) maps.nodes.set(node.id, node);

    const nextEdgeIds = new Set(live.edges.map((e) => e.id));
    for (const id of [...maps.edges.keys()]) {
      if (!nextEdgeIds.has(id)) maps.edges.delete(id);
    }
    for (const edge of live.edges) maps.edges.set(edge.id, edge);

    const nextCommentIds = new Set(live.comments.map((c) => c.id));
    for (const id of [...maps.comments.keys()]) {
      if (!nextCommentIds.has(id)) maps.comments.delete(id);
    }
    for (const comment of live.comments) maps.comments.set(comment.id, comment);
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
export function observeCanvasGraph(doc: Y.Doc, onChange: (graph: CanvasGraph) => void): () => void {
  const maps = bindYjsCanvasMaps(doc);
  const handler = () => onChange(readCanvasGraph(doc));
  maps.nodes.observeDeep(handler);
  maps.edges.observeDeep(handler);
  return () => {
    maps.nodes.unobserveDeep(handler);
    maps.edges.unobserveDeep(handler);
  };
}

/** Subscribe to graph + comments (Phase D transport). */
export function observeCanvasDoc(doc: Y.Doc, onChange: (live: CanvasDocLive) => void): () => void {
  const maps = bindYjsCanvasMaps(doc);
  const handler = () => {
    onChange({
      ...readCanvasGraph(doc),
      comments: [...maps.comments.values()],
    });
  };
  maps.nodes.observeDeep(handler);
  maps.edges.observeDeep(handler);
  maps.comments.observeDeep(handler);
  handler();
  return () => {
    maps.nodes.unobserveDeep(handler);
    maps.edges.unobserveDeep(handler);
    maps.comments.unobserveDeep(handler);
  };
}
