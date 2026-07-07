import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { nodeText, nodeIconGlyph } from '@/design/typography';

export type PanelHeaderActionVariant = 'primary' | 'toggle' | 'ghost';

export function PanelHeaderAction({
  active,
  title,
  label,
  disabled,
  children,
  className,
  variant = 'ghost',
  ariaControls,
  ariaExpanded,
  ariaHaspopup,
  onClick,
}: {
  active?: boolean;
  title: string;
  label?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  variant?: PanelHeaderActionVariant;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaHaspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      data-active={active ? 'true' : undefined}
      data-variant={variant}
      className={cn(
        'panel-header-action nodrag place-items-center rounded-[calc(var(--radius)-2px)] p-[calc(var(--node-py,0.5625rem)*0.35)] transition-colors disabled:opacity-30',
        label
          ? cn(
              'flex h-auto min-h-[calc(var(--node-icon,1.125rem)*1.1)] w-auto items-center gap-1 px-[calc(var(--node-px,0.75rem)*0.5)]',
              nodeText.xs,
            )
          : 'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)]',
        variant === 'primary' &&
          cn(
            'panel-header-action--primary',
            active ? 'bg-accent text-ink' : 'text-ink3 hover:bg-panel2 hover:text-ink',
          ),
        variant === 'toggle' &&
          cn(
            'panel-header-action--toggle',
            active ? 'text-accent hover:bg-panel2' : 'text-ink3 hover:bg-panel2 hover:text-ink',
          ),
        variant === 'ghost' &&
          'panel-header-action--ghost text-ink3 hover:bg-panel2/80 hover:text-ink',
        active && 'panel-header-action--active',
        className,
      )}
    >
      {children}
      {label ? (
        <span className="panel-header-action__label max-w-[5.5rem] truncate">{label}</span>
      ) : null}
    </button>
  );
}

export type PanelHeaderMenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function PanelHeaderMenu({
  items,
  title = 'Panel actions',
}: {
  items: PanelHeaderMenuItem[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="panel-header-menu-anchor relative">
      <PanelHeaderAction
        variant="toggle"
        active={open}
        title={title}
        ariaHaspopup="menu"
        ariaExpanded={open}
        {...(open ? { ariaControls: menuId } : {})}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical className={nodeIconGlyph} />
      </PanelHeaderAction>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={title}
          className="panel-header-menu absolute right-0 top-[calc(100%+4px)] z-50 min-w-[168px] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel py-1 shadow-[var(--shadow-xl)]"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                if (it.disabled) return;
                it.onClick();
                setOpen(false);
              }}
              className={cn(
                cn(
                  'flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors disabled:opacity-40',
                  nodeText.sm,
                ),
                it.danger
                  ? 'panel-header-menu__item panel-header-menu__item--danger text-bad hover:bg-badbg/40'
                  : 'panel-header-menu__item text-ink2 hover:bg-panel2 hover:text-ink',
              )}
            >
              {it.icon && (
                <span className="panel-header-menu__icon grid h-4 w-4 shrink-0 place-items-center text-ink3">
                  {it.icon}
                </span>
              )}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
