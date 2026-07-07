/** Deferred browse→canvas drop: pointer position applied once the problem canvas mounts. */
export type PendingProblemDrop = {
  itemId: string;
  position: { x: number; y: number };
};

let pending: PendingProblemDrop | null = null;

function normalizeItemId(itemId: string): string | null {
  const id = itemId.trim();
  return id ? id : null;
}

function normalizePosition(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Number.isFinite(position.x) ? position.x : 0,
    y: Number.isFinite(position.y) ? position.y : 0,
  };
}

export function setPendingProblemDrop(itemId: string, position: { x: number; y: number }): void {
  const id = normalizeItemId(itemId);
  pending = id ? { itemId: id, position: normalizePosition(position) } : null;
}

export function peekPendingProblemDrop(itemId: string): PendingProblemDrop | null {
  const id = normalizeItemId(itemId);
  if (!id || !pending || pending.itemId !== id) return null;
  return { itemId: pending.itemId, position: { ...pending.position } };
}

/** Returns the saved pointer and clears the pending entry when the item id matches. */
export function consumePendingProblemDrop(itemId: string): { x: number; y: number } | null {
  const hit = peekPendingProblemDrop(itemId);
  if (!hit) return null;
  pending = null;
  return { ...hit.position };
}

export function clearPendingProblemDrop(): void {
  pending = null;
}
