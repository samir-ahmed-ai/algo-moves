/**
 * Wire contract for real-time canvas collaboration.
 *
 * Everything rides the shared room relay (frontend/src/shell/realtime). Two
 * kinds of traffic share one channel, distinguished by a `__canvas` tag so the
 * arcade's own `__arcade` room messages and any game moves never collide:
 *
 *  - EPHEMERAL presence (cursors, selections, viewports, live drags) is peer
 *    broadcast over `relay` frames — lossy and safe to drop.
 *  - The shared DOCUMENT (nodes, edges, comments) is host-authoritative: the
 *    host mirrors it into the room's persisted `state` (replayed to late
 *    joiners); non-hosts send node-granular {@link EditOp}s the host folds in.
 *
 * This file is pure types + guards — no React, no transport. The document
 * mechanics live in {@link ./canvasDoc}.
 */
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';

/** Discriminator every collaboration message carries. */
export const CANVAS_TAG = '__canvas' as const;

/** A pinned, threaded comment anchored to a point in flow coordinates. */
export interface CanvasCommentReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  at: number;
}

export interface CanvasComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  /** Anchor in ReactFlow coordinates so the pin tracks pan/zoom. */
  x: number;
  y: number;
  at: number;
  resolved: boolean;
  replies: CanvasCommentReply[];
}

/**
 * The shared canvas document. This is exactly what the host publishes into the
 * room's `state`; it is a superset of the app's ProjectState graph plus the
 * collaboration-only `comments` layer.
 */
export interface CanvasDoc {
  v: 1;
  /** Monotonic revision the host bumps on every authoritative publish. */
  rev: number;
  nodes: PanelFlowNode[];
  edges: Edge[];
  removedPanels: string[];
  removedEdges: string[];
  comments: CanvasComment[];
}

// ---- Ephemeral presence -----------------------------------------------------

/** Live cursor position, in flow coordinates. */
export interface CursorOp {
  [CANVAS_TAG]: 'cursor';
  x: number;
  y: number;
}
/** The node ids a peer currently has selected. */
export interface SelectionOp {
  [CANVAS_TAG]: 'selection';
  ids: string[];
}
/** A peer's viewport, so followers can mirror it. */
export interface ViewportOp {
  [CANVAS_TAG]: 'viewport';
  x: number;
  y: number;
  zoom: number;
}
/** A node being dragged live — high frequency, dropped for its owner's peers. */
export interface DragOp {
  [CANVAS_TAG]: 'drag';
  id: string;
  x: number;
  y: number;
}
/** Ask everyone to re-announce (sent by late joiners). */
export interface PresenceRequestOp {
  [CANVAS_TAG]: 'presence-request';
}

export type PresenceOp = CursorOp | SelectionOp | ViewportOp | DragOp | PresenceRequestOp;

// ---- Document edits (optimistic intents non-hosts send the host) ------------

export interface NodeAddOp {
  [CANVAS_TAG]: 'node-add';
  node: PanelFlowNode;
  edges?: Edge[];
}
export interface NodeRemoveOp {
  [CANVAS_TAG]: 'node-remove';
  id: string;
}
export interface NodeMoveOp {
  [CANVAS_TAG]: 'node-move';
  id: string;
  x: number;
  y: number;
  width?: number;
}
export interface NodePatchOp {
  [CANVAS_TAG]: 'node-patch';
  id: string;
  data: Partial<PanelNodeData>;
}
export interface EdgeAddOp {
  [CANVAS_TAG]: 'edge-add';
  edge: Edge;
}
export interface EdgeRemoveOp {
  [CANVAS_TAG]: 'edge-remove';
  id: string;
}
export interface CommentAddOp {
  [CANVAS_TAG]: 'comment-add';
  comment: CanvasComment;
}
export interface CommentReplyOp {
  [CANVAS_TAG]: 'comment-reply';
  id: string;
  reply: CanvasCommentReply;
}
export interface CommentResolveOp {
  [CANVAS_TAG]: 'comment-resolve';
  id: string;
  resolved: boolean;
}
export interface CommentRemoveOp {
  [CANVAS_TAG]: 'comment-remove';
  id: string;
}

export type EditOp =
  | NodeAddOp
  | NodeRemoveOp
  | NodeMoveOp
  | NodePatchOp
  | EdgeAddOp
  | EdgeRemoveOp
  | CommentAddOp
  | CommentReplyOp
  | CommentResolveOp
  | CommentRemoveOp;

export type CanvasOp = PresenceOp | EditOp;

/** Structural edits change the document; presence never does. */
export function isEditOp(op: CanvasOp): op is EditOp {
  switch (op[CANVAS_TAG]) {
    case 'cursor':
    case 'selection':
    case 'viewport':
    case 'drag':
    case 'presence-request':
      return false;
    default:
      return true;
  }
}

/** Narrow an unknown relay payload to a canvas message. */
export function isCanvasOp(value: unknown): value is CanvasOp {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>)[CANVAS_TAG] === 'string'
  );
}

/**
 * Stable, high-contrast palette for peer identity (cursor, selection halo,
 * roster dot). Assigned by a peer's position in the sorted roster so colors are
 * consistent across clients without any negotiation.
 */
export const PEER_COLORS = [
  '#e5484d', // red
  '#0090ff', // blue
  '#30a46c', // green
  '#f76b15', // orange
  '#8e4ec6', // purple
  '#e93d82', // pink
  '#ffb224', // amber
  '#00a2c7', // cyan
] as const;

export function peerColor(peerId: string, index: number): string {
  if (index >= 0) return PEER_COLORS[index % PEER_COLORS.length];
  // Fallback: hash the id when roster order is unavailable.
  let h = 0;
  for (let i = 0; i < peerId.length; i++) h = (h * 31 + peerId.charCodeAt(i)) | 0;
  return PEER_COLORS[Math.abs(h) % PEER_COLORS.length];
}
