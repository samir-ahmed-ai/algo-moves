import { useMemo, useState } from 'react';
import { Boxes, Search } from 'lucide-react';
import {
  catalog,
  getCategoriesForTrack,
  getCategoryById,
  getItemsForCategory,
  getTrackById,
  searchBrowse,
  type Difficulty,
  type TrackId,
} from '../content';
import { useWorkspace } from '@/store/workspace';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';
import { courseIcon } from './courseIcon';
import { Chip, EmptyState, Label, Meter, difficultyTone } from './canvas/nodeui';
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
  const heading = category?.title ?? '';
  const blurb = category?.summary;
  const total = flat.length;
  const mastered = flat.filter((it) => statFor(progress, it.id).mastered).length;
  const easy = flat.filter((it) => it.difficulty === 'Easy').length;
  const med = flat.filter((it) => it.difficulty === 'Medium').length;
  const hard = flat.filter((it) => it.difficulty === 'Hard').length;

  const Icon = courseIcon(category?.icon);
  const gridStyle = {
    backgroundImage:
      'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '16px 16px',
  } as const;

  return (
    <div className="relative h-full overflow-auto p-2 sm:p-3">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.15]" style={gridStyle} />

      <div className="relative">
        <BrowseBreadcrumb trackId={trackId} categoryId={categoryId} onBack={() => setActiveCategoryId(null)} />

        <div className="relative mb-3 flex items-center gap-2 overflow-hidden rounded-lg border border-edge bg-panel px-3 py-2">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.3] [mask-image:radial-gradient(120%_120%_at_0_0,black,transparent)]"
            style={gridStyle}
          />
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md border border-edge2 bg-panel2 text-accent">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div className="relative min-w-0 flex-1">
            <Label className="font-mono tracking-[0.12em]">
              {trackId && getTrackById(trackId)?.title ? `${getTrackById(trackId)!.title} · ` : ''}
              {total} {total === 1 ? 'PROBLEM' : 'PROBLEMS'}
            </Label>
            <h2 className={cn('truncate font-medium text-ink', chromeText.base)}>{heading}</h2>
            {blurb && <p className={cn('mt-0.5 line-clamp-1 text-ink2', chromeText.tight)}>{blurb}</p>}
          </div>
          {total > 0 && (
            <div className="relative ml-auto flex shrink-0 items-center gap-2">
              <div className="flex flex-col items-end gap-1">
                <div className="w-20">
                  <Meter value={mastered} max={total} tone="good" height={6} />
                </div>
                <span className={cn('font-mono tabular-nums text-ink3', chromeText.sm)}>
                  {mastered}/{total} mastered
                </span>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => {
                  const n = d === 'Easy' ? easy : d === 'Medium' ? med : hard;
                  if (n === 0) return null;
                  return (
                    <Chip key={d} tone={difficultyTone(d)} mono className={cn('!px-2 !py-0.5', chromeText.sm)}>
                      {d[0]}·{n}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
  const { setActiveCategoryId, setActiveTrackId, setProblemFocused } = useWorkspace();
  const track = getTrackById(trackId);
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
    <div className="relative h-full overflow-auto p-2 sm:p-3">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.15]" style={gridStyle} />
      <div className="relative">
        <BrowseBreadcrumb trackId={trackId} onBack={() => { setActiveTrackId(null); setProblemFocused(false); }} />
        <div className="relative mb-3 overflow-hidden rounded-lg border border-edge bg-panel px-3 py-2">
          <Label className="font-mono tracking-[0.12em]">PICK A CATEGORY</Label>
          <h2 className={cn('font-medium text-ink', chromeText.base)}>{track?.title ?? 'Browse'}</h2>
          {track?.summary && <p className={cn('mt-0.5 text-ink2', chromeText.tight)}>{track.summary}</p>}
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
            className="w-full rounded-lg border border-edge bg-panel py-2 pl-9 pr-3 text-[14px] text-ink outline-none placeholder:text-ink3 focus:border-accent"
          />
        </div>
        {filteredCategories.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-ink3">No matching categories.</p>
        ) : (
          <CategoryGrid categories={filteredCategories} onPick={(id) => { setActiveCategoryId(id); setProblemFocused(false); }} />
        )}
      </div>
    </div>
  );
}
