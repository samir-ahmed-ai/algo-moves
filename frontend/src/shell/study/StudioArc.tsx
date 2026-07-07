import { Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '../chromeUi';
import { StudioViewPicker } from './StudioViewPicker';
import type { StudioGroupId, StudioTab } from './studioTabs';

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
        'studio-arc nodrag flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden',
        bare ? 'rounded-full' : 'border-b border-edge bg-panel/60',
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
                  'mx-0.5 h-px w-4 rounded-full sm:w-6',
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
                'group inline-flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 font-semibold transition-colors',
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
                  'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors [&>svg]:h-[11px] [&>svg]:w-[11px]',
                  state === 'active'
                    ? 'border-accent bg-accent text-white shadow-[0_0_0_4px_var(--accent-bg)]'
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
        <div className="ml-1 shrink-0">
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
