import { readStorageJson } from '@/store/persistence/storage';
import { createSyncStore, type SyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';

export interface DojoLevelProgress {
  completed: boolean;
  /** Best (lowest) action count for the level; drives star ratings. */
  bestMoves: number | null;
  /** Best star rating earned (1–3); games compute this against their own par. */
  stars: number;
}

export interface DojoProgress {
  levels: Record<string, DojoLevelProgress>;
}

export interface DojoProgressStore {
  read(): DojoProgress;
  write(progress: DojoProgress): void;
  use(): DojoProgress;
  /** Mark a level complete, keeping the lowest action count and best stars. Returns the new progress. */
  markLevelComplete(levelId: string, moves: number, stars: number): DojoProgress;
}

function emptyProgress(): DojoProgress {
  return { levels: {} };
}

const stores = new Map<string, DojoProgressStore>();

/**
 * Per-game persisted progress for Dojo Hub games, keyed by game id.
 * Same shape as the Vim Dojo progress so star logic is shared.
 */
export function getDojoProgressStore(gameId: string): DojoProgressStore {
  const existing = stores.get(gameId);
  if (existing) return existing;

  const key = STORAGE_KEYS.DOJO_PROGRESS(gameId);
  const store: SyncStore<DojoProgress> = createSyncStore(key, () =>
    readStorageJson(key, emptyProgress()),
  );

  const api: DojoProgressStore = {
    read: () => store.get(),
    write: (progress) => store.set(progress),
    use: () => store.use(),
    markLevelComplete(levelId, moves, stars) {
      let next!: DojoProgress;
      store.update((progress) => {
        const prev = progress.levels[levelId];
        const bestMoves = prev?.bestMoves != null ? Math.min(prev.bestMoves, moves) : moves;
        const bestStars = Math.max(prev?.stars ?? 0, stars);
        next = {
          levels: {
            ...progress.levels,
            [levelId]: { completed: true, bestMoves, stars: bestStars },
          },
        };
        return next;
      });
      return next;
    },
  };

  stores.set(gameId, api);
  return api;
}

/** A level is unlocked when it is first or its predecessor is complete. */
export function isDojoLevelUnlocked(
  levelIds: string[],
  index: number,
  progress: DojoProgress,
): boolean {
  if (index === 0) return true;
  const prevId = levelIds[index - 1];
  return prevId ? progress.levels[prevId]?.completed === true : true;
}

/** First not-yet-completed level, falling back to the first level. */
export function firstIncompleteDojoLevelId(
  levelIds: string[],
  progress: DojoProgress,
): string | null {
  for (const id of levelIds) {
    if (!progress.levels[id]?.completed) return id;
  }
  return levelIds[0] ?? null;
}

/** Completed-level count for a game. */
export function dojoCompletedCount(levelIds: string[], progress: DojoProgress): number {
  return levelIds.filter((id) => progress.levels[id]?.completed).length;
}

/** Total stars earned across all completed levels of a game. */
export function dojoStarTotal(progress: DojoProgress): number {
  return Object.values(progress.levels).reduce(
    (sum, level) => sum + (level.completed ? (level.stars ?? 0) : 0),
    0,
  );
}
