import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import {
  assignNodeToSlot,
  LAYOUT_SLOT_COUNT,
  slotIconRect,
} from '@/shell/canvas/layout/layoutSlots';
import {
  getLayoutDropTarget,
  setLayoutDropTarget,
  subscribeLayoutDropTarget,
} from '@/shell/canvas/layout/layoutDropState';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import {
  PanelHeaderAction,
  RADIUS_SHELL,
  nodeIconGlyph,
  nodeText,
} from './nodeui';

const CELL =
  'grid h-8 w-8 place-items-center rounded-md border border-transparent text-ink3 transition-colors hover:border-edge hover:bg-panel2 hover:text-ink';

function SlotIcon({ slotIndex, filled }: { slotIndex: number; filled: boolean }) {
  const { x, y, w, h } = slotIconRect(slotIndex);
  return (
    <svg viewBox="0 0 12 12" className="h-4 w-4" aria-hidden>
      <rect
        x="0.5"
        y="0.5"
        width="11"
        height="11"
        rx="0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.35"
      />
      <rect x={x} y={y} width={w} height={h} rx="0.25" fill="currentColor" opacity={filled ? 1 : 0.25} />
    </svg>
  );
}

/** Compact 3×3 layout menu — opens host frame and mirrors body drop targets. */
export function PanelHeaderLayoutMenu({
  hostId,
  slots,
}: {
  hostId: string;
  slots?: (string | null)[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { getNode, getNodes, setNodes } = useReactFlow();
  const dropTarget = useSyncExternalStore(subscribeLayoutDropTarget, getLayoutDropTarget);

  const close = useCallback(() => {
    setOpen(false);
    setLayoutDropTarget(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.right - 8 * 3 - 12 });
  }, [open]);

  const activateHost = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === hostId ? { ...n, data: { ...n.data, layoutHost: true } } : n,
      ) as PanelFlowNode[],
    );
  }, [hostId, setNodes]);

  const toggle = () => {
    setOpen((was) => {
      const next = !was;
      if (next) activateHost();
      else setLayoutDropTarget(null);
      return next;
    });
  };

  const occupied = slots ?? Array(LAYOUT_SLOT_COUNT).fill(null);
  const hasSlots = occupied.some(Boolean);
  const selectedPeerId = getNodes().find((n) => n.selected && n.id !== hostId)?.id;

  const pickSlot = (slotIndex: number) => {
    const childId = occupied[slotIndex];
    if (childId) {
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === childId })) as PanelFlowNode[]);
      close();
      return;
    }
    if (!selectedPeerId) return;
    setNodes((nds) => assignNodeToSlot(nds as PanelFlowNode[], hostId, slotIndex, selectedPeerId));
    close();
  };

  const popover =
    open && pos ? (
      <div
        ref={popoverRef}
        className={cn(
          'fixed z-[200] w-[7.75rem] border border-edge bg-panel p-2 shadow-[var(--shadow-xl)] backdrop-blur-sm',
          RADIUS_SHELL,
        )}
        style={{ top: pos.top, left: Math.max(8, pos.left) }}
        data-layout-host={hostId}
      >
        <p className={cn('mb-1.5 text-center leading-tight text-ink3', nodeText.xs)}>
          {selectedPeerId ? 'Click slot' : 'Select panel'}
        </p>
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: LAYOUT_SLOT_COUNT }, (_, slotIndex) => {
            const childId = occupied[slotIndex];
            const child = childId ? getNode(childId) : null;
            const title = (child?.data as { title?: string } | undefined)?.title;
            const filled = !!childId;
            const isDrop =
              dropTarget?.hostId === hostId && dropTarget.slotIndex === slotIndex;
            return (
              <button
                key={slotIndex}
                type="button"
                data-layout-slot={slotIndex}
                data-layout-host={hostId}
                title={filled ? title ?? childId : `Slot ${slotIndex + 1}`}
                onClick={() => pickSlot(slotIndex)}
                className={cn(
                  CELL,
                  filled && 'border-accent/40 bg-accentbg/25 text-accent',
                  isDrop && 'border-accent bg-accentbg/50 ring-1 ring-accent/40',
                  !filled && !selectedPeerId && 'opacity-50',
                )}
              >
                <SlotIcon slotIndex={slotIndex} filled={filled} />
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div ref={anchorRef} className="relative">
      <PanelHeaderAction
          variant="toggle"
          active={open || hasSlots || !!slots}
          title="Layout slots"
          onClick={toggle}
        >
          <LayoutGrid className={nodeIconGlyph} />
      </PanelHeaderAction>
      {typeof document !== 'undefined' && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
