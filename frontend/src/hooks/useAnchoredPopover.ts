import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

type PopoverAlign = 'left' | 'right';
type PopoverPosition = { top: number; left: number; width: number };

function safePanelWidth(width: number): number {
  return Number.isFinite(width) ? Math.max(180, width) : 352;
}

/** Position and dismiss handling for a trigger-anchored popover portalled to document.body. */
export function useAnchoredPopover(
  open: boolean,
  onClose: () => void,
  align: PopoverAlign = 'right',
  panelWidth = 352,
) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PopoverPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(window.innerWidth * 0.9, safePanelWidth(panelWidth));
    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 16));
    setPos({ top, left, width });
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
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const panelStyle: CSSProperties | undefined = pos
    ? {
        top: pos.top,
        left: pos.left,
        width: pos.width,
      }
    : undefined;

  return { anchorRef, panelRef, pos, panelStyle } as const;
}
