/**
 * Pure merge helpers for sub-document collaboration snapshots and patches.
 */
import type {
  EditorPayload,
  SubDocSnapshot,
  SubDocWhiteboardPatchOp,
  WhiteboardElement,
  WhiteboardPayload,
} from './subdocProtocol';

function elementKey(el: WhiteboardElement): string {
  return `${el.id}:${el.version ?? 0}:${el.versionNonce ?? 0}`;
}

/** Upsert elements by id; honor tombstones via isDeleted. */
export function mergeWhiteboardElements(
  base: WhiteboardElement[],
  incoming: WhiteboardElement[],
  removedIds: string[] = [],
): WhiteboardElement[] {
  const byId = new Map(base.filter((e) => !e.isDeleted).map((e) => [e.id, e]));
  for (const id of removedIds) {
    const prev = byId.get(id);
    if (prev) byId.set(id, { ...prev, isDeleted: true });
    else byId.set(id, { id, type: 'rectangle', isDeleted: true, x: 0, y: 0, width: 0, height: 0 });
  }
  for (const el of incoming) {
    const prev = byId.get(el.id);
    if (!prev) {
      byId.set(el.id, el);
      continue;
    }
    const prevKey = elementKey(prev);
    const nextKey = elementKey(el);
    if (prevKey !== nextKey || el.isDeleted) byId.set(el.id, el);
  }
  return [...byId.values()];
}

export function applyWhiteboardPatch(
  payload: WhiteboardPayload,
  op: SubDocWhiteboardPatchOp,
): WhiteboardPayload {
  return {
    ...payload,
    elements: mergeWhiteboardElements(payload.elements, op.elements, op.removedIds),
  };
}

export function applyEditorPatch(
  payload: EditorPayload,
  text: string,
  language: string,
): EditorPayload {
  return { ...payload, text, language };
}

export function mergeSubDocSnapshot(
  local: SubDocSnapshot | undefined,
  remote: SubDocSnapshot,
): SubDocSnapshot {
  if (!local || remote.rev >= local.rev) return remote;
  return local;
}

export function snapshotFromPayload(
  nodeId: string,
  kind: SubDocSnapshot['kind'],
  rev: number,
  payload: SubDocSnapshot['payload'],
): SubDocSnapshot {
  return { nodeId, kind, rev, payload };
}

/** Diff element lists into upserts and explicit removals. */
export function diffWhiteboardElements(
  prev: WhiteboardElement[],
  next: WhiteboardElement[],
): { elements: WhiteboardElement[]; removedIds: string[] } {
  const prevById = new Map(prev.map((e) => [e.id, e]));
  const nextById = new Map(next.map((e) => [e.id, e]));
  const elements: WhiteboardElement[] = [];
  const removedIds: string[] = [];

  for (const el of next) {
    const before = prevById.get(el.id);
    if (!before || elementKey(before) !== elementKey(el)) elements.push(el);
  }
  for (const el of prev) {
    if (el.isDeleted) continue;
    const after = nextById.get(el.id);
    if (!after || after.isDeleted) removedIds.push(el.id);
  }
  return { elements, removedIds };
}
