import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

/** Reorder a string-id list after a dnd-kit drag end event. */
export function reorderIds(order: string[], event: DragEndEvent): string[] {
  const { active, over } = event;
  if (!over || active.id === over.id) return order;
  const oldIndex = order.indexOf(String(active.id));
  const newIndex = order.indexOf(String(over.id));
  if (oldIndex < 0 || newIndex < 0) return order;
  return arrayMove(order, oldIndex, newIndex);
}
