import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Undo2,
  Redo2,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { CHROME_BTN } from '../../chrome';
import type { AlignKind } from '../layout/align';
import type { CanvasToolsProps } from '@/store/workspace';

export type { CanvasToolsProps };

const HUD_BTN =
  'grid place-items-center rounded-[calc(var(--radius)-2px)] transition-colors disabled:opacity-30';

export function HudBtn({
  onClick,
  title,
  active,
  disabled,
  tone,
  nodrag,
  variant = 'soft',
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  tone?: 'play';
  nodrag?: boolean;
  /** `soft` = accent bg tint (sidebar tools); `solid` = filled accent (transport / canvas HUD). */
  variant?: 'soft' | 'solid';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        HUD_BTN,
        CHROME_BTN,
        '[&_svg]:size-2.5',
        nodrag && 'nodrag',
        tone === 'play' && active && 'bg-good text-white',
        tone === 'play' && !active && 'text-ink2 hover:bg-panel2 hover:text-ink',
        !tone && variant === 'solid' && active && 'bg-accent text-white',
        !tone && variant === 'solid' && !active && 'text-ink2 hover:bg-panel2 hover:text-ink',
        !tone && variant === 'soft' && active && 'bg-accentbg text-accent',
        !tone && variant === 'soft' && !active && 'text-ink2 enabled:hover:bg-panel2 enabled:hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

const ALIGN_BTNS: { kind: AlignKind; title: string; icon: ReactNode }[] = [
  { kind: 'left', title: 'Align left', icon: <AlignStartVertical /> },
  { kind: 'hcenter', title: 'Align horizontal centers', icon: <AlignCenterVertical /> },
  { kind: 'right', title: 'Align right', icon: <AlignEndVertical /> },
  { kind: 'top', title: 'Align top', icon: <AlignStartHorizontal /> },
  { kind: 'vmiddle', title: 'Align vertical centers', icon: <AlignCenterHorizontal /> },
  { kind: 'bottom', title: 'Align bottom', icon: <AlignEndHorizontal /> },
];

/** Undo / redo and (when selected) align controls — fits inside the compact tool strip. */
export function CanvasToolButtons({ selCount, onAlign, onDistribute, canUndo, canRedo, onUndo, onRedo }: CanvasToolsProps) {
  return (
    <>
      <HudBtn onClick={onUndo} title="Undo (⌘Z)" disabled={!canUndo}>
        <Undo2 />
      </HudBtn>
      <HudBtn onClick={onRedo} title="Redo (⌘⇧Z)" disabled={!canRedo}>
        <Redo2 />
      </HudBtn>
      {selCount >= 2 && (
        <>
          {ALIGN_BTNS.map((b) => (
            <HudBtn key={b.kind} onClick={() => onAlign(b.kind)} title={b.title}>
              {b.icon}
            </HudBtn>
          ))}
          {selCount >= 3 && (
            <>
              <HudBtn onClick={() => onDistribute('h')} title="Distribute horizontally">
                <AlignHorizontalDistributeCenter />
              </HudBtn>
              <HudBtn onClick={() => onDistribute('v')} title="Distribute vertically">
                <AlignVerticalDistributeCenter />
              </HudBtn>
            </>
          )}
        </>
      )}
    </>
  );
}

/** Presentation-mode laser pointer (#148): a glowing dot that follows the cursor. */
export function LaserPointer({ host }: { host: React.RefObject<HTMLElement | null> }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const hideTimer = useRef<number | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setPos(null), 1600);
    };
    el.addEventListener('pointermove', move);
    return () => {
      el.removeEventListener('pointermove', move);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [host]);
  if (!pos) return null;
  return (
    <div
      className="pointer-events-none absolute z-40 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: pos.x,
        top: pos.y,
        background: 'radial-gradient(circle, rgba(255,60,60,0.95) 0%, rgba(255,60,60,0.4) 45%, transparent 70%)',
        boxShadow: '0 0 12px 4px rgba(255,60,60,0.45)',
      }}
    />
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/** A right-click context menu rendered at screen coordinates. */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div
        className="absolute min-w-[168px] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel/95 py-0.5 shadow-[var(--shadow-xl)] backdrop-blur"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              it.onClick();
              onClose();
            }}
            className={cn(
              'flex w-full items-center gap-1.5 px-2.5 py-1 text-left transition-colors hover:bg-panel2',
              it.danger ? 'text-bad' : 'text-ink2 hover:text-ink',
            )}
          >
            {it.icon && <span className="grid h-4 w-4 place-items-center text-ink3">{it.icon}</span>}
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
