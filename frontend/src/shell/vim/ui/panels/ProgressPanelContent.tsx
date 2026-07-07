import { Star } from 'lucide-react';
import { ReferenceSection } from '../ReferenceSection';
import { VimProgressBar } from '../vimUi';
import { cn } from '@/lib/utils/cn';
import { VIM_LEVEL_IDS, chaptersFromLevels, starsForMoves, VIM_LEVELS } from '../../engine';

import { useVimGame } from '../../canvas/VimGameProvider';
export function ProgressPanelContent({ compact = false }: { compact?: boolean }) {
  const { progress, completedCount } = useVimGame();
  const chapters = chaptersFromLevels(VIM_LEVELS);
  const totalStars = VIM_LEVELS.reduce((sum, l) => {
    const p = progress.levels[l.id];
    return p?.completed && p.bestMoves != null ? sum + starsForMoves(p.bestMoves, l.parMoves) : sum;
  }, 0);

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-semibold tabular-nums text-ink">
          {completedCount}
          <span className="text-sm font-normal text-ink3">/{VIM_LEVEL_IDS.length}</span>
        </p>
        <p className="flex items-center gap-1 text-[length:var(--fs-2xs)] tabular-nums text-ink3">
          <Star className="h-3 w-3 fill-current text-[var(--warn,#eab308)]" aria-hidden />
          {totalStars}/{VIM_LEVELS.length * 3}
        </p>
      </div>
      <VimProgressBar value={completedCount} max={VIM_LEVEL_IDS.length} className="mt-1.5" />
      {!compact ? (
        <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {chapters.map(({ chapter, chapterNum, levels }) => {
            const done = levels.filter((l) => progress.levels[l.id]?.completed).length;
            return (
              <li key={chapterNum}>
                <div className="mb-0.5 flex items-center justify-between text-[length:var(--fs-2xs)] text-ink2">
                  <span className="truncate">{chapter}</span>
                  <span className="tabular-nums text-ink3">
                    {done}/{levels.length}
                  </span>
                </div>
                <VimProgressBar value={done} max={levels.length} />
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className={cn('shrink-0 border-t border-edge/40 pt-2', compact ? 'mt-1.5' : 'mt-2')}>
        <ReferenceSection />
      </div>
    </>
  );
}
