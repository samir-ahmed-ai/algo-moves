import { BookMarked, CheckCircle2, Circle, ExternalLink, X } from 'lucide-react';
import { catalog } from '@/content';
import { Chip } from '@/design/components';
import { difficultyTone } from '@/design/tone';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { usePlan } from './PlanContext';
import { useWorkspace } from '@/store/workspace';

export function PlanProblemsTable() {
  const { itemIds, completed, toggleComplete, removeItem } = usePlan();
  const { openProblem } = useWorkspace();

  if (itemIds.length === 0) {
    return (
      <div className="plan-problems-table__empty flex flex-col items-center gap-3 py-12 text-center">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-edge bg-panel2 text-ink3">
          <BookMarked className="h-5 w-5" />
        </div>
        <p className={cn('text-ink2', chromeText.base)}>No problems bookmarked yet</p>
        <p className={cn('text-ink3', chromeText.sm)}>
          Use <strong className="font-medium text-ink2">Browse to add problems</strong> below to
          pick from any track.
        </p>
      </div>
    );
  }

  return (
    <div className="plan-problems-table w-full overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-edge">
            <th
              scope="col"
              className={cn(
                'plan-problems-table__th w-8 py-2 pr-3 text-right font-medium text-ink3',
                chromeText.xs,
              )}
            >
              #
            </th>
            <th
              scope="col"
              className={cn(
                'plan-problems-table__th py-2 pr-3 font-medium text-ink3',
                chromeText.xs,
              )}
            >
              Problem
            </th>
            <th
              scope="col"
              className={cn(
                'plan-problems-table__th hidden py-2 pr-3 font-medium text-ink3 sm:table-cell',
                chromeText.xs,
              )}
            >
              Difficulty
            </th>
            <th
              scope="col"
              className={cn(
                'plan-problems-table__th w-20 py-2 pr-3 text-center font-medium text-ink3',
                chromeText.xs,
              )}
            >
              Done
            </th>
            <th scope="col" className="plan-problems-table__th w-14 py-2" />
          </tr>
        </thead>
        <tbody>
          {itemIds.map((id, i) => {
            const item = catalog.getItem(id);
            const isDone = completed.has(id);

            return (
              <tr
                key={id}
                className={cn(
                  'plan-problems-table__row group border-b border-edge/50 transition-colors last:border-0',
                  'hover:bg-panel2/60',
                  isDone && 'opacity-60',
                )}
              >
                {/* Position */}
                <td
                  className={cn(
                    'plan-problems-table__cell py-2.5 pr-3 text-right tabular-nums text-ink3',
                    chromeText.xs,
                  )}
                >
                  {i + 1}
                </td>

                {/* Title + open button */}
                <td className="plan-problems-table__cell py-2.5 pr-3">
                  <button
                    type="button"
                    onClick={() => openProblem(id)}
                    className={cn(
                      'group/title flex items-center gap-1.5 text-left text-ink transition-colors hover:text-accent',
                      chromeText.sm,
                      isDone && 'line-through text-ink3',
                    )}
                    title={`Open ${item?.title ?? id}`}
                  >
                    <span className="truncate">{item?.title ?? id}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-60" />
                  </button>
                </td>

                {/* Difficulty */}
                <td className="plan-problems-table__cell hidden py-2.5 pr-3 sm:table-cell">
                  {item?.difficulty ? (
                    <Chip tone={difficultyTone(item.difficulty)} icon={null}>
                      {item.difficulty}
                    </Chip>
                  ) : (
                    <span className={cn('text-ink3', chromeText.xs)}>—</span>
                  )}
                </td>

                {/* Done toggle */}
                <td className="plan-problems-table__cell py-2.5 pr-3 text-center">
                  <button
                    type="button"
                    onClick={() => toggleComplete(id)}
                    className="rounded-full text-ink3 transition-colors hover:text-good"
                    title={isDone ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-good" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                </td>

                {/* Remove */}
                <td className="plan-problems-table__cell py-2.5">
                  <button
                    type="button"
                    onClick={() => removeItem(id)}
                    className="rounded-full p-1 text-ink3 opacity-0 transition hover:bg-panel hover:text-bad group-hover:opacity-100"
                    title="Remove from plan"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
