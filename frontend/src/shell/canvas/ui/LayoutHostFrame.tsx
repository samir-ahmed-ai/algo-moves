import { useSyncExternalStore } from 'react';
import { useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import { assignNodeToSlot, LAYOUT_SLOT_COUNT } from '@/shell/canvas/layout/layoutSlots';
import {
  getLayoutDropTarget,
  subscribeLayoutDropTarget,
} from '@/shell/canvas/layout/layoutDropState';
import type { PanelFlowNode } from '@/core/panelFlowTypes';
import { nodeIcon } from '@/shell/panels';
import { nodeText } from './nodeui';

/** In-body 3×3 slot grid — primary drop target for nesting panels inside a host. */
export function LayoutHostFrame({ hostId, slots }: { hostId: string; slots?: (string | null)[] }) {
  const { getNode, getNodes, setNodes } = useReactFlow();
  const dropTarget = useSyncExternalStore(subscribeLayoutDropTarget, getLayoutDropTarget);
  const occupied = slots ?? Array(LAYOUT_SLOT_COUNT).fill(null);

  const selectedPeerId = getNodes().find((n) => n.selected && n.id !== hostId)?.id;

  const assign = (slotIndex: number) => {
    if (!selectedPeerId) return;
    setNodes((nds) => assignNodeToSlot(nds as PanelFlowNode[], hostId, slotIndex, selectedPeerId));
  };

  return (
    <div className="nodrag nowheel flex min-h-0 flex-1 flex-col p-2" data-layout-host={hostId}>
      <p className={cn('mb-2 text-center text-ink3', nodeText.xs)}>
        {selectedPeerId
          ? 'Click a slot or drag a panel here'
          : 'Select another panel, then click or drag it into a slot'}
      </p>
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-1.5">
        {Array.from({ length: LAYOUT_SLOT_COUNT }, (_, slotIndex) => {
          const childId = occupied[slotIndex];
          const child = childId ? getNode(childId) : null;
          const kind = (child?.data as { kind?: string } | undefined)?.kind ?? childId ?? '';
          const title = (child?.data as { title?: string } | undefined)?.title;
          const filled = !!childId;
          const isDrop = dropTarget?.hostId === hostId && dropTarget.slotIndex === slotIndex;
          return (
            <button
              key={slotIndex}
              type="button"
              data-layout-slot={slotIndex}
              data-layout-host={hostId}
              title={filled ? (title ?? childId) : `Slot ${slotIndex + 1}`}
              disabled={!filled && !selectedPeerId}
              onClick={() => {
                if (filled && childId) {
                  setNodes(
                    (nds) =>
                      nds.map((n) => ({ ...n, selected: n.id === childId })) as PanelFlowNode[],
                  );
                  return;
                }
                assign(slotIndex);
              }}
              className={cn(
                'flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-md border border-dashed transition-colors',
                filled
                  ? 'border-accent/50 bg-accentbg/20 text-accent hover:bg-accentbg/35'
                  : 'border-edge/80 bg-panel2/40 text-ink3 hover:border-accent/40 hover:bg-panel2/70',
                isDrop && 'border-accent bg-accentbg/50 ring-2 ring-accent/30',
                !filled && !selectedPeerId && 'cursor-default opacity-60',
              )}
            >
              {filled ? (
                <>
                  <span className="grid h-4 w-4 place-items-center [&>*]:h-3.5 [&>*]:w-3.5">
                    {nodeIcon(kind)}
                  </span>
                  <span className={cn('max-w-full truncate px-1', nodeText.xs)}>
                    {title ?? kind}
                  </span>
                </>
              ) : (
                <span className={cn('text-ink3/70', nodeText.xs)}>{slotIndex + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
