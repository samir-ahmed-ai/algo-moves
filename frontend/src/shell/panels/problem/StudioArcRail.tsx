import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import type { StudioTab } from '@/shell/study/studioTabs';
import type { OverviewView } from './OverviewViewSwitch';

type StepState = 'done' | 'active' | 'todo';

interface Step {
  key: string;
  label: string;
  state: StepState;
}

function overviewSteps(
  view: OverviewView,
  canAnimate: boolean,
  canRecall: boolean,
  nextLabel?: string,
): Step[] {
  const steps: Step[] = [];
  if (canAnimate) {
    steps.push({ key: 'animate', label: 'Animate', state: view === 'animate' ? 'active' : 'done' });
  }
  if (canRecall) {
    steps.push({ key: 'recall', label: 'Recall', state: view === 'recall' ? 'active' : 'todo' });
  }
  if (nextLabel) {
    steps.push({ key: 'next', label: nextLabel, state: 'todo' });
  }
  return steps;
}

function canonicalSteps(availTabs: StudioTab[], activeTabId: string): Step[] {
  const activeIdx = availTabs.findIndex((t) => t.id === activeTabId);
  return availTabs.map((t, idx) => ({
    key: t.id,
    label: t.label,
    state: idx === activeIdx ? 'active' : idx < activeIdx ? 'done' : 'todo',
  }));
}

/**
 * Compact progress rail for the Learn Studio arc. On the Overview tab it shows the
 * Animate/Recall sub-steps leading into the next canonical tab; everywhere else it
 * shows the canonical tab order with the active tab highlighted.
 */
export function StudioArcRail({
  availTabs,
  activeTabId,
  view,
  canAnimate,
  canRecall,
  nextLabel,
  className,
}: {
  availTabs?: StudioTab[] | undefined;
  activeTabId?: string | undefined;
  view?: OverviewView | undefined;
  canAnimate?: boolean | undefined;
  canRecall?: boolean | undefined;
  nextLabel?: string | undefined;
  className?: string | undefined;
}) {
  const steps =
    view !== undefined
      ? overviewSteps(view, canAnimate !== false, !!canRecall, nextLabel)
      : availTabs && activeTabId
        ? canonicalSteps(availTabs, activeTabId)
        : [];

  if (steps.length === 0) return null;

  return (
    <div className={cn('studio-arc-rail flex flex-wrap items-center gap-0.5', className)}>
      {steps.map((step, idx) => (
        <span key={step.key} className="studio-arc-rail__item flex items-center gap-0.5">
          {idx > 0 && (
            <span
              className={cn('studio-arc-rail__sep mx-0.5 text-ink3/50', chromeText.tight)}
              aria-hidden
            >
              ›
            </span>
          )}
          <span
            className={cn(
              'studio-arc-step inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition-colors',
              chromeText.xs,
              step.state === 'active' &&
                'studio-arc-step--active bg-accentbg text-accent ring-1 ring-accent/20',
              step.state === 'done' && 'studio-arc-step--done text-ink3',
              step.state === 'todo' && 'studio-arc-step--todo text-ink3/50',
            )}
          >
            {step.state === 'done' && (
              <Check className="h-2.5 w-2.5 shrink-0 text-good" strokeWidth={2.5} />
            )}
            {step.state === 'active' && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            )}
            {step.label}
          </span>
        </span>
      ))}
    </div>
  );
}
