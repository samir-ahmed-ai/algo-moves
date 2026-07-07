import { createContext, useContext, type ReactNode } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';
import { StudioViewPicker } from './StudioViewPicker';
import type { StudioGroupId, StudioTab } from './studioTabs';

const StudioArcSlotContext = createContext<ReactNode>(null);

/** Injects the arc nav into the split layout's second-column header. */
export function StudioArcSlotProvider({
  value,
  children,
}: {
  value: ReactNode;
  children: ReactNode;
}) {
  return <StudioArcSlotContext.Provider value={value}>{children}</StudioArcSlotContext.Provider>;
}

export function useStudioArcSlot() {
  return useContext(StudioArcSlotContext);
}

type StepState = 'done' | 'active' | 'todo';

export interface StudioArcProps {
  /** Primary learning-spine tabs, in canonical order. */
  arc: StudioTab[];
  /** Secondary ("More views") tabs, in canonical order. */
  more: StudioTab[];
  /** Full available order — drives done/active/todo state. */
  order: StudioTab[];
  stages: { id: StudioGroupId; label: string }[];
  active: StudioTab;
  onGo: (id: string) => void;
  variants?: ReadonlyArray<{ lang?: string | undefined }> | undefined;
  activeVariant?: number | undefined;
  onSetVariant?: ((index: number) => void) | undefined;
  compact?: boolean | undefined;
  /** Tighter padding and smaller icons — for the second-column header slot. */
  dense?: boolean | undefined;
  /** Drop the row chrome (border/background) — for embedding in a floating pill. */
  bare?: boolean | undefined;
  className?: string | undefined;
}

/**
 * The Learn Studio arc — one persistent, clickable, progress-aware spine that shows
 * where the learner is in the core loop (Overview → Quiz → Assemble → Source) and lets
 * them jump. Replaces the old header popover picker + non-interactive footer breadcrumb.
 * The long tail of views collapses into a single "More" overflow.
 */
export function StudioArc({
  arc,
  more,
  order,
  stages,
  active,
  onGo,
  variants,
  activeVariant,
  onSetVariant,
  compact,
  dense,
  bare,
  className,
}: StudioArcProps) {
  const activeIdx = order.findIndex((t) => t.id === active.id);
  const moreStages = stages.filter((g) => more.some((t) => t.group === g.id));
  const hasMore = more.length > 0 || (variants ? variants.length > 1 : false);

  return (
    <nav
      aria-label="Learning arc"
      className={cn(
        'studio-arc nodrag flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        dense ? 'px-1.5 py-1' : 'px-2 py-1.5 sm:px-3',
        bare ? 'rounded-full' : 'border-b border-edge bg-panel/60',
        dense && 'studio-arc--dense',
        className,
      )}
    >
      {arc.map((tab, i) => {
        const idx = order.findIndex((t) => t.id === tab.id);
        const state: StepState = idx === activeIdx ? 'active' : idx < activeIdx ? 'done' : 'todo';
        const Icon = tab.icon;
        return (
          <div key={tab.id} className="flex shrink-0 items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'mx-0.5 h-px rounded-full',
                  dense ? 'w-2.5' : 'w-4 sm:w-6',
                  idx <= activeIdx ? 'bg-good/50' : 'bg-edge',
                )}
              />
            )}
            <button
              type="button"
              aria-current={state === 'active' ? 'step' : undefined}
              onClick={() => onGo(tab.id)}
              title={tab.label}
              className={cn(
                'group inline-flex items-center rounded-full border font-semibold transition-colors',
                dense ? 'gap-1 py-0.5 pl-1 pr-2' : 'gap-2 py-1 pl-1.5 pr-3',
                chromeText.xs,
                state === 'active'
                  ? 'border-accent/30 bg-accentbg text-accent'
                  : state === 'done'
                    ? 'border-transparent text-ink2 hover:bg-panel2'
                    : 'border-transparent text-ink3 hover:bg-panel2 hover:text-ink2',
              )}
            >
              <span
                className={cn(
                  'grid shrink-0 place-items-center rounded-full border transition-colors',
                  dense
                    ? 'h-[15px] w-[15px] [&>svg]:h-[9px] [&>svg]:w-[9px]'
                    : 'h-[18px] w-[18px] [&>svg]:h-[11px] [&>svg]:w-[11px]',
                  state === 'active'
                    ? cn(
                        'border-accent bg-accent text-white',
                        dense
                          ? 'shadow-[0_0_0_3px_var(--accent-bg)]'
                          : 'shadow-[0_0_0_4px_var(--accent-bg)]',
                      )
                    : state === 'done'
                      ? 'border-good/50 bg-goodbg text-good'
                      : 'border-edge2 text-ink3',
                )}
              >
                {state === 'done' ? <Check strokeWidth={2.6} /> : <Icon strokeWidth={2} />}
              </span>
              {!compact && <span>{tab.label}</span>}
            </button>
          </div>
        );
      })}

      {hasMore && (
        <div className={cn('shrink-0', dense ? 'ml-0.5' : 'ml-1')}>
          <StudioViewPicker
            stages={moreStages}
            avail={more}
            active={active}
            onGo={onGo}
            compact={compact}
            variants={variants && variants.length > 1 ? variants : undefined}
            activeVariant={activeVariant}
            onSetVariant={onSetVariant}
            triggerLabel="More"
            triggerIcon={MoreHorizontal}
          />
        </div>
      )}
    </nav>
  );
}
