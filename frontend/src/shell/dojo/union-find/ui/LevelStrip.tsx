import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isDojoLevelUnlocked } from '@/store/dojo/dojoProgress';
import { StarRating, type DojoStars } from '@/shell/dojo/ui/shared';
import { LEVELS, LEVEL_IDS } from '../engine/dsu';
import { useBridgeGame } from '../BridgeGameProvider';

export function LevelStrip() {
  const { levelId, progress, selectLevel } = useBridgeGame();

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1.5"
      role="tablist"
      aria-label="Levels"
    >
      {LEVELS.map((level, i) => {
        const unlocked = isDojoLevelUnlocked(LEVEL_IDS, i, progress);
        const saved = progress.levels[level.id];
        const active = level.id === levelId;
        const stars = Math.max(0, Math.min(3, saved?.stars ?? 0)) as DojoStars;

        return (
          <button
            key={level.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={!unlocked}
            onClick={() => selectLevel(level.id)}
            title={unlocked ? level.title : 'Locked — clear the previous level first'}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors',
              active
                ? 'border-accent/40 bg-accentbg text-accent'
                : 'border-edge bg-panel/90 text-ink2',
              unlocked && !active && 'hover:bg-panel2 hover:text-ink',
              !unlocked && 'cursor-not-allowed opacity-50',
            )}
          >
            {unlocked ? <span>{i + 1}</span> : <Lock className="h-3 w-3" aria-label="Locked" />}
            {saved?.completed ? <StarRating stars={stars} /> : null}
          </button>
        );
      })}
    </div>
  );
}
