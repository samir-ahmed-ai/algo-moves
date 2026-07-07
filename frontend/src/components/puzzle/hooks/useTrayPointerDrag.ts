import { useCallback, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { CodePiece } from '@/lib/code';

const DRAG_THRESHOLD = 8;

function isOverAssembled(
  clientX: number,
  clientY: number,
  assembledEl: HTMLElement | null,
): boolean {
  if (!assembledEl) return false;
  const r = assembledEl.getBoundingClientRect();
  return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
}

/** Mobile tray pointer drag — horizontal pick-up with vertical scroll passthrough. */
export function useTrayPointerDrag({
  variant,
  assembledRef,
  onPlace,
  setDragOver,
}: {
  variant: 'default' | 'mobile';
  assembledRef: RefObject<HTMLDivElement | null>;
  onPlace: (piece: CodePiece, index: number) => void;
  setDragOver: (over: boolean) => void;
}) {
  const [pointerGhost, setPointerGhost] = useState<{
    piece: CodePiece;
    x: number;
    y: number;
    width: number;
  } | null>(null);
  const pointerDragRef = useRef<{
    piece: CodePiece;
    startX: number;
    startY: number;
    active: boolean;
    axis: 'x' | 'y' | null;
    pointerId: number;
    target: HTMLElement;
    captured: boolean;
    width: number;
    index: number;
  } | null>(null);
  const dragMovedRef = useRef(false);

  const clearPointerDrag = useCallback(() => {
    pointerDragRef.current = null;
    setPointerGhost(null);
  }, []);

  const onTrayPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) >= 4) dragMovedRef.current = true;

      if (!drag.active) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          pointerDragRef.current = null;
          return;
        }
        drag.axis = 'x';
        drag.active = true;
        dragMovedRef.current = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.captured = true;
        } catch {
          /* capture is best-effort */
        }
      }

      e.preventDefault();
      e.stopPropagation();
      setPointerGhost({ piece: drag.piece, x: e.clientX, y: e.clientY, width: drag.width });
      setDragOver(isOverAssembled(e.clientX, e.clientY, assembledRef.current));
    },
    [assembledRef, setDragOver],
  );

  const finishTrayPointer = useCallback(
    (e: PointerEvent, piece: CodePiece, index: number) => {
      const drag = pointerDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;

      if (drag.active) {
        if (isOverAssembled(e.clientX, e.clientY, assembledRef.current)) {
          onPlace(piece, index);
        }
      } else if (!dragMovedRef.current) {
        onPlace(piece, index);
      }

      try {
        if (drag.captured) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be released */
      }
      clearPointerDrag();
      setDragOver(false);
    },
    [assembledRef, onPlace, clearPointerDrag, setDragOver],
  );

  const onTrayPointerDown = useCallback(
    (e: PointerEvent, piece: CodePiece, index: number) => {
      if (variant !== 'mobile' || e.button !== 0) return;
      const target = e.currentTarget as HTMLElement;
      pointerDragRef.current = {
        piece,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
        axis: null,
        pointerId: e.pointerId,
        target,
        captured: false,
        width: target.getBoundingClientRect().width,
        index,
      };
      dragMovedRef.current = false;
    },
    [variant],
  );

  return {
    pointerGhost,
    onTrayPointerDown,
    onTrayPointerMove,
    finishTrayPointer,
    isDraggingPiece: (pieceId: string) => pointerGhost?.piece.id === pieceId,
  };
}
