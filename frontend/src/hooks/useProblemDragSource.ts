import { useCallback, type DragEvent } from 'react';

import { PROBLEM_DND_KEY, encodeProblemDrag } from '@/shell/canvas';

/** Drag source props for catalog problem cards → canvas drop. */
export function useProblemDragSource(itemId: string) {
  const onDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData(PROBLEM_DND_KEY, encodeProblemDrag(itemId));
      e.dataTransfer.effectAllowed = 'copy';
      const el = e.currentTarget;
      if (el instanceof HTMLElement) {
        e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 24);
      }
    },
    [itemId],
  );

  return {
    draggable: true,
    onDragStart,
  } as const;
}
