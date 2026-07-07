import { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
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
  /** Language variants for the active content. When supplied a second "Language" card group is shown. */
  variants?: Array<{ lang?: string }>;
  activeVariant?: number;
  onSetVariant?: (index: number) => void;
}

/** Per-tab hint copy shown in the detail footer. */
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

/** Grouped view picker — a compact trigger that expands to a feature-card panel. */
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
  const rootRef = useRef<HTMLDivElement>(null);
  usePopoverDismiss(rootRef, open, () => setOpen(false));

  const ordered = flatOrder(avail);
  const ActiveIcon = active.icon;

  const pick = (id: string) => {
    onGo(id);
    setOpen(false);
    setHovered(null);
  };

  const highlightedId = hovered ?? active.id;
  const highlightedTab = ordered.find((t) => t.id === highlightedId) ?? active;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
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

      {open && (
        <div
          role="listbox"
          aria-label="Studio view"
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-lg border border-edge bg-panel shadow-[var(--shadow-xl)]"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          {/* Panel header */}
          <div className="border-b border-edge px-3 py-2.5">
            <p className={cn('font-semibold uppercase tracking-[0.08em] text-ink', chromeText.xs)}>
              Choose view
            </p>
          </div>

          {/* Card groups */}
          <div className="p-2">
            {stages.map((g, gi) => {
              const tabs = ordered.filter((t) => t.group === g.id);
              if (!tabs.length) return null;
              return (
                <div key={g.id} className={gi > 0 ? 'mt-2' : ''}>
                  <ChromeLabel className="mb-1 px-1">{g.label}</ChromeLabel>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((t) => {
                      const Icon = t.icon;
                      const isActive = t.id === active.id;
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
                            'relative flex w-[min(7rem,30vw)] shrink-0 flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-colors',
                            isActive
                              ? 'border-accent/60 bg-accentbg'
                              : 'border-edge bg-panel2/60 hover:border-accent/40 hover:bg-panel2',
                          )}
                        >
                          {isActive && (
                            <Check className="absolute right-1 top-1 h-2.5 w-2.5 text-accent" />
                          )}
                          <span
                            className={cn(
                              'grid h-8 w-8 place-items-center rounded-md border border-dashed [&>svg]:h-4 [&>svg]:w-4',
                              isActive
                                ? 'border-accent/40 bg-panel text-accent'
                                : 'border-edge bg-panel text-ink3',
                            )}
                          >
                            <Icon />
                          </span>
                          <span
                            className={cn(
                              'block w-full truncate font-medium',
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

            {/* Language variants — optional second group */}
            {variants && variants.length > 1 && (
              <div className="mt-2">
                <ChromeLabel className="mb-1 px-1">Language</ChromeLabel>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {variants.map((v, i) => {
                    const label = (v.lang ?? 'text').toUpperCase();
                    const isActive = i === activeVariant;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => { onSetVariant?.(i); setOpen(false); }}
                        className={cn(
                          'flex w-[min(5rem,25vw)] shrink-0 flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-colors',
                          isActive
                            ? 'border-accent/60 bg-accentbg'
                            : 'border-edge bg-panel2/60 hover:border-accent/40 hover:bg-panel2',
                        )}
                      >
                        <span
                          className={cn(
                            'block font-mono font-semibold tracking-wide',
                            chromeText.sm,
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

          {/* Detail footer */}
          <div className="border-t border-edge px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <highlightedTab.icon className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className={cn('font-semibold text-ink', chromeText.sm)}>{highlightedTab.label}</span>
            </div>
            <p className={cn('mt-1 text-ink3', chromeText.sm)}>
              {TAB_HINTS[highlightedTab.id] ?? highlightedTab.label}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
