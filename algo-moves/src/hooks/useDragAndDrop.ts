import { useCallback, type DragEvent } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';

export function useDragAndDrop(
  dndKey: string,
  screenToFlowPosition: ReactFlowInstance['screenToFlowPosition'],
  onDropKind: (kind: string, position: { x: number; y: number }) => void,
) {
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(dndKey);
      if (!kind) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDropKind(kind, position);
    },
    [dndKey, screenToFlowPosition, onDropKind],
  );

  return { onDragOver, onDrop };
}

export const EFFECT_DND_KEY = 'application/algomove-effect';
