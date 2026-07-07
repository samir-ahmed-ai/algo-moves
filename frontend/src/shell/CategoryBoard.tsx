import { useMemo, useState } from 'react';
import { Boxes, Search } from 'lucide-react';
import {
  catalog,
  getCategoriesForTrack,
  getCategoryById,
  getItemsForCategory,
  searchBrowse,
  type Difficulty,
  type TrackId,
} from '../content';
import { EmptyState } from '@/shell/canvas';
import { useWorkspace } from '@/store/workspace';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';
import { Chip, Meter, difficultyTone } from '@/design/components';
import { chromeText } from './chromeUi';
import { ProblemGrid } from './browse/ProblemGrid';
import { BrowseBreadcrumb } from './browse/BrowseBreadcrumb';
import { CategoryGrid } from './browse/CategoryGrid';

/* ------------------------------------------------------------------ board */

export function CategoryBoard({
  categoryId,
  trackId,
}: {
  categoryId: string;
  trackId?: TrackId | null;
}) {
  const { openProblem, setActiveCategoryId } = useWorkspace();
  const progress = useProgress();

  const openItem = (id: string) => {
    openProblem(id);
  };

  const category = getCategoryById(categoryId);
  const flat = getItemsForCategory(categoryId, catalog);
  const total = flat.length;
  const mastered = flat.filter((it) => statFor(progress, it.id).mastered).length;
  const attempted = flat.filter((it) => statFor(progress, it.id).attempts > 0).length;
  const onStreak = flat.filter((it) => {
    const s = statFor(progress, it.id);
    return s.streak >= 1 && !s.mastered;
  }).length;
  const easy = flat.filter((it) => it.difficulty === 'Easy').length;
  const med = flat.filter((it) => it.difficulty === 'Medium').length;
  const hard = flat.filter((it) => it.difficulty === 'Hard').length;

  const gridStyle = {
    backgroundImage:
      'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '16px 16px',
  } as const;

  return (
    <div className="relative h-full overflow-auto p-[var(--pad)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={gridStyle}
      />

      <div className="relative">
        <BrowseBreadcrumb
          trackId={trackId}
          categoryId={categoryId}
          description={category?.description}
          onBack={() => setActiveCategoryId(null)}
          trailing={
            total > 0 ? (
              <div className="relative ml-auto flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex w-24 flex-col gap-0.5">
                    <Meter value={mastered} max={total} tone="good" height={4} />
                    <Meter value={attempted} max={total} tone="accent" height={4} />
                  </div>
                  <span className={cn('font-mono tabular-nums text-ink3', chromeText.sm)}>
                    {mastered}/{total} mastered · {attempted} tried
                    {onStreak > 0 ? ` · ${onStreak} on streak` : ''}
                  </span>
                </div>
                <div className="hidden items-center gap-1 sm:flex">
                  {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => {
                    const n = d === 'Easy' ? easy : d === 'Medium' ? med : hard;
                    if (n === 0) return null;
                    return (
                      <Chip
                        key={d}
                        tone={difficultyTone(d)}
                        mono
                        className={cn('!px-1.5 !py-px', chromeText.xs)}
                      >
                        {d[0]}·{n}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            ) : undefined
          }
        />

        {total === 0 ? (
          <div className="grid h-[60vh] place-items-center">
            <EmptyState
              icon={<Boxes className="h-4 w-4" />}
              title="No problems on this sheet yet"
              hint="Items added to this category will appear here as schematic tiles."
            />
          </div>
        ) : (
          <ProblemGrid items={flat.filter((i) => i.pluginId)} onOpen={openItem} />
        )}
      </div>
    </div>
  );
}

/** Track-level category picker shown in the workspace main pane. */
export function TrackCategoryBoard({ trackId }: { trackId: TrackId }) {
  const { setActiveCategoryId, setProblemFocused, goHome } = useWorkspace();
  const [query, setQuery] = useState('');

  const trackCategories = useMemo(() => getCategoriesForTrack(trackId), [trackId]);
  const filteredCategories = useMemo(() => {
    const q = query.trim();
    if (!q) return trackCategories;
    const trackIds = new Set(trackCategories.map((c) => c.id));
    return searchBrowse(q, catalog).categories.filter((c) => trackIds.has(c.id));
  }, [query, trackCategories]);

  const gridStyle = {
    backgroundImage:
      'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '16px 16px',
  } as const;

  return (
    <div className="relative h-full overflow-auto p-[var(--pad)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={gridStyle}
      />
      <div className="relative">
        <BrowseBreadcrumb trackId={trackId} backTitle="Back to home" onBack={goHome} />
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
            className="w-full rounded-lg border border-edge bg-panel py-2 pl-9 pr-3 text-[length:var(--fs)] text-ink outline-none placeholder:text-ink3 focus:border-accent"
          />
        </div>
        {filteredCategories.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-ink3">No matching categories.</p>
        ) : (
          <CategoryGrid
            categories={filteredCategories}
            onPick={(id) => {
              setActiveCategoryId(id);
              setProblemFocused(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
