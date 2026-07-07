import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LessonSection } from '../LessonSection';
import { StarRating } from '../StarRating';
import { VimBadge } from '../vimUi';
import {
  VIM_LEVELS,
  VIM_LEVEL_IDS,
  chaptersFromLevels,
  isLevelUnlocked,
  starsForMoves,
} from '../../engine';

import { useVimGame } from '../../canvas/VimGameProvider';
export function LevelPanelContent({ compact = false }: { compact?: boolean }) {
  const { levelId, progress, selectLevel } = useVimGame();
  const chapters = chaptersFromLevels(VIM_LEVELS);

  return (
    <>
      <div className={cn('overflow-y-auto pr-0.5', compact ? 'max-h-32' : 'max-h-none flex-1')}>
        {chapters.map(({ chapter, chapterNum, levels }) => (
          <div key={chapterNum} className="mb-2 last:mb-0">
            <VimBadge tone="muted" className="mb-1">
              {chapterNum}. {chapter}
            </VimBadge>
            <ul className="mt-1 flex flex-col gap-0.5">
              {levels.map((l) => {
                const idx = VIM_LEVEL_IDS.indexOf(l.id);
                const unlocked = isLevelUnlocked(VIM_LEVEL_IDS, idx, progress);
                const done = progress.levels[l.id]?.completed;
                const best = progress.levels[l.id]?.bestMoves;
                const active = l.id === levelId;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => unlocked && selectLevel(l.id)}
                      className={cn(
                        'flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[length:var(--fs-tight)] transition-colors',
                        active
                          ? 'bg-accentbg font-medium text-ink ring-1 ring-accent/25'
                          : 'text-ink2 hover:bg-panel2',
                        !unlocked && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      {!unlocked ? (
                        <Lock className="h-2.5 w-2.5 shrink-0" />
                      ) : done ? (
                        <Check className="h-2.5 w-2.5 shrink-0 text-good" />
                      ) : (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-edge" />
                      )}
                      <span className="truncate">{l.title}</span>
                      {done && best != null ? (
                        <StarRating
                          stars={starsForMoves(best, l.parMoves)}
                          className="ml-auto shrink-0"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {!compact ? (
        <div className="mt-2 shrink-0 border-t border-edge/40 pt-2">
          <LessonSection />
        </div>
      ) : null}
    </>
  );
}
