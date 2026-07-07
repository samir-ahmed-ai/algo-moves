import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText, ChromeLabel } from '@/shell/chromeUi';
import { useAnchoredPopover } from '@/shell/ui/useAnchoredPopover';

export type FeatureTone = 'accent' | 'good' | 'team1' | 'team2';

export type FeatureOption = {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  detailTitle: string;
  detailBadge?: string;
  detailDescription: ReactNode;
  tone?: FeatureTone;
};

export type FeatureGroup = {
  label?: string;
  options: FeatureOption[];
};

export interface FeatureSelectorPopoverProps {
  groups: FeatureGroup[];
  value: string;
  onChange: (id: string) => void;
  triggerLabel?: string;
  panelTitle: string;
  panelHint?: string;
  align?: 'left' | 'right';
  compact?: boolean;
  /** Action menu — no selected value or chevron on the trigger. */
  menu?: boolean;
  triggerIcon?: ReactNode;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  className?: string;
}

const CARD_WIDTH_PX = 104; // matches w-[min(6.5rem,32vw)]
const CARD_GAP_PX = 4; // gap-1
const PANEL_PADDING_X_PX = 12; // p-1.5 horizontal padding

function panelWidthForGroups(groups: FeatureGroup[]): number {
  const maxCards = Math.max(1, ...groups.map((g) => g.options.length));
  return maxCards * CARD_WIDTH_PX + (maxCards - 1) * CARD_GAP_PX + PANEL_PADDING_X_PX;
}

function featureToneStyles(tone?: FeatureTone) {
  switch (tone) {
    case 'good':
      return {
        cardRest: 'border-good/25 bg-goodbg/50 hover:border-good/45 hover:bg-goodbg/80',
        cardHover: 'border-good/45 bg-goodbg/70 shadow-[var(--shadow-sm)]',
        cardActive: 'border-good/55 bg-goodbg shadow-[var(--shadow-sm)]',
        iconRest: 'border-good/35 bg-panel text-good',
        iconActive: 'border-good/50 bg-panel text-good',
        titleRest: 'text-ink',
        titleActive: 'text-good',
        check: 'text-good',
        detail: 'text-good',
      };
    case 'team1':
      return {
        cardRest:
          'border-[color-mix(in_srgb,var(--team1-stroke)_28%,var(--border))] bg-[var(--team1-bg)] hover:border-[color-mix(in_srgb,var(--team1-stroke)_48%,var(--border))]',
        cardHover:
          'border-[color-mix(in_srgb,var(--team1-stroke)_48%,var(--border))] bg-[var(--team1-bg)] shadow-[var(--shadow-sm)]',
        cardActive:
          'border-[color-mix(in_srgb,var(--team1-stroke)_58%,var(--border))] bg-[var(--team1-bg)] shadow-[var(--shadow-sm)]',
        iconRest:
          'border-[color-mix(in_srgb,var(--team1-stroke)_40%,var(--border))] bg-panel text-[var(--team1-stroke)]',
        iconActive:
          'border-[color-mix(in_srgb,var(--team1-stroke)_55%,var(--border))] bg-panel text-[var(--team1-stroke)]',
        titleRest: 'text-[var(--team1-text)]',
        titleActive: 'text-[var(--team1-text)]',
        check: 'text-[var(--team1-stroke)]',
        detail: 'text-[var(--team1-stroke)]',
      };
    case 'team2':
      return {
        cardRest:
          'border-[color-mix(in_srgb,var(--team2-stroke)_28%,var(--border))] bg-[var(--team2-bg)] hover:border-[color-mix(in_srgb,var(--team2-stroke)_48%,var(--border))]',
        cardHover:
          'border-[color-mix(in_srgb,var(--team2-stroke)_48%,var(--border))] bg-[var(--team2-bg)] shadow-[var(--shadow-sm)]',
        cardActive:
          'border-[color-mix(in_srgb,var(--team2-stroke)_58%,var(--border))] bg-[var(--team2-bg)] shadow-[var(--shadow-sm)]',
        iconRest:
          'border-[color-mix(in_srgb,var(--team2-stroke)_40%,var(--border))] bg-panel text-[var(--team2-stroke)]',
        iconActive:
          'border-[color-mix(in_srgb,var(--team2-stroke)_55%,var(--border))] bg-panel text-[var(--team2-stroke)]',
        titleRest: 'text-[var(--team2-text)]',
        titleActive: 'text-[var(--team2-text)]',
        check: 'text-[var(--team2-stroke)]',
        detail: 'text-[var(--team2-stroke)]',
      };
    case 'accent':
      return {
        cardRest: 'border-accent/25 bg-accentbg/50 hover:border-accent/45 hover:bg-accentbg/80',
        cardHover: 'border-accent/45 bg-accentbg/70 shadow-[var(--shadow-sm)]',
        cardActive: 'border-accent/60 bg-accentbg shadow-[var(--shadow-sm)]',
        iconRest: 'border-accent/35 bg-panel text-accent',
        iconActive: 'border-accent/40 bg-panel text-accent',
        titleRest: 'text-ink',
        titleActive: 'text-accent',
        check: 'text-accent',
        detail: 'text-accent',
      };
    default:
      return {
        cardRest: 'border-edge bg-panel2/60 hover:border-accent/40 hover:bg-panel2',
        cardHover: 'border-accent/35 bg-panel2 shadow-[var(--shadow-sm)]',
        cardActive: 'border-accent/60 bg-accentbg shadow-[var(--shadow-sm)]',
        iconRest: 'border-edge bg-panel text-ink3',
        iconActive: 'border-accent/40 bg-panel text-accent',
        titleRest: 'text-ink',
        titleActive: 'text-accent',
        check: 'text-accent',
        detail: 'text-accent',
      };
  }
}

