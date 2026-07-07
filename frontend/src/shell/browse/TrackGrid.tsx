import {
  catalog,
  getCategoriesForTrack,
  getItemsForCategory,
  getTracks,
  type TrackId,
} from '../../content';
import { useProgress, statFor } from '@/store/persistence';
import { cn } from '@/lib/utils/cn';
import { courseIcon } from '../courseIcon';
import { chromeText } from '../chromeUi';
import { Meter } from '@/design/components';

export function TrackGrid({ onPick }: { onPick: (trackId: TrackId) => void }) {
  const progress = useProgress();
  const tracks = getTracks();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tracks.map((track) => {
        const categories = getCategoriesForTrack(track.id);
        const problems = categories.flatMap((c) => getItemsForCategory(c.id, catalog));
        const seen = new Set<string>();
        const unique = problems.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        const mastered = unique.filter((i) => statFor(progress, i.id).mastered).length;
        const Icon = courseIcon(track.icon);

        return (
          <button
            key={track.id}
            type="button"
            onClick={() => onPick(track.id)}
            className="group flex flex-col gap-3 rounded-[var(--radius)] border border-edge bg-panel/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-panel hover:shadow-[var(--shadow-lg)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-edge bg-panel2 text-accent transition-colors group-hover:border-accent/40 [&>svg]:h-5 [&>svg]:w-5">
              <Icon />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className={cn('font-semibold text-ink', chromeText.base)}>{track.title}</h3>
              <p className={cn('mt-0.5 line-clamp-2 text-ink3', chromeText.sm)}>{track.summary}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Meter value={mastered} max={Math.max(unique.length, 1)} tone="good" height={5} />
              </div>
              <span className={cn('shrink-0 font-mono tabular-nums text-ink3', chromeText.xs)}>
                {unique.length}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
