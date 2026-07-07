/**
 * Pure document mechanics for canvas collaboration: signatures (to decide when
 * the host republishes), node/edge diffing into {@link EditOp}s, and op
 * appliers. No React, no transport — every function here is a pure data
 * transform so it is trivially testable and reusable on both sides of the wire.
 */
import type { Edge } from '@xyflow/react';
import type { PanelFlowNode, PanelNodeData } from '@/core/panelFlowTypes';
import type { CanvasComment, CanvasDoc, EditOp } from './collabProtocol';

/**
 * The `data` fields that are collaborative (shared across peers). Everything
 * else on a node's data — notably `runState` and any panel-interior state — is
 * per-user and preserved locally when a remote update lands.
 */
const COLLAB_DATA_FIELDS = [
  'title',
  'collapsed',
  'accent',
  'locked',
  'style',
  'layoutSlots',
  'slotIndex',
  'layoutHost',
] as const;

type CollabData = Partial<Pick<PanelNodeData, (typeof COLLAB_DATA_FIELDS)[number]>>;

function pickCollabData(data: PanelNodeData): CollabData {
  const out: Record<string, unknown> = {};
  for (const k of COLLAB_DATA_FIELDS) {
    if (k in data) out[k] = (data as Record<string, unknown>)[k];
  }
  return out as CollabData;
}

const round = (n: number) => Math.round(n);

/**
 * A structural fingerprint of the document. Changes when a peer-visible aspect
 * changes (position, size, appearance, graph shape, comments) but NOT on
 * selection or an in-progress drag — so the host publishes once a drag settles,
 * not every animation frame.
 */
export function docSignature(
  nodes: PanelFlowNode[],
  edges: Edge[],
  comments: CanvasComment[],
): string {
  const n = nodes
    .map((node) => {
      const pos = node.dragging ? 'drag' : `${round(node.position.x)},${round(node.position.y)}`;
      const d = node.data;
      return `${node.id}:${node.parentId ?? ''}:${pos}:${round(node.width ?? 0)}:${round(node.height ?? 0)}:${d.collapsed ? 1 : 0}:${d.accent ?? ''}:${d.locked ? 1 : 0}:${JSON.stringify(d.style ?? '')}:${d.title ?? ''}:${JSON.stringify(d.layoutSlots ?? '')}:${d.slotIndex ?? ''}:${d.layoutHost ? 1 : 0}`;
    })
    .join('|');
  const e = edges
    .map(
      (edge) =>
        `${edge.id}>${edge.source}-${edge.target}:${(edge.data as { label?: string })?.label ?? ''}`,
    )
    .join('|');
  const c = comments
    .map(
      (cm) => `${cm.id}:${cm.resolved ? 1 : 0}:${cm.replies.length}:${round(cm.x)},${round(cm.y)}`,
    )
    .join('|');
  return `${n}#${e}#${c}`;
}

// ---- Local edits → ops ------------------------------------------------------

/**
 * Diff two node arrays into node-granular edit ops. Position moves are only
 * emitted for settled (non-dragging) nodes — live drags travel as ephemeral
 * presence, and the caller keeps `prev` at the pre-drag snapshot so the settle
 * produces exactly one move.
 */
export function diffNodes(prev: PanelFlowNode[], next: PanelFlowNode[]): EditOp[] {
  const ops: EditOp[] = [];
  const prevById = new Map(prev.map((n) => [n.id, n]));
  const nextIds = new Set(next.map((n) => n.id));

  for (const node of next) {
    const before = prevById.get(node.id);
    if (!before) {
      ops.push({ __canvas: 'node-add', node });
      continue;
    }
    if (node.dragging) continue; // settle handled once dragging clears
    const movedX = round(node.position.x) !== round(before.position.x);
    const movedY = round(node.position.y) !== round(before.position.y);
    const resized = round(node.width ?? 0) !== round(before.width ?? 0);
    const resizedH = round(node.height ?? 0) !== round(before.height ?? 0);
    const reparented = (node.parentId ?? '') !== (before.parentId ?? '');
    if (movedX || movedY || resized || resizedH || reparented) {
      ops.push({
        __canvas: 'node-move',
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.width,
        height: node.height,
        parentId: node.parentId,
      });
    }
    const beforeData = JSON.stringify(pickCollabData(before.data));
    const afterData = JSON.stringify(pickCollabData(node.data));
    if (beforeData !== afterData) {
      ops.push({ __canvas: 'node-patch', id: node.id, data: pickCollabData(node.data) });
    }
  }
  for (const node of prev) {
    if (!nextIds.has(node.id)) ops.push({ __canvas: 'node-remove', id: node.id });
  }
  return ops;
}

