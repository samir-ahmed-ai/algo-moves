import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isDojoLevelUnlocked } from '@/store/dojo/dojoProgress';
import { StarRating } from '@/shell/dojo/ui/shared';
import { LEVELS, LEVEL_IDS } from '../engine/graph';
import { useTopoGame } from '../TopoGameProvider';

export function LevelStrip() {
  const { levelId, progress, selectLevel } = useTopoGame();

  return (
    <div className="z-10 mt-12 flex shrink-0 flex-wrap items-center justify-center gap-1.5 px-3 min-[860px]:mt-3">
      {LEVELS.map((lvl, i) => {
        const unlocked = isDojoLevelUnlocked(LEVEL_IDS, i, progress);
        const saved = progress.levels[lvl.id];
        const current = lvl.id === levelId;
        const stars = Math.max(0, Math.min(3, saved?.stars ?? 0)) as 0 | 1 | 2 | 3;
        return (
          <button
            key={lvl.id}
            type="button"
            disabled={!unlocked}
            onClick={() => selectLevel(lvl.id)}
            title={unlocked ? lvl.title : `${lvl.title} — locked`}
            aria-label={unlocked ? `Level ${i + 1}: ${lvl.title}` : `Level ${i + 1} locked`}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              current ? 'border-accent bg-accentbg text-accent' : 'border-edge bg-panel text-ink2',
              unlocked && !current && 'hover:bg-panel2 hover:text-ink',
              !unlocked && 'opacity-50',
            )}
          >
            <span className="tabular-nums">{i + 1}</span>
            {!unlocked ? (
              <Lock className="h-3 w-3" aria-hidden />
            ) : saved?.completed ? (
              <StarRating stars={stars} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
