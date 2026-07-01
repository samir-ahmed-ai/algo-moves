import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';
import { chromeText, ChromeLabel } from './chromeUi';
import { STRUDEL_NODE_W } from './canvas/nodeTokens';
import { CHROME_BTN_MD } from './chrome';

export {
  BOTTOM_RAIL_H,
  DEFAULT_DOCK_H,
  MIN_DOCK_H,
  CHROME_BTN,
  CHROME_BTN_MD,
  CHROME_ICON,
  CSS_CHROME_BOTTOM_RAIL,
  CSS_CHROME_BOTTOM_DOCK,
} from './chrome';

export const SIDEBAR_W = 192;
export const SIDEBAR_RAIL_W = 32;
export const SIDEBAR_WIDE_W = STRUDEL_NODE_W;

export const SECTION_MAX = {
  catalog: 'max-h-[36vh]',
  problems: 'max-h-[28vh]',
  addPanel: 'max-h-[24vh]',
  mode: 'max-h-[10vh]',
  transport: 'max-h-[16vh]',
  canvas: 'max-h-[44vh]',
  selection: 'max-h-[30vh]',
  panels: 'max-h-[24vh]',
  plugin: 'max-h-[48vh]',
  appearance: 'max-h-[22vh]',
  about: 'max-h-[28vh]',
  replay: 'max-h-[30vh]',
  inspector: 'max-h-[30vh]',
  metrics: 'max-h-[30vh]',
} as const;

/**
 * Phone overlay wrapper: dims the canvas with a tap-to-close backdrop and slides
 * a panel in from the given edge. Used by the left/right sidebars on mobile so
 * they float over the canvas instead of squeezing it out of the flex row.
 */
export function MobileDrawer({
  side,
  onClose,
  label,
  width,
  children,
}: {
  side: 'left' | 'right';
  onClose: () => void;
  label: string;
  width?: number | string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[55] flex" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[1px] mobile-drawer-fade"
      />
      <div
        className={cn(
          'relative flex h-full max-w-[92vw] flex-col overflow-hidden bg-panel text-ink shadow-[var(--shadow-xl)]',
          side === 'left' ? 'mr-auto border-r border-edge mobile-drawer-left' : 'ml-auto border-l border-edge mobile-drawer-right',
        )}
        style={{ width: width ?? 'min(86vw, 300px)' }}
      >
        {children}
      </div>
    </div>
  );
}

export function SidebarSection({
  icon,
  title,
  badge,
  open,
  onToggle,
  maxHeightClass,
  children,
}: {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  maxHeightClass?: string;
  children: ReactNode;
}) {
  return (
    <section className="shrink-0 border-b border-edge last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-1 px-[var(--hpad)] py-0.5 text-left text-ink3 transition-colors hover:text-ink2',
        )}
      >
        <span className="grid h-3 w-3 shrink-0 place-items-center text-ink3">{icon}</span>
        <ChromeLabel className="min-w-0 flex-1 truncate normal-case">{title}</ChromeLabel>
        {badge != null &&
          (typeof badge === 'string' || typeof badge === 'number' ? (
            <span className={cn('shrink-0 rounded-full bg-panel2 px-1 py-px font-mono tabular-nums text-ink3', chromeText.xs)}>
              {badge}
            </span>
          ) : (
            badge
          ))}
        <ChevronDown
          className={cn('ml-auto h-3 w-3 shrink-0 transition-transform', !open && '-rotate-90')}
        />
      </button>
      {open && (
        <div className={cn('ws-scroll min-h-0 flex-1 overflow-y-auto pb-1', maxHeightClass)}>{children}</div>
      )}
    </section>
  );
}

export function CollapsedRailButton({
  title,
  ariaLabel,
  onClick,
  active,
  children,
  badge,
}: {
  title: string;
  ariaLabel: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={cn(
        'relative grid place-items-center rounded-md text-ink3 transition-colors hover:bg-panel2 hover:text-ink',
        CHROME_BTN_MD,
        active && 'bg-accentbg text-accent',
      )}
    >
      {children}
      {badge}
    </button>
  );
}
