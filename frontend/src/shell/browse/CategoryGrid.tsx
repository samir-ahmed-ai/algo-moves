import {
  catalog,
  getCategoriesForTrack,
  getItemsForCategory,
  type BrowseCategory,
  type TrackId,
} from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';
import { courseIcon } from '../courseIcon';
import { chromeText } from '../chromeUi';
import { Meter } from '@/design/components';

export function CategoryGrid({
  trackId,
  categories: categoriesProp,
  onPick,
}: {
  trackId?: TrackId;
  categories?: BrowseCategory[];
  onPick: (categoryId: string) => void;
}) {
  const progress = useProgress();
  const categories = categoriesProp ?? (trackId ? getCategoriesForTrack(trackId) : []);

  const gridStyle = {
    backgroundImage:
      'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)',
    backgroundSize: '16px 16px',
  } as const;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const problems = getItemsForCategory(cat.id, catalog);
        if (problems.length === 0) return null;

        const mastered = problems.filter((i) => statFor(progress, i.id).mastered).length;
        const Icon = courseIcon(cat.icon);

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onPick(cat.id)}
            className="group relative flex min-h-[120px] flex-col gap-2 overflow-hidden rounded-lg border border-edge bg-panel p-4 text-left transition-all hover:border-accent/60 hover:bg-panel2 hover:shadow-md"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={gridStyle}
            />
            <div className="relative flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-edge bg-panel2 text-accent transition-colors group-hover:border-accent/40">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className={cn('font-semibold text-ink', chromeText.base)}>{cat.title}</h3>
                {cat.summary && (
                  <p className={cn('mt-0.5 line-clamp-2 text-ink3', chromeText.sm)}>
                    {cat.summary}
                  </p>
                )}
              </div>
            </div>
            <div className="relative mt-auto flex items-center gap-2">
              <div className="flex-1">
                <Meter value={mastered} max={Math.max(problems.length, 1)} tone="good" height={4} />
              </div>
              <span className={cn('shrink-0 font-mono tabular-nums text-ink3', chromeText.xs)}>
                {mastered}/{problems.length}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
