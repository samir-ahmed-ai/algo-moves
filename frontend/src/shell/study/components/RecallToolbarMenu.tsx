import { useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useAnchoredPopover } from '@/hooks/useAnchoredPopover';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { RecallEditorMenuItem } from './recallEditorControls';
import { ToolbarGroup, ToolbarGroupBtn } from './ToolbarGroup';

function RecallToolbarMenuPanel({
  items,
  onClose,
}: {
  items: RecallEditorMenuItem[];
  onClose: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="recall-toolbar-menu-panel__body p-1">
      <ToolbarGroup className="recall-toolbar-menu-panel__group w-full flex-wrap">
        {items.map((item) => {
          const isToggle = item.active !== undefined;
          return (
            <ToolbarGroupBtn
              key={item.label}
              {...(item.active !== undefined ? { active: item.active } : {})}
              title={item.label}
              {...(item.disabled !== undefined ? { disabled: item.disabled } : {})}
              aria-label={item.label}
              onClick={() => {
                if (item.disabled) return;
                item.onClick();
                if (!isToggle) onClose();
              }}
              className={cn(
                'h-7 min-w-7 shrink-0 px-1.5',
                item.danger && 'text-bad hover:bg-bad/10',
              )}
            >
              {item.icon ?? (
                <span className={cn('max-w-[4rem] truncate font-medium', chromeText.xs)}>
                  {item.label}
                </span>
              )}
            </ToolbarGroupBtn>
          );
        })}
      </ToolbarGroup>
    </div>
  );
}

/** Anchored dropdown menu for recall toolbar categories. */
export function RecallToolbarMenu({
  label,
  icon,
  items,
  active,
  badge,
  compact,
  panelWidth = 280,
  header,
  title,
}: {
  label: string;
  icon?: ReactNode;
  items: RecallEditorMenuItem[];
  /** Highlight trigger when any child toggle is active. */
  active?: boolean;
  /** Optional badge (e.g. toggle count) shown on trigger. */
  badge?: number;
  compact?: boolean;
  panelWidth?: number;
  /** Optional custom header slot inside the panel (e.g. font stepper). */
  header?: ReactNode;
  /** Override native tooltip — defaults to `label`. */
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { anchorRef, panelRef, pos, panelStyle } = useAnchoredPopover(
    open,
    close,
    'left',
    panelWidth,
  );

  if (items.length === 0 && !header) return null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        title={title ?? label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'recall-toolbar-menu-trigger toolbar-group-btn nodrag inline-flex h-6 items-center justify-center gap-0.5 border-r border-edge px-1.5 transition-colors last:border-r-0',
          chromeText.xs,
          open || active
            ? 'toolbar-group-btn--active bg-accentbg text-accent'
            : 'toolbar-group-btn--idle text-ink2 hover:bg-panel2 hover:text-ink',
        )}
      >
        {icon}
        {!compact && <span className="max-w-[4.5rem] truncate font-medium">{label}</span>}
        <ChevronDown
          className={cn(
            'h-2.5 w-2.5 shrink-0 opacity-60 transition-transform',
            open && 'rotate-180',
          )}
        />
        {badge != null && badge > 0 && (
          <span className="recall-toolbar-menu-badge ml-0.5 rounded-full bg-accent/20 px-1 font-mono text-[length:var(--fs-2xs)] tabular-nums text-accent">
            {badge}
          </span>
        )}
      </button>

      {open &&
        pos &&
        panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={label}
            style={panelStyle}
            className="recall-toolbar-menu-panel fixed z-[200] overflow-hidden rounded-lg border border-edge bg-panel shadow-[var(--shadow-xl)]"
          >
            {header && (
              <div className="recall-toolbar-menu-panel__header border-b border-edge px-2 py-1.5">
                {header}
              </div>
            )}
            <RecallToolbarMenuPanel items={items} onClose={close} />
          </div>,
          document.body,
        )}
    </>
  );
}
