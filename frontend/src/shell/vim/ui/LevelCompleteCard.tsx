import { ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { starsForMoves } from '../engine';
import { StarRating } from './StarRating';
import { VimBadge, VimBtn, VimKbd } from './vimUi';
import { useVimGame } from '../canvas/VimGameProvider';

const STAR_TITLES: Record<1 | 2 | 3, string> = {
  3: 'Perfect run!',
  2: 'Nicely done',
  1: 'Level complete',
};

export function LevelCompleteCard() {
  const { complete, level, moves, progress, nextId, selectLevel, resetLevel } = useVimGame();
  if (!complete) return null;

  const stars = starsForMoves(moves, level.parMoves);
  const best = progress.levels[level.id]?.bestMoves;

  return (
    <div className="vim-overlay">
      <div
        className="vim-overlay-card vim-overlay-card--complete"
        role="dialog"
        aria-label="Level complete"
      >
        <StarRating stars={stars} size="lg" animate className="justify-center" />
        <h2 className="mt-2 text-center text-xl font-semibold tracking-tight text-ink">
          {STAR_TITLES[stars]}
        </h2>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 tabular-nums">
          <VimBadge tone="accent">{moves} moves</VimBadge>
          {level.parMoves != null ? <VimBadge tone="muted">par {level.parMoves}</VimBadge> : null}
          {best != null ? <VimBadge tone="good">best {best}</VimBadge> : null}
        </div>
        {stars < 3 && level.parMoves != null ? (
          <p className="mt-2.5 text-center text-sm text-ink2">
            Finish in {level.parMoves} moves or fewer for three stars.
          </p>
        ) : null}
        {!nextId ? (
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-sm text-good">
            <Trophy className="h-4 w-4 shrink-0" aria-hidden />
            Dojo complete — you speak Vim!
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {nextId ? (
            <VimBtn
              variant="accent"
              className="vim-overlay-cta"
              onClick={() => selectLevel(nextId)}
              autoFocus
            >
              Next level
              <ArrowRight className="h-3.5 w-3.5" />
              <VimKbd className="vim-overlay-cta__kbd">↵</VimKbd>
            </VimBtn>
          ) : null}
          <VimBtn
            variant={nextId ? 'ghost' : 'accent'}
            className="vim-overlay-cta"
            onClick={() => resetLevel()}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
            <VimKbd className="vim-overlay-cta__kbd">r</VimKbd>
          </VimBtn>
        </div>
      </div>
    </div>
  );
}
