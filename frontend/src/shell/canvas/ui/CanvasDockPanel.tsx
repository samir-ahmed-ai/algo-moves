import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  ChevronDown,
  Sparkles,
  StickyNote,
  PencilLine,
  Users,
  Bookmark,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace, type CanvasSnapRegion } from '@/store/workspace';
import { chromeText } from '../../chromeUi';
import { RADIUS_SHELL } from './nodeui';

const DOCK_BTN = 'grid h-6 w-6 place-items-center rounded-sm text-ink3 transition-colors hover:bg-panel2 hover:text-ink disabled:opacity-30';

const QUICK_ADD = [
  { id: 'notes', title: 'Add notes', icon: StickyNote },
  { id: 'whiteboard', title: 'Add whiteboard', icon: PencilLine },
  { id: 'collab-code', title: 'Add collab code', icon: Users },
] as const;

type SnapDef = {
  region: CanvasSnapRegion;
  title: string;
  icon: { x: number; y: number; w: number; h: number };
};

function SnapIcon({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
      <rect x="0.5" y="0.5" width="11" height="11" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.45" />
      <rect x={x} y={y} width={w} height={h} rx="0.25" fill="currentColor" />
    </svg>
  );
}

const SNAP_ACTIONS: SnapDef[] = [
  { region: 'left', title: 'Left half', icon: { x: 0.5, y: 0.5, w: 5.5, h: 11 } },
  { region: 'top', title: 'Top half', icon: { x: 0.5, y: 0.5, w: 11, h: 5.5 } },
  { region: 'right', title: 'Right half', icon: { x: 6, y: 0.5, w: 5.5, h: 11 } },
  { region: 'top-left', title: 'Top left', icon: { x: 0.5, y: 0.5, w: 5.5, h: 5.5 } },
  { region: 'maximize', title: 'Maximize', icon: { x: 0.5, y: 0.5, w: 11, h: 11 } },
  { region: 'top-right', title: 'Top right', icon: { x: 6, y: 0.5, w: 5.5, h: 5.5 } },
  { region: 'bottom-left', title: 'Bottom left', icon: { x: 0.5, y: 6, w: 5.5, h: 5.5 } },
  { region: 'center', title: 'Center', icon: { x: 2.5, y: 2.5, w: 7, h: 7 } },
  { region: 'bottom-right', title: 'Bottom right', icon: { x: 6, y: 6, w: 5.5, h: 5.5 } },
  { region: 'bottom', title: 'Bottom half', icon: { x: 0.5, y: 6, w: 11, h: 5.5 } },
];

function usePopoverDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onClose, ref]);
}

/** Compact top-left dock: quick-add panels + viewport snap for the selected node. */
export function CanvasDockPanel() {
  const { canvasAdd, canvasHud, present, mode } = useWorkspace();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss(moreRef, moreOpen, () => setMoreOpen(false));

  if (present || mode !== 'visualize' || !canvasHud || !canvasAdd) return null;

  const { onCanvasSnap, canCanvasSnap } = canvasHud;
  const overflowKinds = canvasAdd.addableKinds.filter(
    (k) => !QUICK_ADD.some((q) => q.id === k.id),
  );
  const hasOverflow = overflowKinds.length > 0 || (canvasAdd.addableEffects?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        'nodrag absolute left-3 top-3 z-10 w-[88px] border border-edge bg-panel/95 p-1 shadow-[var(--shadow-lg)] backdrop-blur',
        RADIUS_SHELL,
      )}
    >
      <div className="grid grid-cols-3 gap-0.5">
        {QUICK_ADD.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={title}
            aria-label={title}
            onClick={() => canvasAdd.onAddKind(id)}
            className={DOCK_BTN}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}

        {SNAP_ACTIONS.map(({ region, title, icon }) => (
          <button
            key={region}
            type="button"
            title={title}
            aria-label={title}
            disabled={!canCanvasSnap}
            onClick={() => onCanvasSnap(region)}
            className={DOCK_BTN}
          >
            <SnapIcon {...icon} />
          </button>
        ))}

        {hasOverflow && (
          <div ref={moreRef} className="relative col-span-3">
            <button
              type="button"
              title="More panels"
              aria-label="More panels"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(DOCK_BTN, 'h-5 w-full', moreOpen && 'bg-accentbg text-accent')}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
            {moreOpen && (
              <div
                className={cn(
                  'absolute left-0 top-full z-20 mt-1 max-h-[min(280px,40vh)] w-44 overflow-y-auto border border-edge bg-panel p-1 shadow-[var(--shadow-lg)]',
                  RADIUS_SHELL,
                )}
              >
                {overflowKinds.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => {
                      canvasAdd.onAddKind(k.id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-ink2 transition-colors hover:bg-panel2 hover:text-ink',
                      chromeText.sm,
                    )}
                  >
                    {k.id === 'bookmarks' && <Bookmark className="h-3.5 w-3.5 shrink-0" />}
                    {k.id === 'projects' && <FolderOpen className="h-3.5 w-3.5 shrink-0" />}
                    {k.title}
                  </button>
                ))}
                {canvasAdd.addableEffects?.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      canvasAdd.onAddEffect?.(e.id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-ink2 transition-colors hover:bg-panel2 hover:text-ink',
                      chromeText.sm,
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                    {e.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