export function diffEdges(prev: Edge[], next: Edge[]): EditOp[] {
  const ops: EditOp[] = [];
  const prevIds = new Set(prev.map((e) => e.id));
  const nextIds = new Set(next.map((e) => e.id));
  for (const edge of next) {
    if (!prevIds.has(edge.id)) ops.push({ __canvas: 'edge-add', edge });
  }
  for (const edge of prev) {
    if (!nextIds.has(edge.id)) ops.push({ __canvas: 'edge-remove', id: edge.id });
  }
  return ops;
}

// ---- Ops → state (host folds a peer's op into its canonical document) -------

/** Apply an edit op's node effect, preserving local interior data (`runState`). */
export function applyEditToNodes(op: EditOp, nodes: PanelFlowNode[]): PanelFlowNode[] {
  switch (op.__canvas) {
    case 'node-add':
      if (nodes.some((n) => n.id === op.node.id)) return nodes;
      return [...nodes, op.node];
    case 'node-remove':
      return nodes.filter((n) => n.id !== op.id);
    case 'node-move':
      return nodes.map((n) =>
        n.id === op.id
          ? {
              ...n,
              position: { x: op.x, y: op.y },
              ...(op.width != null ? { width: op.width } : {}),
              ...(op.height != null ? { height: op.height } : {}),
              ...(op.parentId !== undefined
                ? {
                    parentId: op.parentId,
                    extent: op.parentId ? ('parent' as const) : undefined,
                  }
                : {}),
            }
          : n,
      );
    case 'node-patch':
      return nodes.map((n) => (n.id === op.id ? { ...n, data: { ...n.data, ...op.data } } : n));
    default:
      return nodes;
  }
}

export function applyEditToEdges(op: EditOp, edges: Edge[]): Edge[] {
  switch (op.__canvas) {
    case 'node-add':
      return op.edges?.length ? mergeEdges(edges, op.edges) : edges;
    case 'node-remove':
      return edges.filter((e) => e.source !== op.id && e.target !== op.id);
    case 'edge-add':
      return edges.some((e) => e.id === op.edge.id) ? edges : [...edges, op.edge];
    case 'edge-remove':
      return edges.filter((e) => e.id !== op.id);
    default:
      return edges;
  }
}

export function applyEditToComments(op: EditOp, comments: CanvasComment[]): CanvasComment[] {
  switch (op.__canvas) {
    case 'comment-add':
      return comments.some((c) => c.id === op.comment.id) ? comments : [...comments, op.comment];
    case 'comment-reply':
      return comments.map((c) =>
        c.id === op.id && !c.replies.some((r) => r.id === op.reply.id)
          ? { ...c, replies: [...c.replies, op.reply] }
          : c,
      );
    case 'comment-resolve':
      return comments.map((c) => (c.id === op.id ? { ...c, resolved: op.resolved } : c));
    case 'comment-remove':
      return comments.filter((c) => c.id !== op.id);
    default:
      return comments;
  }
}

function mergeEdges(base: Edge[], add: Edge[]): Edge[] {
  const have = new Set(base.map((e) => e.id));
  return [...base, ...add.filter((e) => !have.has(e.id))];
}

// ---- Remote host snapshot → local state (non-host reconcile) ----------------

/**
 * Reconcile the local node array to the host's authoritative snapshot while
 * (a) preserving each node's local interior state and (b) never yanking a node
 * the local user is actively dragging.
 */
export function mergeRemoteNodes(local: PanelFlowNode[], remote: PanelFlowNode[]): PanelFlowNode[] {
  const localById = new Map(local.map((n) => [n.id, n]));
  return remote.map((r) => {
    const l = localById.get(r.id);
    if (!l) return r;
    if (l.dragging) return l; // owner keeps control until drag-end
    return {
      ...r,
      selected: l.selected,
      data: { ...r.data, ...preserveLocalData(l.data) },
    };
  });
}

/** Interior fields that stay local when a remote snapshot is merged in. */
function preserveLocalData(data: PanelNodeData): Partial<PanelNodeData> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(data)) {
    if (!(COLLAB_DATA_FIELDS as readonly string[]).includes(k))
      out[k] = (data as Record<string, unknown>)[k];
  }
  return out as Partial<PanelNodeData>;
}

/** Runtime guard for an inbound `state` payload. */
export function isCanvasDoc(value: unknown): value is CanvasDoc {
  const d = value as Partial<CanvasDoc> | null;
  return (
    !!d &&
    d.v === 1 &&
    Array.isArray(d.nodes) &&
    Array.isArray(d.edges) &&
    Array.isArray(d.comments)
  );
}
