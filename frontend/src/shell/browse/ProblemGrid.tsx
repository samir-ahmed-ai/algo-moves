import { useMemo, useState } from 'react';
import { BookmarkPlus, CheckCircle2, Trophy } from 'lucide-react';
import type { Difficulty, Item } from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';
import { Chip, Meter, Pill, difficultyTone } from '@/design/components';
import { chromeText } from '../chromeUi';
import { glyphFor } from '../../content/problemShape';
import { useProblemDragSource } from '@/hooks/useProblemDragSource';
import { difficultyTint } from '../../content/difficultyTint';
import { usePlan } from '@/shell/plans/PlanContext';

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];

const gridStyle = {
  backgroundImage:
    'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
  backgroundSize: '16px 16px',
} as const;

function ProblemCard({
  item,
  index,
  progress,
  onOpen,
}: {
  item: Item;
  index: number;
  progress: ReturnType<typeof useProgress>;
  onOpen: (id: string) => void;
}) {
  const isMastered = statFor(progress, item.id).mastered;
  const railColor = difficultyTint(item.difficulty, 'var(--border-strong)');
  const glyph = glyphFor(item);
  const delay = `${Math.min(index, 14) * 24}ms`;
  const st = statFor(progress, item.id);
  const pct = st.attempts > 0 ? Math.round((st.correct / st.attempts) * 100) : 0;
  const drag = useProblemDragSource(item.id);

  const { isBuilding, hasItem, addItem, removeItem } = usePlan();
  const inPlan = isBuilding && hasItem(item.id);

  const handlePlanToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inPlan) removeItem(item.id);
    else addItem(item.id);
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      {...drag}
      aria-label={`Open ${item.title}, ${item.difficulty ?? 'unrated'}${isMastered ? ', mastered' : ''}`}
      style={{ animationDelay: delay }}
      className={cn(
        'bp-note group relative flex min-h-[160px] flex-col items-center overflow-hidden rounded-lg border border-edge bg-panel pt-[3px] text-center transition-all hover:border-accent/60 hover:bg-panel2 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        isMastered && 'border-good/40',
        isBuilding && inPlan && 'border-accent/60 ring-1 ring-accent/20',
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: railColor }}
      />
      {isMastered && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--accent-bg)] to-transparent opacity-50"
          />
          <Trophy className="absolute right-2 top-2.5 h-3.5 w-3.5 text-good" aria-hidden />
        </>
      )}

      {/* Add-to-plan toggle — only visible when a plan is being built */}
      {isBuilding && (
        <button
          type="button"
          onClick={handlePlanToggle}
          aria-label={inPlan ? `Remove ${item.title} from plan` : `Add ${item.title} to plan`}
          className={cn(
            'absolute left-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-md border transition-all',
            inPlan
              ? 'border-accent/60 bg-accent text-white shadow-sm'
              : 'border-edge bg-panel/80 text-ink3 opacity-0 backdrop-blur-sm group-hover:opacity-100 hover:border-accent/50 hover:bg-panel hover:text-accent',
          )}
        >
          {inPlan ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <BookmarkPlus className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute left-1.5 top-2 h-2 w-2 border-l border-t border-edge2 opacity-60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1.5 right-1.5 h-2 w-2 border-b border-r border-edge2 opacity-60"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-3 pb-3 pt-4">
        <div className="relative grid flex-1 place-items-center">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-1 opacity-[0.1]"
            style={{ ...gridStyle, backgroundSize: '10px 10px' }}
          />
          <svg
            viewBox="0 0 48 48"
            className="relative h-[60px] w-[60px] text-ink2 transition-all duration-200 group-hover:scale-110 group-hover:text-accent group-hover:drop-shadow-[0_0_8px_var(--accent-bg)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: glyph }}
          />
        </div>

        <div
          className={cn(
            'mt-2 line-clamp-1 font-medium leading-snug text-ink2 group-hover:text-ink',
            chromeText.base,
          )}
        >
          {item.title}
        </div>
        {item.summary && (
          <p className={cn('mt-1 line-clamp-2 leading-snug text-ink3', chromeText.sm)}>
            {item.summary}
          </p>
        )}
        {item.difficulty && (
          <Chip
            tone={difficultyTone(item.difficulty)}
            mono
            className={cn('mt-1 !px-1 !py-px', chromeText['2xs'])}
          >
            {item.difficulty}
          </Chip>
        )}
        {st.attempts > 0 && (
          <div className="mt-1.5 w-full px-1">
            <Meter
              value={st.correct}
              max={st.attempts}
              tone={isMastered ? 'good' : 'default'}
              height={4}
            />
            <div className="mt-0.5">
              <Pill>
                {pct}% · {st.attempts} tries
              </Pill>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export function ProblemGrid({
  items,
  onOpen,
  showFilters = true,
}: {
  items: Item[];
  onOpen: (id: string) => void;
  showFilters?: boolean;
}) {
  const progress = useProgress();
  const [diffFilter, setDiffFilter] = useState<Set<Difficulty>>(new Set());

  const filtered = useMemo(() => {
    if (diffFilter.size === 0) return items;
    return items.filter((it) => it.difficulty && diffFilter.has(it.difficulty));
  }, [items, diffFilter]);

  const toggleDiff = (d: Difficulty) => {
    setDiffFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  return (
    <div>
      {showFilters && (
        <div className="mb-2 flex flex-wrap items-center gap-[var(--gap)]">
          <span className={cn('mr-0.5 text-ink3', chromeText.sm)}>Filter:</span>
          {DIFFS.map((d) => {
            const active = diffFilter.has(d);
            const count = items.filter((it) => it.difficulty === d).length;
            if (count === 0) return null;
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDiff(d)}
                className={cn('transition-opacity', !active && diffFilter.size > 0 && 'opacity-40')}
              >
                <Chip
                  tone={difficultyTone(d)}
                  mono
                  className={cn('!px-1.5 !py-px cursor-pointer', chromeText.xs)}
                >
                  {d} · {count}
                </Chip>
              </button>
            );
          })}
          {diffFilter.size > 0 && (
            <button
              type="button"
              onClick={() => setDiffFilter(new Set())}
              className={cn('text-accent hover:underline', chromeText.sm)}
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="browse-problem-grid grid gap-[var(--gap)]">
        {filtered.map((item, i) => (
          <ProblemCard key={item.id} item={item} index={i} progress={progress} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
