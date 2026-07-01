import { useVimGame } from '../../canvas/VimGameProvider';
import { ReferenceSection } from '../ReferenceSection';
import { VimProgressBar } from '../vimUi';
import { cn } from '../../../../lib/cn';
import { VIM_LEVEL_IDS, chaptersFromLevels, VIM_LEVELS } from '../../engine';

export function ProgressPanelContent({ compact = false }: { compact?: boolean }) {
  const { progress, completedCount } = useVimGame();
  const chapters = chaptersFromLevels(VIM_LEVELS);

  return (
    <>
      <p className="text-base font-semibold tabular-nums text-ink">
        {completedCount}
        <span className="text-sm font-normal text-ink3">/{VIM_LEVEL_IDS.length}</span>
      </p>
      <VimProgressBar value={completedCount} max={VIM_LEVEL_IDS.length} className="mt-1.5" />
      {!compact ? (
        <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {chapters.map(({ chapter, chapterNum, levels }) => {
            const done = levels.filter((l) => progress.levels[l.id]?.completed).length;
            return (
              <li key={chapterNum}>
                <div className="mb-0.5 flex items-center justify-between text-[10px] text-ink2">
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
