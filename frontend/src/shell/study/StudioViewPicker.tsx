import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ChromeLabel, chromeText } from '../chromeUi';
import { usePopoverDismiss } from '../ui/usePopoverDismiss';
import { flatOrder, type StudioGroupId, type StudioTab } from './studioTabs';

export interface StudioViewPickerProps {
  stages: { id: StudioGroupId; label: string }[];
  avail: StudioTab[];
  active: StudioTab;
  onGo: (id: string) => void;
  /** Icon-only trigger for narrow viewports. */
  compact?: boolean;
}

/** Grouped view picker — replaces the old sidebar nav with one dropdown. */
export function StudioViewPicker({ stages, avail, active, onGo, compact }: StudioViewPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(rootRef, open, () => setOpen(false));

  const ordered = flatOrder(avail);
  const ActiveIcon = active.icon;

  const pick = (id: string) => {
    onGo(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? `${active.label} view` : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border border-edge bg-panel2/60 transition-colors hover:bg-panel2',
          compact ? 'h-7 w-7 shrink-0 justify-center px-0 py-0' : 'max-w-[min(220px,42vw)] px-2 py-1',
          open && 'border-edge-active bg-panel2',
        )}
      >
        <ActiveIcon className="h-4 w-4 shrink-0 text-accent" />
        {!compact && (
          <>
            <span className={cn('min-w-0 flex-1 truncate font-medium text-ink', chromeText.sm)}>{active.label}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-ink3 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="ws-scroll absolute left-0 top-[calc(100%+4px)] z-50 max-h-[min(70vh,420px)] w-[min(280px,calc(100vw-24px))] overflow-y-auto rounded-[var(--radius)] border border-edge bg-panel py-1 shadow-lg"
        >
          {stages.map((g) => {
            const tabs = ordered.filter((t) => t.group === g.id);
            if (!tabs.length) return null;
            return (
              <div key={g.id} className="px-1.5 pb-1">
                <ChromeLabel className="px-2 py-1 font-semibold normal-case tracking-wide">{g.label}</ChromeLabel>
                <div className="flex flex-col gap-0.5">
                  {tabs.map((t) => {
                    const Icon = t.icon;
                    const on = t.id === active.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="menuitem"
                        onClick={() => pick(t.id)}
                        aria-current={on ? 'page' : undefined}
                        className={cn(
                          'flex w-full min-h-[var(--row)] items-center gap-2 rounded-md px-2 py-1 text-left transition-colors',
                          chromeText.sm,
                          on ? 'bg-accentbg font-medium text-accent' : 'text-ink2 hover:bg-panel2 hover:text-ink',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
