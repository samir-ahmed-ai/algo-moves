import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [splitPct, setSplitPct] = useState(() => clampSplitPct(splitPctProp, minPct, maxPct));
  const splitRef = useRef(splitPct);
  splitRef.current = splitPct;
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging.current) setSplitPct(clampSplitPct(splitPctProp, minPct, maxPct));
  }, [splitPctProp, minPct, maxPct]);

  const updateSplit = useCallback(
    (pct: number, persist = false) => {
      const clamped = clampSplitPct(pct, minPct, maxPct);
      splitRef.current = clamped;
      setSplitPct(clamped);
      if (persist) onSplitPctChange?.(clamped);
    },
    [minPct, maxPct, onSplitPctChange],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct =
        direction === 'horizontal'
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100;
      updateSplit(pct, false);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        onSplitPctChange?.(splitRef.current);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [direction, updateSplit, onSplitPctChange]);

  const startDrag = useCallback(() => {
    dragging.current = true;
  }, []);

  const resetSplit = useCallback(() => {
    updateSplit(defaultPct, true);
  }, [defaultPct, updateSplit]);

  const handleProps = {
    role: 'separator' as const,
    'aria-orientation': (direction === 'horizontal' ? 'vertical' : 'horizontal') as 'vertical' | 'horizontal',
    'aria-valuenow': Math.round(splitPct),
    'aria-valuemin': minPct,
    'aria-valuemax': maxPct,
    title: 'Drag to resize · double-click to reset',
    onMouseDown: startDrag,
    onDoubleClick: resetSplit,
  };

  return { containerRef, splitPct, handleProps };
}
