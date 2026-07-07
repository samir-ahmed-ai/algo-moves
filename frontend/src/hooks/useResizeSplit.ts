import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { clampSplitPct } from '@/lib/editor/resizeSplit';

export type ResizeDirection = 'horizontal' | 'vertical';

export interface UseResizeSplitOptions {
  direction: ResizeDirection;
  splitPct: number;
  onSplitPctChange?: (pct: number) => void;
  minPct?: number;
  maxPct?: number;
  defaultPct?: number;
}

export function useResizeSplit({
  direction,
  splitPct: splitPctProp,
  onSplitPctChange,
  minPct = 20,
  maxPct = 80,
  defaultPct = 50,
}: UseResizeSplitOptions) {
  const [splitPct, setSplitPct] = useState(() =>
    clampSplitPct(splitPctProp, minPct, maxPct, defaultPct),
  );
  const splitRef = useRef(splitPct);
  splitRef.current = splitPct;
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging.current) setSplitPct(clampSplitPct(splitPctProp, minPct, maxPct, defaultPct));
  }, [splitPctProp, minPct, maxPct, defaultPct]);

  const updateSplit = useCallback(
    (pct: number, persist = false) => {
      const clamped = clampSplitPct(pct, minPct, maxPct, defaultPct);
      splitRef.current = clamped;
      setSplitPct(clamped);
      if (persist) onSplitPctChange?.(clamped);
    },
    [minPct, maxPct, defaultPct, onSplitPctChange],
  );

  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct =
        direction === 'horizontal'
          ? ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100
          : ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      updateSplit(pct, false);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        onSplitPctChange?.(splitRef.current);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [direction, updateSplit, onSplitPctChange]);

  const startDrag = useCallback((event: ReactPointerEvent) => {
    event.preventDefault();
    dragging.current = true;
  }, []);

  const resetSplit = useCallback(() => {
    updateSplit(defaultPct, true);
  }, [defaultPct, updateSplit]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      const step = event.shiftKey ? 10 : 2;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        updateSplit(splitRef.current - step, true);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        updateSplit(splitRef.current + step, true);
      } else if (event.key === 'Home') {
        event.preventDefault();
        updateSplit(minPct, true);
      } else if (event.key === 'End') {
        event.preventDefault();
        updateSplit(maxPct, true);
      }
    },
    [maxPct, minPct, updateSplit],
  );

  const handleProps = {
    role: 'separator' as const,
    'aria-orientation': (direction === 'horizontal' ? 'vertical' : 'horizontal') as
      'vertical' | 'horizontal',
    'aria-valuenow': Math.round(splitPct),
    'aria-valuemin': minPct,
    'aria-valuemax': maxPct,
    tabIndex: 0,
    title: 'Drag to resize · double-click to reset',
    onPointerDown: startDrag,
    onKeyDown,
    onDoubleClick: resetSplit,
  };

  return { containerRef, splitPct, handleProps };
}
