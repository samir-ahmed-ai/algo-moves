import { useCallback, useRef, useState } from 'react';

export interface SwipeBind {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export interface SwipeState {
  /** Live horizontal drag offset in px (0 when idle). */
  dx: number;
  dragging: boolean;
  bind: SwipeBind;
}

/**
 * Horizontal swipe gesture for the card deck. Pointer-based so it works with
 * touch and mouse. The deck surface should set `touch-action: pan-y` so vertical
 * scrolling still works while we own horizontal pans. Gestures that start inside a
 * `[data-noswipe]` subtree (e.g. the drag-to-reorder tray) are ignored.
 */
export function useSwipe({
  onNext,
  onPrev,
  threshold = 60,
  enabled = true,
}: {
  onNext: () => void;
  onPrev: () => void;
  threshold?: number;
  enabled?: boolean;
}): SwipeState {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const axis = useRef<null | 'x' | 'y'>(null);
  const captured = useRef<number | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (start.current !== null) return; // one gesture pointer at a time
      if ((e.target as HTMLElement).closest('[data-noswipe]')) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      axis.current = null;
    },
    [enabled],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!start.current || e.pointerId !== start.current.id) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (axis.current === null) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      axis.current = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
      if (axis.current === 'x') {
        setDragging(true);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(start.current.id);
          captured.current = start.current.id;
        } catch {
          /* capture is best-effort */
        }
      }
    }
    if (axis.current === 'x') {
      // light rubber-band so big drags don't fly off-screen
      const damped = Math.sign(ddx) * Math.min(Math.abs(ddx), 160 + (Math.abs(ddx) - 160) * 0.35);
      setDx(Number.isFinite(damped) ? damped : ddx);
    }
  }, []);

  const finish = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current || e.pointerId !== start.current.id) return;
      if (captured.current !== null) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(captured.current);
        } catch {
          /* may already be released */
        }
        captured.current = null;
      }
      const ddx = e.clientX - start.current.x;
      const wasX = axis.current === 'x';
      start.current = null;
      axis.current = null;
      setDragging(false);
      setDx(0);
      if (!enabled || !wasX) return;
      if (ddx <= -threshold) onNext();
      else if (ddx >= threshold) onPrev();
    },
    [onNext, onPrev, threshold, enabled],
  );

  return {
    dx,
    dragging,
    bind: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish },
  };
}
