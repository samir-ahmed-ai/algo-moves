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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeId(value: string): string | null {
  const id = value.trim();
  return id ? id : null;
}

function normalizeBestMoves(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : null;
}

function normalizeStars(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(3, Math.max(0, Math.trunc(value)))
    : 0;
}

function normalizeProgress(value: unknown): DojoProgress {
  if (!isRecord(value) || !isRecord(value.levels)) return emptyProgress();
  const levels: Record<string, DojoLevelProgress> = {};
  for (const [rawId, rawProgress] of Object.entries(value.levels)) {
    const levelId = normalizeId(rawId);
    if (!levelId || !isRecord(rawProgress)) continue;
    levels[levelId] = {
      completed: rawProgress.completed === true,
      bestMoves: normalizeBestMoves(rawProgress.bestMoves),
      stars: normalizeStars(rawProgress.stars),
    };
  }
  return { levels };
}

function normalizeLevelIds(levelIds: string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const rawId of levelIds) {
    const id = normalizeId(rawId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

const stores = new Map<string, DojoProgressStore>();

/**
 * Per-game persisted progress for Dojo Hub games, keyed by game id.
 * Same shape as the Vim Dojo progress so star logic is shared.
 */
export function getDojoProgressStore(gameId: string): DojoProgressStore {
  const normalizedGameId = normalizeId(gameId) ?? 'dojo';
  const existing = stores.get(normalizedGameId);
  if (existing) return existing;

  const key = STORAGE_KEYS.DOJO_PROGRESS(normalizedGameId);
  const store: SyncStore<DojoProgress> = createSyncStore(key, () =>
    normalizeProgress(readStorageJson(key, emptyProgress())),
  );

  const api: DojoProgressStore = {
    read: () => store.get(),
    write: (progress) => store.set(normalizeProgress(progress)),
    use: () => store.use(),
    markLevelComplete(levelId, moves, stars) {
      const id = normalizeId(levelId);
      const moveCount = normalizeBestMoves(moves);
      if (!id || moveCount === null) return store.get();
      let next!: DojoProgress;
      store.update((progress) => {
        const normalized = normalizeProgress(progress);
        const prev = normalized.levels[id];
        const bestMoves = prev?.bestMoves != null ? Math.min(prev.bestMoves, moveCount) : moveCount;
        const bestStars = Math.max(prev?.stars ?? 0, normalizeStars(stars));
        next = {
          levels: {
            ...normalized.levels,
            [id]: { completed: true, bestMoves, stars: bestStars },
          },
        };
        return next;
      });
      return next;
    },
  };

  stores.set(normalizedGameId, api);
  return api;
}

/** A level is unlocked when it is first or its predecessor is complete. */
export function isDojoLevelUnlocked(
  levelIds: string[],
  index: number,
  progress: DojoProgress,
): boolean {
  const ids = normalizeLevelIds(levelIds);
  const currentIndex = Number.isInteger(index) ? index : 0;
  if (currentIndex <= 0) return true;
  const prevId = ids[currentIndex - 1];
  return prevId ? normalizeProgress(progress).levels[prevId]?.completed === true : true;
}

/** First not-yet-completed level, falling back to the first level. */
export function firstIncompleteDojoLevelId(
  levelIds: string[],
  progress: DojoProgress,
): string | null {
  const ids = normalizeLevelIds(levelIds);
  const normalized = normalizeProgress(progress);
  for (const id of ids) {
    if (!normalized.levels[id]?.completed) return id;
  }
  return ids[0] ?? null;
}

/** Completed-level count for a game. */
export function dojoCompletedCount(levelIds: string[], progress: DojoProgress): number {
  const normalized = normalizeProgress(progress);
  return normalizeLevelIds(levelIds).filter((id) => normalized.levels[id]?.completed).length;
}

/** Total stars earned across all completed levels of a game. */
export function dojoStarTotal(progress: DojoProgress): number {
  return Object.values(normalizeProgress(progress).levels).reduce(
    (sum, level) => sum + (level.completed ? (level.stars ?? 0) : 0),
    0,
  );
}
