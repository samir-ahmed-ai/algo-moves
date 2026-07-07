import { useCallback, useEffect } from 'react';
import { BookMarked, CheckCircle2, ChevronLeft, ChevronRight, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { catalog } from '@/content';
import { chromeText } from '@/shell/chromeUi';
import { isEditableTarget } from '@/lib/utils/keyboard';
import { usePlan } from './PlanContext';
import { useWorkspace } from '@/store/workspace';

export function PlanRunner() {
  const {
    activePlan,
    itemIds,
    completed,
    isRunning,
    runnerIndex,
    stopRun,
    nextItem,
    prevItem,
    toggleComplete,
  } = usePlan();
  const { openProblem } = useWorkspace();

  const currentId = itemIds[runnerIndex] ?? null;
  const currentItem = currentId ? catalog.getItem(currentId) : null;
  const isCompleted = currentId ? completed.has(currentId) : false;
  const total = itemIds.length;

  // Sync: while running, whenever the current item changes, open it. Gated on
  // isRunning so merely loading a plan into the builder never force-opens a problem.
  useEffect(() => {
    if (isRunning && currentId) openProblem(currentId);
  }, [isRunning, currentId, openProblem]);

  const handleNext = useCallback(() => {
    if (runnerIndex < total - 1) nextItem();
  }, [runnerIndex, total, nextItem]);

  const handlePrev = useCallback(() => {
    if (runnerIndex > 0) prevItem();
  }, [runnerIndex, prevItem]);

  const handleToggle = useCallback(() => {
    if (currentId) toggleComplete(currentId);
  }, [currentId, toggleComplete]);

  // Run-mode keyboard shortcuts. Deliberately uses n/p/d to avoid clashing with
  // the workspace's arrow/space/[ ] bindings (see useWorkspaceKeyboard).
  useEffect(() => {
    if (!isRunning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      switch (e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          handleNext();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          handlePrev();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          handleToggle();
          break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRunning, handleNext, handlePrev, handleToggle]);

  if (!isRunning || !activePlan || total === 0) return null;

  const completedCount = itemIds.filter((id) => completed.has(id)).length;
  const pct = Math.round((completedCount / total) * 100);

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-edge bg-panel px-4">
      {/* Plan badge */}
      <div className="flex items-center gap-1.5 text-accent">
        <BookMarked className="h-3.5 w-3.5 shrink-0" />
        <span className={cn('hidden truncate max-w-[120px] font-semibold sm:block', chromeText.sm)}>
          {activePlan.title}
        </span>
      </div>

      <div className="h-4 w-px shrink-0 bg-edge" />

      {/* Prev */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={runnerIndex === 0}
        className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink disabled:opacity-30"
        title="Previous problem (p)"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Current label */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate font-medium text-ink', chromeText.sm)}>
          {currentItem?.title ?? currentId}
        </span>
        <span className={cn('text-ink3', chromeText.xs)}>
          {runnerIndex + 1} / {total}
        </span>
      </div>

      {/* Next */}
      <button
        type="button"
        onClick={handleNext}
        disabled={runnerIndex === total - 1}
        className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink disabled:opacity-30"
        title="Next problem (n)"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="h-4 w-px shrink-0 bg-edge" />

      {/* Mark complete */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
          isCompleted
            ? 'border-good/40 bg-good/10 text-good hover:bg-good/20'
            : 'border-edge text-ink3 hover:border-accent/50 hover:bg-panel2 hover:text-ink',
        )}
        title={isCompleted ? 'Mark as not done (d)' : 'Mark as done (d)'}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Circle className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">{isCompleted ? 'Done' : 'Mark done'}</span>
      </button>

      {/* Progress */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn('text-ink3', chromeText.xs)}>{pct}%</span>
      </div>

      <div className="h-4 w-px shrink-0 bg-edge" />

      {/* Exit runner */}
      <button
        type="button"
        onClick={stopRun}
        className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-ink3 transition hover:bg-panel2 hover:text-ink"
        title="Exit run mode"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
