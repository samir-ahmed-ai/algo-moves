import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Position and dismiss handling for a trigger-anchored popover portalled to document.body. */
export function useAnchoredPopover(
  open: boolean,
  onClose: () => void,
  align: 'left' | 'right' = 'right',
  panelWidth = 352,
) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(window.innerWidth * 0.9, panelWidth);
    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({ top: rect.bottom + 6, left });
  }, [align, panelWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const panelStyle = pos
    ? {
        top: pos.top,
        left: pos.left,
        width: Math.min(window.innerWidth * 0.9, panelWidth),
      }
    : undefined;

  return { anchorRef, panelRef, pos, panelStyle } as const;
}
