import { useCallback, type DragEvent } from 'react';
import { PROBLEM_DND_KEY, encodeProblemDrag } from '@/shell/canvas/problemDnD';

/** Drag source props for catalog problem cards → canvas drop (scaffold). */
export function useProblemDragSource(itemId: string) {
  const onDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData(PROBLEM_DND_KEY, encodeProblemDrag(itemId));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [itemId],
  );

  return {
    draggable: true,
    onDragStart,
  } as const;
}
