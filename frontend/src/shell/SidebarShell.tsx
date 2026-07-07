import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText, ChromeLabel } from './chromeUi';
import { CHROME_BTN_MD } from './chrome';

export {
  BOTTOM_RAIL_H,
  CHROME_BTN,
  CHROME_BTN_MD,
  CHROME_ICON,
  CSS_CHROME_BOTTOM_RAIL,
} from './chrome';

// Sidebar dimensions are pure design tokens; re-exported for chrome consumers.
export { SIDEBAR_W, SIDEBAR_RAIL_W, SIDEBAR_WIDE_W } from '@/design/sidebarMetrics';

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
          side === 'left'
            ? 'mr-auto border-r border-edge mobile-drawer-left'
            : 'ml-auto border-l border-edge mobile-drawer-right',
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
  fill,
  anchor = 'top',
  children,
}: {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  maxHeightClass?: string;
  /** When true and open, section grows to fill remaining flex space (top explorer). */
  fill?: boolean;
  /** Bottom-anchored sections: header stays at the bottom, content opens upward. */
  anchor?: 'top' | 'bottom';
  children: ReactNode;
}) {
  const bottom = anchor === 'bottom';
  return (
    <section
      className={cn(
        'border-b border-edge last:border-b-0',
        fill && open ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0',
        bottom && 'flex flex-col-reverse',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full shrink-0 items-center gap-[var(--gap)] px-[var(--hpad)] py-[var(--gap)] text-left text-ink3 transition-colors hover:text-ink2',
        )}
      >
        <span className="grid h-3 w-3 shrink-0 place-items-center text-ink3">{icon}</span>
        <ChromeLabel className={cn('min-w-0 flex-1 truncate normal-case', chromeText.xs)}>
          {title}
        </ChromeLabel>
        {badge != null &&
          (typeof badge === 'string' || typeof badge === 'number' ? (
            <span
              className={cn(
                'shrink-0 rounded-full bg-panel2 px-1 py-px font-mono tabular-nums text-ink3',
                chromeText.xs,
              )}
            >
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
        <div
          className={cn(
            'ws-scroll min-h-0 overflow-y-auto',
            bottom ? 'pt-1' : 'pb-1',
            fill ? 'flex-1' : maxHeightClass,
          )}
        >
          {children}
        </div>
      )}
    </section>
  );
}

export function SidebarTabBar<T extends string>({
  tabs,
  active,
  onTab,
}: {
  tabs: { id: T; label: string; icon?: ReactNode }[];
  active: T;
  onTab: (id: T) => void;
}) {
  return (
    <div className="sidebar-tab-bar flex shrink-0 border-b border-edge">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTab(t.id)}
          className={cn(
            'flex min-h-[var(--row)] flex-1 items-center justify-center gap-0.5 px-0.5 py-0 transition-colors',
            active === t.id ? 'border-b-2 border-accent text-accent' : 'text-ink3 hover:text-ink2',
          )}
        >
          {t.icon}
          <ChromeLabel className={cn('truncate normal-case', active === t.id && 'text-accent')}>
            {t.label}
          </ChromeLabel>
        </button>
      ))}
    </div>
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
