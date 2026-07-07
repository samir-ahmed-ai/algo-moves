import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ChromeLabel, chromeText } from '../chromeUi';
import { useAnchoredPopover } from '../ui/useAnchoredPopover';
import { flatOrder, type StudioGroupId, type StudioTab } from './studioTabs';

export interface StudioViewPickerProps {
  stages: { id: StudioGroupId; label: string }[];
  avail: StudioTab[];
  active: StudioTab;
  onGo: (id: string) => void;
  compact?: boolean;
  variants?: Array<{ lang?: string }>;
  activeVariant?: number;
  onSetVariant?: (index: number) => void;
}

const TAB_HINTS: Record<string, string> = {
  overview: 'Step-by-step visual walkthrough of the algorithm with animated replay.',
  quiz: 'Multiple-choice questions that test conceptual understanding.',
  assemble: 'Drag code pieces into the correct order to reconstruct the solution.',
  source: 'Full annotated source code with inline commentary.',
  simulate: 'Single-step the algorithm and predict each state before it is revealed.',
  predict: 'Predict the next output or state change at each step.',
  cases: 'Walk through worked examples end-to-end, case by case.',
  pattern: 'Common algorithmic patterns and techniques this problem illustrates.',
  cheatsheet: 'Compact quick-reference sheet for last-minute revision.',
  mistakes: 'Review and analyse every wrong answer you have given.',
  badges: 'Mastery badges earned for this problem.',
  path: 'Your personal learning path and completion progress.',
  notes: 'Personal freeform notes scoped to this problem.',
};

const CARD_WIDTH_PX = 104;
const CARD_GAP_PX = 4;
const PANEL_PADDING_X_PX = 12;

function panelWidthForTabCount(count: number): number {
  return count * CARD_WIDTH_PX + Math.max(0, count - 1) * CARD_GAP_PX + PANEL_PADDING_X_PX;
}

/** Grouped view picker — compact trigger expanding to a portalled feature-card panel. */
export function StudioViewPicker({
  stages,
  avail,
  active,
  onGo,
  compact,
  variants,
  activeVariant,
  onSetVariant,
}: StudioViewPickerProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const ordered = flatOrder(avail);
  const panelWidth = useMemo(() => {
    const maxTabs = Math.max(1, ...stages.map((g) => ordered.filter((t) => t.group === g.id).length));
    const variantCount = variants && variants.length > 1 ? variants.length : 0;
    return panelWidthForTabCount(Math.max(maxTabs, variantCount));
  }, [stages, ordered, variants]);
  const { anchorRef, panelRef, pos, panelStyle } = useAnchoredPopover(open, close, 'left', panelWidth);

  const ActiveIcon = active.icon;

  const pick = (id: string) => {
    onGo(id);
    setOpen(false);
    setHovered(null);
  };

  const highlightedId = hovered ?? active.id;
  const highlightedTab = ordered.find((t) => t.id === highlightedId) ?? active;

  useEffect(() => {
    if (!open) setHovered(null);
  }, [open]);

  return (
    <div className="studio-stage-picker relative shrink-0">
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={compact ? `${active.label} view` : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border border-edge bg-panel2/60 shadow-sm transition-colors hover:bg-panel2',
          compact ? 'h-7 w-7 shrink-0 justify-center px-0 py-0' : 'max-w-[min(220px,42vw)] px-2 py-1',
          open && 'border-accent/40 bg-panel2',
        )}
      >
        <ActiveIcon className="h-4 w-4 shrink-0 text-accent" />
        {!compact && (
          <>
            <span className={cn('min-w-0 flex-1 truncate font-medium text-ink', chromeText.sm)}>
              {active.label}
            </span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 shrink-0 text-ink3 transition-transform', open && 'rotate-180')}
            />
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
            aria-label="Studio view"
            style={panelStyle}
            className="fixed z-[200] animate-auth-popover-in rounded-md border border-edge bg-panel shadow-[var(--shadow-lg)]"
          >
            <div className="border-b border-edge px-2.5 py-1.5">
              <p className={cn('font-semibold uppercase tracking-[0.08em] text-ink', chromeText.xs)}>
                Choose view
              </p>
            </div>

            <div className="p-1.5">
              {stages.map((g, gi) => {
                const tabs = ordered.filter((t) => t.group === g.id);
                if (!tabs.length) return null;
                return (
                  <div key={g.id} className={gi > 0 ? 'mt-1.5' : ''}>
                    <ChromeLabel className="mb-0.5 px-0.5">{g.label}</ChromeLabel>
                    <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {tabs.map((t) => {
                        const Icon = t.icon;
                        const isActive = t.id === active.id;
                        const isHovered = hovered === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => pick(t.id)}
                            onMouseEnter={() => setHovered(t.id)}
                            onMouseLeave={() => setHovered(null)}
                            className={cn(
                              'relative flex w-[min(6.5rem,32vw)] shrink-0 flex-col items-center gap-1 rounded-md border p-2 text-center transition-[colors,transform,box-shadow] duration-150',
                              isActive
                                ? 'border-accent/60 bg-accentbg shadow-[var(--shadow-sm)]'
                                : isHovered
                                  ? 'border-accent/45 bg-accentbg/70 shadow-[var(--shadow-sm)]'
                                  : 'border-edge bg-panel2/60 hover:border-accent/40 hover:bg-panel2',
                              isHovered && !isActive && 'scale-[1.02]',
                            )}
                          >
                            {isActive && (
                              <Check className="absolute right-1 top-1 h-2.5 w-2.5 text-accent" />
                            )}
                            <span
                              className={cn(
                                'grid h-7 w-7 place-items-center rounded-md border border-dashed [&>svg]:h-3.5 [&>svg]:w-3.5',
                                isActive
                                  ? 'border-accent/40 bg-panel text-accent'
                                  : 'border-edge bg-panel text-ink3',
                              )}
                            >
                              <Icon />
                            </span>
                            <span
                              className={cn(
                                'block w-full truncate font-medium leading-tight',
                                chromeText.xs,
                                isActive ? 'text-accent' : 'text-ink',
                              )}
                            >
                              {t.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {variants && variants.length > 1 && (
                <div className="mt-1.5">
                  <ChromeLabel className="mb-0.5 px-0.5">Language</ChromeLabel>
                  <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {variants.map((v, i) => {
                      const label = (v.lang ?? 'text').toUpperCase();
                      const isActive = i === activeVariant;
                      return (
                        <button
                          key={i}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => {
                            onSetVariant?.(i);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex w-[min(4.5rem,22vw)] shrink-0 flex-col items-center justify-center rounded-md border px-2 py-2 text-center transition-colors',
                            isActive
                              ? 'border-accent/60 bg-accentbg shadow-[var(--shadow-sm)]'
                              : 'border-edge bg-panel2/60 hover:border-accent/40 hover:bg-panel2',
                          )}
                        >
                          <span
                            className={cn(
                              'block font-mono font-semibold tracking-wide',
                              chromeText.xs,
                              isActive ? 'text-accent' : 'text-ink',
                            )}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-edge px-2.5 py-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <highlightedTab.icon className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className={cn('min-w-0 truncate font-semibold text-ink', chromeText.xs)}>
                  {highlightedTab.label}
                </span>
              </div>
              <p className={cn('mt-0.5 line-clamp-2 text-ink3', chromeText.xs)}>
                {TAB_HINTS[highlightedTab.id] ?? highlightedTab.label}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
