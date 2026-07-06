/** Ephemeral drag-over target for layout slot drop zones (header popover + host body grid). */
export type LayoutDropTarget = { hostId: string; slotIndex: number } | null;

let target: LayoutDropTarget = null;
const listeners = new Set<() => void>();

export function getLayoutDropTarget(): LayoutDropTarget {
  return target;
}

export function setLayoutDropTarget(next: LayoutDropTarget): void {
  if (target?.hostId === next?.hostId && target?.slotIndex === next?.slotIndex) return;
  target = next;
  listeners.forEach((l) => l());
}

export function subscribeLayoutDropTarget(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
