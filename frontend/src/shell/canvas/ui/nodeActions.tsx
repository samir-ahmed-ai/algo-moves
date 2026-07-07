import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  onClick,
}: {
  active?: boolean;
  title: string;
  label?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  variant?: PanelHeaderActionVariant;
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
      className={cn(
        'nodrag place-items-center rounded-[calc(var(--radius)-2px)] p-[calc(var(--node-py,0.5625rem)*0.35)] transition-colors disabled:opacity-30',
        label
          ? cn(
              'flex h-auto min-h-[calc(var(--node-icon,1.125rem)*1.1)] w-auto items-center gap-1 px-[calc(var(--node-px,0.75rem)*0.5)]',
              nodeText.xs,
            )
          : 'grid h-[var(--node-icon,1.125rem)] w-[var(--node-icon,1.125rem)]',
        variant === 'primary' &&
          (active ? 'bg-accent text-ink' : 'text-ink3 hover:bg-panel2 hover:text-ink'),
        variant === 'toggle' &&
          (active ? 'text-accent hover:bg-panel2' : 'text-ink3 hover:bg-panel2 hover:text-ink'),
        variant === 'ghost' && 'text-ink3 hover:bg-panel2/80 hover:text-ink',
        className,
      )}
    >
      {children}
      {label ? <span className="max-w-[5.5rem] truncate">{label}</span> : null}
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
    <div ref={ref} className="relative">
      <PanelHeaderAction
        variant="toggle"
        active={open}
        title={title}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical className={nodeIconGlyph} />
      </PanelHeaderAction>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[168px] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel py-1 shadow-[var(--shadow-xl)]">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
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
                  ? 'text-bad hover:bg-badbg/40'
                  : 'text-ink2 hover:bg-panel2 hover:text-ink',
              )}
            >
              {it.icon && (
                <span className="grid h-4 w-4 shrink-0 place-items-center text-ink3">
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
