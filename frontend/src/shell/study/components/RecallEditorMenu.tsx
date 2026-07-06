import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical, Settings2 } from 'lucide-react';
import { Btn } from '@/shell/canvas';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { RecallEditorMenuItem } from './recallEditorControls';

/** Dropdown for recall CodeMirror toggles — used in compact toolbar and as overflow in spacious mode. */
export function RecallEditorMenu({
  items,
  title = 'Editor settings',
  icon,
  compact,
  className,
}: {
  items: RecallEditorMenuItem[];
  title?: string;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
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
    <div ref={ref} className={cn('relative shrink-0', className)}>
      <Btn
        size="xs"
        variant={open ? 'primary' : 'ghost'}
        icon={icon ?? (compact ? <Settings2 className="h-3.5 w-3.5" /> : <MoreVertical className="h-3.5 w-3.5" />)}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[188px] overflow-hidden rounded-[var(--radius)] border border-edge bg-panel py-1 shadow-[var(--shadow-xl)]">
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
                'flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors disabled:opacity-40',
                chromeText.sm,
                it.active ? 'bg-accentbg text-accent' : 'text-ink2 hover:bg-panel2 hover:text-ink',
              )}
            >
              {it.icon && <span className="grid h-4 w-4 shrink-0 place-items-center">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
