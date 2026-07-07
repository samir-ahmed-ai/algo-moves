import {
  Suspense,
  lazy,
  useEffect,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { Home, Lock, Star, Swords } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import {
  DOJO_NAVIGATE_EVENT,
  parseDojoHash,
  writeDojoHash,
  type DojoHashTarget,
} from '@/lib/navigation';
import { getDojoProgressStore, dojoStarTotal, type DojoProgress } from '@/store/dojo/dojoProgress';
import { useVimProgress } from '@/store/vim/vimProgress';
import { VIM_LEVELS, starsForMoves } from '@/shell/vim/engine/levels';
import { DojoProgressBar } from './ui/shared';
import { DOJO_GAMES, type DojoGameMeta } from './registry';

const GAME_PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  backtrack: lazy(() =>
    import('./backtrack/BacktrackDojoPage').then((m) => ({ default: m.BacktrackDojoPage })),
  ),
  toposort: lazy(() =>
    import('./toposort/TopoSortDojoPage').then((m) => ({ default: m.TopoSortDojoPage })),
  ),
  'binary-search': lazy(() =>
    import('./binary-search/BinarySearchDojoPage').then((m) => ({
      default: m.BinarySearchDojoPage,
    })),
  ),
  'two-pointers': lazy(() =>
    import('./two-pointers/TwoPointersDojoPage').then((m) => ({ default: m.TwoPointersDojoPage })),
  ),
  'sliding-window': lazy(() =>
    import('./sliding-window/SlidingWindowDojoPage').then((m) => ({
      default: m.SlidingWindowDojoPage,
    })),
  ),
  'bfs-flood': lazy(() =>
    import('./bfs-flood/BfsFloodDojoPage').then((m) => ({ default: m.BfsFloodDojoPage })),
  ),
  heap: lazy(() => import('./heap/HeapDojoPage').then((m) => ({ default: m.HeapDojoPage }))),
  'dp-coins': lazy(() =>
    import('./dp-coins/DpCoinsDojoPage').then((m) => ({ default: m.DpCoinsDojoPage })),
  ),
  'union-find': lazy(() =>
    import('./union-find/UnionFindDojoPage').then((m) => ({ default: m.UnionFindDojoPage })),
  ),
  'mono-stack': lazy(() =>
    import('./mono-stack/MonoStackDojoPage').then((m) => ({ default: m.MonoStackDojoPage })),
  ),
  'greedy-intervals': lazy(() =>
    import('./greedy-intervals/GreedyIntervalsDojoPage').then((m) => ({
      default: m.GreedyIntervalsDojoPage,
    })),
  ),
  dijkstra: lazy(() =>
    import('./dijkstra/DijkstraDojoPage').then((m) => ({ default: m.DijkstraDojoPage })),
  ),
};

function readTarget(): DojoHashTarget {
  if (typeof location === 'undefined') return {};
  return parseDojoHash(location.hash, location.pathname) ?? {};
}

