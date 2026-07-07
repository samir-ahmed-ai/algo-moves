/**
 * Yjs document layout for canvas collaboration.
 *
 * Maps the host-authoritative {@link CanvasDoc} shape onto CRDT structures.
 * Used by shadow dual-write and Hocuspocus transport — see docs/yjs-hocuspocus-spike.md.
 */
import * as Y from 'yjs';
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import type { CanvasComment, CanvasDoc } from '../protocol/collabProtocol';

export const YJS_CANVAS_KEYS = {
  nodes: 'nodes',
  edges: 'edges',
  comments: 'comments',
  meta: 'meta',
} as const;

export type YjsCanvasMaps = {
  nodes: Y.Map<PanelFlowNode>;
  edges: Y.Map<Edge>;
  comments: Y.Map<CanvasComment>;
  meta: Y.Map<string | number | string[]>;
};

/** Attach named maps to a Y.Doc (idempotent). */
export function bindYjsCanvasMaps(doc: Y.Doc): YjsCanvasMaps {
  return {
    nodes: doc.getMap<PanelFlowNode>(YJS_CANVAS_KEYS.nodes),
    edges: doc.getMap<Edge>(YJS_CANVAS_KEYS.edges),
    comments: doc.getMap<CanvasComment>(YJS_CANVAS_KEYS.comments),
    meta: doc.getMap<string | number | string[]>(YJS_CANVAS_KEYS.meta),
  };
}

/** Hydrate Yjs maps from a persisted {@link CanvasDoc} snapshot. */
export function seedYjsCanvasDoc(doc: Y.Doc, snapshot: CanvasDoc): void {
  const maps = bindYjsCanvasMaps(doc);
  doc.transact(() => {
    maps.nodes.clear();
    maps.edges.clear();
    maps.comments.clear();
    for (const node of snapshot.nodes) maps.nodes.set(node.id, node);
    for (const edge of snapshot.edges) maps.edges.set(edge.id, edge);
    for (const comment of snapshot.comments) maps.comments.set(comment.id, comment);
    maps.meta.set('rev', snapshot.rev);
    maps.meta.set('removedPanels', snapshot.removedPanels);
    maps.meta.set('removedEdges', snapshot.removedEdges);
  });
}

/** Materialize a {@link CanvasDoc} from the current Yjs state. */
export function readYjsCanvasDoc(doc: Y.Doc): CanvasDoc {
  const maps = bindYjsCanvasMaps(doc);
  return {
    v: 1,
    rev: Number(maps.meta.get('rev') ?? 0),
    nodes: [...maps.nodes.values()],
    edges: [...maps.edges.values()],
    removedPanels: (maps.meta.get('removedPanels') as string[] | undefined) ?? [],
    removedEdges: (maps.meta.get('removedEdges') as string[] | undefined) ?? [],
    comments: [...maps.comments.values()],
  };
}

/** Encode document for Postgres persistence (binary CRDT update or snapshot). */
export function encodeYjsCanvasState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

/** Restore from persisted binary state. */
export function applyYjsCanvasState(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update);
}
