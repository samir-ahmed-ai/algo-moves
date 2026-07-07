import { ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { DojoBadge, DojoBtn, DojoKbd, StarRating, starsForMoves } from '@/shell/dojo/ui/shared';
import { getNode } from '../engine/signal';
import { useSignalGame } from '../SignalGameProvider';

const STAR_TITLES: Record<1 | 2 | 3, string> = {
  3: 'Perfect relay!',
  2: 'Signal delivered',
  1: 'Level complete',
};

export function CompleteCard() {
  const { complete, level, state, path, actions, progress, nextId, selectLevel, resetLevel } =
    useSignalGame();
  if (!complete) return null;

  const stars = starsForMoves(actions, level.par);
  const best = progress.levels[level.id]?.bestMoves;
  const route = path.map((k) => getNode(level, k)?.name ?? k).join(' → ');
  const total = state.dist[level.target];

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
        <p className="mt-1.5 text-center text-sm text-ink2">
          Shortest route: <span className="font-semibold text-accent">{route}</span>
          {' — '}
          <span className="font-semibold tabular-nums text-ink">total {total}</span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 tabular-nums">
          <DojoBadge tone="accent">{actions} actions</DojoBadge>
          <DojoBadge tone="muted">par {level.par}</DojoBadge>
          {best != null ? <DojoBadge tone="good">best {best}</DojoBadge> : null}
        </div>
        {stars < 3 ? (
          <p className="mt-2.5 text-center text-sm text-ink2">
            Finish in {level.par} actions or fewer for three stars — scan the labels, settle the
            smallest tentative distance every time, and never guess.
          </p>
        ) : null}
        {!nextId ? (
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-sm text-good">
            <Trophy className="h-4 w-4 shrink-0" aria-hidden />
            Dojo complete — the closest-first settle is in your hands now!
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {nextId ? (
            <DojoBtn
              variant="accent"
              className="vim-overlay-cta"
              onClick={() => selectLevel(nextId)}
              autoFocus
            >
              Next level
              <ArrowRight className="h-3.5 w-3.5" />
              <DojoKbd className="vim-overlay-cta__kbd">↵</DojoKbd>
            </DojoBtn>
          ) : null}
          <DojoBtn
            variant={nextId ? 'ghost' : 'accent'}
            className="vim-overlay-cta"
            onClick={() => resetLevel()}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
            <DojoKbd className="vim-overlay-cta__kbd">r</DojoKbd>
          </DojoBtn>
        </div>
      </div>
    </div>
  );
}