function useDojoTarget(): DojoHashTarget {
  const [target, setTarget] = useState<DojoHashTarget>(readTarget);
  useEffect(() => {
    const sync = () => setTarget(readTarget());
    window.addEventListener(DOJO_NAVIGATE_EVENT, sync);
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener(DOJO_NAVIGATE_EVENT, sync);
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  return target;
}

function vimStats(progress: ReturnType<typeof useVimProgress>) {
  let completed = 0;
  let stars = 0;
  for (const level of VIM_LEVELS) {
    const p = progress.levels[level.id];
    if (!p?.completed) continue;
    completed += 1;
    if (p.bestMoves != null) stars += starsForMoves(p.bestMoves, level.parMoves);
  }
  return { completed, stars };
}

function DojoGameCard({
  game,
  completed,
  stars,
  onOpen,
}: {
  game: DojoGameMeta;
  completed: number;
  stars: number;
  onOpen: () => void;
}) {
  const soon = game.status === 'soon';
  const Icon = game.icon;

  return (
    <button
      type="button"
      disabled={soon}
      onClick={onOpen}
      className={cn(
        'dojo-card group text-left shadow-theme-sm transition hover:-translate-y-0.5 hover:shadow-theme-md',
        soon && 'dojo-card--soon',
      )}
      aria-label={soon ? `${game.title} — coming soon` : `Open ${game.title}`}
    >
      <div className="flex items-start gap-3">
        <span
          className="dojo-card__icon"
          style={{ background: `linear-gradient(135deg, ${game.c1}, ${game.c2})` }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{game.title}</p>
          <p className="truncate text-[length:var(--fs-2xs)] text-ink3">{game.tagline}</p>
        </div>
        {soon ? <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink3" aria-hidden /> : null}
      </div>
      <p className="dojo-card__concept">{game.concept}</p>
      {soon ? (
        <p className="mt-auto pt-3 text-[length:var(--fs-2xs)] font-medium uppercase tracking-wide text-ink3">
          Coming soon
        </p>
      ) : (
        <div className="mt-auto pt-3">
          <div className="mb-1 flex items-center justify-between text-[length:var(--fs-2xs)] tabular-nums text-ink3">
            <span>
              {completed}/{game.levelCount} levels
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-current text-[var(--warn,#eab308)]" aria-hidden />
              {stars}/{game.levelCount * 3}
            </span>
          </div>
          <DojoProgressBar value={completed} max={game.levelCount} />
        </div>
      )}
    </button>
  );
}

function LiveDojoCard({ game, onOpen }: { game: DojoGameMeta; onOpen: () => void }) {
  const progress: DojoProgress = getDojoProgressStore(game.id).use();
  const completed = Object.values(progress.levels).filter((l) => l.completed).length;
  return (
    <DojoGameCard
      game={game}
      completed={completed}
      stars={dojoStarTotal(progress)}
      onOpen={onOpen}
    />
  );
}

function DojoHubGrid() {
  const { goHome, enterVim, enterDojo } = useWorkspace();
  const vimProgress = useVimProgress();
  const vim = vimStats(vimProgress);

  return (
    <div className="dojo-hub relative flex h-full flex-col overflow-y-auto">
      <header className="mx-auto w-full max-w-4xl px-4 pb-2 pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Home"
            aria-label="Return to landing page"
            onClick={goHome}
            className="vim-floating-home grid h-9 w-9 shrink-0 place-items-center rounded-full border border-edge bg-[var(--surface-glass)] text-ink3 shadow-theme-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-panel2 hover:text-ink hover:shadow-theme-md"
          >
            <Home className="h-4 w-4" />
          </button>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-[var(--accent-contrast)] shadow-theme-sm">
            <Swords className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-[0.14em] text-accent">
              Algorithm arcade
            </p>
            <h1 className="text-xl font-semibold tracking-[-0.03em] text-ink">Dojo Hub</h1>
            <p className="text-[length:var(--fs-xs)] text-ink3">
              Learn algorithms by playing them — one keyboard game per concept.
            </p>
          </div>
        </div>
      </header>
      <div className="dojo-hub__grid mx-auto grid w-full max-w-4xl gap-3 px-4 pb-8 pt-3">
        {DOJO_GAMES.map((game) => {
          if (game.id === 'vim') {
            return (
              <DojoGameCard
                key={game.id}
                game={game}
                completed={vim.completed}
                stars={vim.stars}
                onOpen={() => enterVim()}
              />
            );
          }
          if (game.status === 'live') {
            return <LiveDojoCard key={game.id} game={game} onOpen={() => enterDojo(game.id)} />;
          }
          return (
            <DojoGameCard key={game.id} game={game} completed={0} stars={0} onOpen={() => {}} />
          );
        })}
      </div>
    </div>
  );
}

export function DojoHubPage() {
  const { density } = useWorkspace();
  const target = useDojoTarget();
  const gameId = target.gameId;
  const GamePage = gameId ? GAME_PAGES[gameId] : undefined;

  // Normalize unknown game ids back to the hub grid.
  useEffect(() => {
    if (gameId && !GAME_PAGES[gameId]) writeDojoHash(null, { replace: true });
  }, [gameId]);

  return (
    <div
      data-density={density}
      data-surface="dojo-hub"
      className="vim-dojo-page relative isolate flex h-full w-full flex-col overflow-hidden bg-bg"
      aria-label="Algorithm Dojo Hub"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_0%,color-mix(in_srgb,var(--accent)_24%,transparent),transparent_28rem),radial-gradient(circle_at_92%_14%,rgba(248,214,121,0.12),transparent_24rem)]"
      />
      {GamePage ? (
        <Suspense
          fallback={
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-3xl border border-edge bg-panel/80 shadow-theme-md">
                <Swords className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm font-medium text-ink2">Loading dojo…</p>
            </div>
          }
        >
          <GamePage />
        </Suspense>
      ) : (
        <DojoHubGrid />
      )}
    </div>
  );
}
