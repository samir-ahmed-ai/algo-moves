/** Ephemeral drag-over target for layout slot drop zones (header popover + host body grid). */
export type LayoutDropTarget = { hostId: string; slotIndex: number } | null;

let target: LayoutDropTarget = null;
const listeners = new Set<() => void>();

function normalizeDropTarget(next: LayoutDropTarget): LayoutDropTarget {
  if (!next) return null;
  const hostId = next.hostId.trim();
  if (!hostId || !Number.isInteger(next.slotIndex) || next.slotIndex < 0) return null;
  return { hostId, slotIndex: next.slotIndex };
}

export function getLayoutDropTarget(): LayoutDropTarget {
  return target;
}

export function setLayoutDropTarget(next: LayoutDropTarget): void {
  const normalized = normalizeDropTarget(next);
  if (target?.hostId === normalized?.hostId && target?.slotIndex === normalized?.slotIndex) return;
  target = normalized;
  listeners.forEach((l) => l());
}

export function subscribeLayoutDropTarget(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
