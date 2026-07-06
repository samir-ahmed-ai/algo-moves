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

function overviewSteps(view: OverviewView, hasRecall: boolean, nextLabel?: string): Step[] {
  const steps: Step[] = [
    { key: 'animate', label: 'Animate', state: view === 'animate' ? 'active' : 'done' },
  ];
  if (hasRecall) {
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
  hasRecall,
  nextLabel,
  className,
}: {
  availTabs?: StudioTab[];
  activeTabId?: string;
  view?: OverviewView;
  hasRecall?: boolean;
  nextLabel?: string;
  className?: string;
}) {
  const steps =
    view !== undefined
      ? overviewSteps(view, !!hasRecall, nextLabel)
      : availTabs && activeTabId
        ? canonicalSteps(availTabs, activeTabId)
        : [];

  if (steps.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {steps.map((step, idx) => (
        <span key={step.key} className="flex items-center gap-1">
          {idx > 0 && <span className={cn('text-ink3', chromeText.xs)} aria-hidden>›</span>}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-medium',
              chromeText.xs,
              step.state === 'active' && 'bg-accentbg text-accent',
              step.state === 'done' && 'bg-panel2 text-ink2',
              step.state === 'todo' && 'text-ink3',
            )}
          >
            {step.label}
          </span>
        </span>
      ))}
    </div>
  );
}
