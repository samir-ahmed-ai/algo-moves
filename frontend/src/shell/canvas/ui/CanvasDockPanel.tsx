import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace, type CanvasSnapRegion } from '@/store/workspace';
import { chromeText } from '../../chromeUi';
import { usePopoverDismiss } from '../../ui/usePopoverDismiss';
import { RADIUS_SHELL } from './nodeui';

const CELL = 'grid h-7 w-7 place-items-center rounded-sm text-ink3 transition-colors hover:bg-panel2 hover:text-ink disabled:opacity-30';

type IconRect = { x: number; y: number; w: number; h: number };

function SnapIcon({ x, y, w, h }: IconRect) {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
      <rect x="0.5" y="0.5" width="11" height="11" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.45" />
      <rect x={x} y={y} width={w} height={h} rx="0.25" fill="currentColor" />
    </svg>
  );
}

type SnapCell =
  | { kind: 'snap'; region: CanvasSnapRegion; title: string; icon: IconRect }
  | {
      kind: 'menu';
      menuId: string;
      title: string;
      icon: IconRect;
      items: { region: CanvasSnapRegion; label: string; icon: IconRect }[];
    };

/** Rectangle-style 3×3 snap pad: corners + maximize center + half/third menus on sides. */
const SNAP_PAD: SnapCell[][] = [
  [
    { kind: 'snap', region: 'top-left', title: 'Top left', icon: { x: 0.5, y: 0.5, w: 5.5, h: 5.5 } },
    { kind: 'snap', region: 'maximize', title: 'Maximize', icon: { x: 0.5, y: 0.5, w: 11, h: 11 } },
    { kind: 'snap', region: 'top-right', title: 'Top right', icon: { x: 6, y: 0.5, w: 5.5, h: 5.5 } },
  ],
  [
    {
      kind: 'menu',
      menuId: 'left',
      title: 'Left half, top/bottom…',
      icon: { x: 0.5, y: 0.5, w: 5.5, h: 11 },
      items: [
        { region: 'left', label: 'Left half', icon: { x: 0.5, y: 0.5, w: 5.5, h: 11 } },
        { region: 'top-left', label: 'Top left', icon: { x: 0.5, y: 0.5, w: 5.5, h: 5.5 } },
        { region: 'bottom-left', label: 'Bottom left', icon: { x: 0.5, y: 6, w: 5.5, h: 5.5 } },
      ],
    },
    { kind: 'snap', region: 'top', title: 'Top half', icon: { x: 0.5, y: 0.5, w: 11, h: 5.5 } },
    {
      kind: 'menu',
      menuId: 'right',
      title: 'Right half, top/bottom…',
      icon: { x: 6, y: 0.5, w: 5.5, h: 11 },
      items: [
        { region: 'right', label: 'Right half', icon: { x: 6, y: 0.5, w: 5.5, h: 11 } },
        { region: 'top-right', label: 'Top right', icon: { x: 6, y: 0.5, w: 5.5, h: 5.5 } },
        { region: 'bottom-right', label: 'Bottom right', icon: { x: 6, y: 6, w: 5.5, h: 5.5 } },
      ],
    },
  ],
  [
    { kind: 'snap', region: 'bottom-left', title: 'Bottom left', icon: { x: 0.5, y: 6, w: 5.5, h: 5.5 } },
    {
      kind: 'menu',
      menuId: 'thirds',
      title: 'Thirds, bottom half…',
      icon: { x: 4, y: 0.5, w: 4, h: 11 },
      items: [
        { region: 'first-third', label: 'First third', icon: { x: 0.5, y: 0.5, w: 3.5, h: 11 } },
        { region: 'center-third', label: 'Center third', icon: { x: 4, y: 0.5, w: 4, h: 11 } },
        { region: 'last-third', label: 'Last third', icon: { x: 8, y: 0.5, w: 3.5, h: 11 } },
        { region: 'bottom', label: 'Bottom half', icon: { x: 0.5, y: 6, w: 11, h: 5.5 } },
        { region: 'center', label: 'Center', icon: { x: 2.5, y: 2.5, w: 7, h: 7 } },
      ],
    },
    { kind: 'snap', region: 'bottom-right', title: 'Bottom right', icon: { x: 6, y: 6, w: 5.5, h: 5.5 } },
  ],
];

function SnapMenuCell({
  cell,
  disabled,
  open,
  onToggle,
  onClose,
  onPick,
}: {
  cell: Extract<SnapCell, { kind: 'menu' }>;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPick: (region: CanvasSnapRegion) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePopoverDismiss(ref, open, onClose);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={cell.title}
        aria-label={cell.title}
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggle}
        className={cn(CELL, 'relative', open && 'bg-accentbg text-accent')}
      >
        <SnapIcon {...cell.icon} />
        <ChevronDown className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 opacity-60" />
      </button>
      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-30 mt-0.5 min-w-[140px] border border-edge bg-panel p-0.5 shadow-[var(--shadow-lg)]',
            RADIUS_SHELL,
          )}
        >
          {cell.items.map((item) => (
            <button
              key={item.region}
              type="button"
              onClick={() => onPick(item.region)}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-ink2 transition-colors hover:bg-panel2 hover:text-ink',
                chromeText.sm,
              )}
            >
              <SnapIcon {...item.icon} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Top-left dock: Rectangle-style 3×3 snap pad. */
export function CanvasDockPanel() {
  const { canvasHud, present, mode } = useWorkspace();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (present || mode !== 'visualize' || !canvasHud) return null;

  const { onCanvasSnap, canCanvasSnap } = canvasHud;

  const snap = (region: CanvasSnapRegion) => {
    onCanvasSnap(region);
    setOpenMenu(null);
  };

  return (
    <div
      className={cn(
        'nodrag absolute left-3 top-3 z-10 border border-edge bg-panel/95 p-1.5 shadow-[var(--shadow-lg)] backdrop-blur',
        RADIUS_SHELL,
      )}
    >
      <div
        className="grid grid-cols-3 gap-0.5 rounded-md bg-panel2/50 p-0.5"
        title={canCanvasSnap ? 'Snap selected panel to region' : 'Select one panel to snap'}
      >
        {SNAP_PAD.flat().map((cell) =>
          cell.kind === 'snap' ? (
            <button
              key={cell.region}
              type="button"
              title={cell.title}
              aria-label={cell.title}
              disabled={!canCanvasSnap}
              onClick={() => snap(cell.region)}
              className={CELL}
            >
              <SnapIcon {...cell.icon} />
            </button>
          ) : (
            <SnapMenuCell
              key={cell.menuId}
              cell={cell}
              disabled={!canCanvasSnap}
              open={openMenu === cell.menuId}
              onToggle={() => setOpenMenu((id) => (id === cell.menuId ? null : cell.menuId))}
              onClose={() => setOpenMenu(null)}
              onPick={snap}
            />
          ),
        )}
      </div>
    </div>
  );
}
