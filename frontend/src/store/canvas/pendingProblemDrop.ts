/** Deferred browse→canvas drop: pointer position applied once the problem canvas mounts. */
export type PendingProblemDrop = {
  itemId: string;
  position: { x: number; y: number };
};

let pending: PendingProblemDrop | null = null;

export function setPendingProblemDrop(itemId: string, position: { x: number; y: number }): void {
  pending = { itemId, position: { x: position.x, y: position.y } };
}

export function peekPendingProblemDrop(itemId: string): PendingProblemDrop | null {
  if (!pending || pending.itemId !== itemId) return null;
  return pending;
}

/** Returns the saved pointer and clears the pending entry when the item id matches. */
export function consumePendingProblemDrop(itemId: string): { x: number; y: number } | null {
  const hit = peekPendingProblemDrop(itemId);
  if (!hit) return null;
  pending = null;
  return hit.position;
}

export function clearPendingProblemDrop(): void {
  pending = null;
}
