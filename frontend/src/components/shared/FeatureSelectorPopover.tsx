import { useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText, ChromeLabel } from '@/shell/chromeUi';
import { usePopoverDismiss } from '@/shell/ui/usePopoverDismiss';

export type FeatureOption = {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  detailTitle: string;
  detailBadge?: string;
  detailDescription: ReactNode;
};

export type FeatureGroup = {
  label?: string;
  options: FeatureOption[];
};

export interface FeatureSelectorPopoverProps {
  groups: FeatureGroup[];
  /** Currently selected option id. */
  value: string;
  onChange: (id: string) => void;
  /** Short uppercase label shown on the trigger before the current value, e.g. "Mode". */
  triggerLabel?: string;
  /** Heading shown at the top of the popover panel. */
  panelTitle: string;
  /** Optional subtitle shown below the panel heading. */
  panelHint?: string;
  /** Open popover to left or right of trigger. Defaults to "left". */
  align?: 'left' | 'right';
  /** Icon-only trigger (no text). */
  compact?: boolean;
  /** Custom trigger icon, shown when compact or alongside the label. */
  triggerIcon?: ReactNode;
  className?: string;
}

/**
 * A Supabase-style combined button that expands to a popover of selectable feature
 * cards with a dynamic detail footer. Groups are displayed with optional section labels.
 */
export function FeatureSelectorPopover({
  groups,
  value,
  onChange,
  triggerLabel,
  panelTitle,
  panelHint,
  align = 'right',
  compact = false,
  triggerIcon,
  className,
}: FeatureSelectorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(rootRef, open, () => setOpen(false));

  const allOptions = groups.flatMap((g) => g.options);
  const selected = allOptions.find((o) => o.id === value);
  const highlighted = hovered ? allOptions.find((o) => o.id === hovered) : selected;

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setHovered(null);
  };

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border border-edge bg-panel2/60 shadow-sm transition-colors hover:bg-panel2',
          open && 'border-accent/40 bg-panel2',
          compact ? 'h-7 w-7 justify-center' : 'px-2 py-1',
        )}
      >
        {triggerIcon && (
          <span className={cn('shrink-0', compact ? '' : 'text-accent')}>{triggerIcon}</span>
        )}
        {!compact && (
          <>
            {triggerLabel && (
              <span className={cn('shrink-0 text-ink3', chromeText.xs)}>{triggerLabel}</span>
            )}
            {selected && (
              <span className={cn('min-w-0 flex-1 truncate font-medium text-ink', chromeText.sm)}>
                {selected.title}
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-ink3 transition-transform',
                open && 'rotate-180',
              )}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={panelTitle}
          className={cn(
            'absolute top-[calc(100%+6px)] z-50 w-[min(90vw,22rem)] rounded-lg border border-edge bg-panel shadow-[var(--shadow-xl)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          {/* Panel header */}
          <div className="border-b border-edge px-3 py-2.5">
            <p className={cn('font-semibold uppercase tracking-[0.08em] text-ink', chromeText.xs)}>
              {panelTitle}
            </p>
            {panelHint && (
              <p className={cn('mt-0.5 text-ink3', chromeText.xs)}>{panelHint}</p>
            )}
          </div>

          {/* Card sections */}
          <div className="p-2">
            {groups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-2' : ''}>
                {group.label && (
                  <ChromeLabel className="mb-1 px-1">{group.label}</ChromeLabel>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {group.options.map((opt) => {
                    const isSelected = opt.id === value;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => pick(opt.id)}
                        onMouseEnter={() => setHovered(opt.id)}
                        onMouseLeave={() => setHovered(null)}
                        className={cn(
                          'relative flex w-[min(9rem,40vw)] shrink-0 flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors',
                          isSelected
                            ? 'border-accent/60 bg-accentbg'
                            : 'border-edge bg-panel2/60 hover:border-accent/40 hover:bg-panel2',
                        )}
                      >
                        {isSelected && (
                          <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-accent" />
                        )}
                        <span
                          className={cn(
                            'grid h-10 w-10 place-items-center rounded-lg border border-dashed [&>svg]:h-5 [&>svg]:w-5',
                            isSelected
                              ? 'border-accent/40 bg-panel text-accent'
                              : 'border-edge bg-panel text-ink3',
                          )}
                        >
                          {opt.icon}
                        </span>
                        <span className="min-w-0 w-full">
                          <span
                            className={cn(
                              'block truncate font-medium',
                              chromeText.sm,
                              isSelected ? 'text-accent' : 'text-ink',
                            )}
                          >
                            {opt.title}
                          </span>
                          {opt.subtitle && (
                            <span className={cn('block truncate text-ink3', chromeText.xs)}>
                              {opt.subtitle}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Detail footer */}
          {highlighted && (
            <div className="border-t border-edge px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn('font-semibold text-ink', chromeText.sm)}>
                  {highlighted.detailTitle}
                </span>
                {highlighted.detailBadge && (
                  <span
                    className={cn(
                      'rounded border border-edge bg-panel2 px-1.5 py-0.5 font-mono text-ink3',
                      chromeText.xs,
                    )}
                  >
                    {highlighted.detailBadge}
                  </span>
                )}
              </div>
              <p className={cn('mt-1 text-ink3', chromeText.sm)}>{highlighted.detailDescription}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Wraps adjacent triggers into a visually joined toolbar segment —
 * shared borders, no gap between siblings.
 */
export function ToolbarSegment({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center [&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*:not(:first-child)]:-ml-px',
        className,
      )}
    >
      {children}
    </div>
  );
}