const DEFAULT_TRIGGER =
  'flex items-center gap-1.5 rounded-md border border-edge bg-panel2/60 shadow-sm transition-colors hover:bg-panel2';

/**
 * Combined button that expands to a portalled popover of selectable feature cards
 * with a dynamic detail footer.
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
  menu = false,
  triggerIcon,
  triggerAriaLabel,
  triggerClassName,
  className,
}: FeatureSelectorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const panelWidth = useMemo(() => panelWidthForGroups(groups), [groups]);
  const { anchorRef, panelRef, pos, panelStyle } = useAnchoredPopover(open, close, align, panelWidth);

  const allOptions = groups.flatMap((g) => g.options);
  const selected = allOptions.find((o) => o.id === value);
  const defaultPreview = menu && !selected ? allOptions[0] : undefined;
  const highlighted =
    (hovered ? allOptions.find((o) => o.id === hovered) : undefined) ?? selected ?? defaultPreview;
  const highlightedTone = useMemo(
    () => (highlighted ? featureToneStyles(highlighted.tone) : null),
    [highlighted],
  );

  useEffect(() => {
    if (!open) setHovered(null);
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setHovered(null);
  };

  const ariaLabel =
    triggerAriaLabel ?? (menu && triggerLabel ? triggerLabel : compact ? panelTitle : undefined);

  return (
    <div className={cn('relative shrink-0', className)}>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          triggerClassName ?? DEFAULT_TRIGGER,
          !triggerClassName && open && 'border-accent/40 bg-panel2',
          !triggerClassName && (compact ? 'h-7 w-7 justify-center' : 'px-2 py-1'),
          triggerClassName && open && 'border-accent/50',
        )}
      >
        {triggerIcon && (
          <span className={cn('shrink-0', !compact && !menu && !triggerClassName && 'text-accent')}>
            {triggerIcon}
          </span>
        )}
        {!compact && (
          <>
            {triggerLabel && (
              <span className={cn('shrink-0 text-ink2', chromeText.sm)}>{triggerLabel}</span>
            )}
            {!menu && selected && (
              <span className={cn('min-w-0 flex-1 truncate font-medium text-ink', chromeText.sm)}>
                {selected.title}
              </span>
            )}
            {!menu && (
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 text-ink3 transition-transform',
                  open && 'rotate-180',
                )}
              />
            )}
          </>
        )}
      </button>

      {open &&
        pos &&
        panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={panelTitle}
            style={panelStyle}
            className="fixed z-[200] animate-auth-popover-in rounded-md border border-edge bg-panel shadow-[var(--shadow-lg)]"
          >
            <div className="border-b border-edge px-2.5 py-1.5">
              <p className={cn('min-w-0 truncate', chromeText.xs)}>
                <span className="font-semibold uppercase tracking-[0.08em] text-ink">{panelTitle}</span>
                {panelHint && (
                  <>
                    <span className="mx-1.5 text-ink3" aria-hidden>
                      ·
                    </span>
                    <span className="font-normal text-ink3">{panelHint}</span>
                  </>
                )}
              </p>
            </div>

            <div className="p-1.5">
              {groups.map((group, gi) => (
                <div key={gi} className={gi > 0 ? 'mt-1.5' : ''}>
                  {group.label && <ChromeLabel className="mb-0.5 px-0.5">{group.label}</ChromeLabel>}
                  <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {group.options.map((opt) => {
                      const isSelected = opt.id === value;
                      const isHovered = hovered === opt.id;
                      const tone = featureToneStyles(opt.tone);
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
                            'relative flex w-[min(6.5rem,32vw)] shrink-0 flex-col items-center gap-1 rounded-md border p-2 text-center transition-[colors,transform,box-shadow] duration-150',
                            isSelected
                              ? tone.cardActive
                              : isHovered
                                ? tone.cardHover
                                : tone.cardRest,
                            isHovered && !isSelected && 'scale-[1.02]',
                          )}
                        >
                          {isSelected && (
                            <Check className={cn('absolute right-1 top-1 h-2.5 w-2.5', tone.check)} />
                          )}
                          <span
                            className={cn(
                              'grid h-7 w-7 place-items-center rounded-md border border-dashed [&>svg]:h-3.5 [&>svg]:w-3.5',
                              isSelected ? tone.iconActive : tone.iconRest,
                            )}
                          >
                            {opt.icon}
                          </span>
                          <span className="min-w-0 w-full leading-tight">
                            <span
                              className={cn(
                                'block truncate font-medium',
                                chromeText.xs,
                                isSelected ? tone.titleActive : tone.titleRest,
                              )}
                            >
                              {opt.title}
                            </span>
                            {opt.subtitle && (
                              <span className={cn('mt-0.5 block truncate text-[10px] text-ink3')}>
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

            {highlighted && highlightedTone && (
              <div className="border-t border-edge px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded border border-dashed [&>svg]:h-3 [&>svg]:w-3',
                      highlightedTone.iconRest,
                    )}
                  >
                    {highlighted.icon}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 truncate font-semibold',
                      chromeText.xs,
                      highlightedTone.detail,
                    )}
                  >
                    {highlighted.detailTitle}
                  </span>
                  {highlighted.detailBadge && (
                    <span
                      className={cn(
                        'shrink-0 rounded border border-edge bg-panel2 px-1 py-px font-mono text-[10px] text-ink3',
                      )}
                    >
                      {highlighted.detailBadge}
                    </span>
                  )}
                </div>
                <p className={cn('mt-0.5 line-clamp-2 text-ink3', chromeText.xs)}>
                  {highlighted.detailDescription}
                </p>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Visually joins adjacent popover triggers into one segmented control. */
export function ToolbarSegment({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center',
        '[&_button]:rounded-none [&>*:first-child_button]:rounded-l-md [&>*:last-child_button]:rounded-r-md',
        '[&>*:not(:first-child)_button]:-ml-px',
        className,
      )}
    >
      {children}
    </div>
  );
}
