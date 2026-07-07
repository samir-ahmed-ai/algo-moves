import { readStorageJson } from '@/store/persistence/storage';
import { createSyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';

const KEY = STORAGE_KEYS.VIM_PROGRESS;

export interface LevelProgress {
  completed: boolean;
  bestMoves: number | null;
}

export interface VimProgress {
  levels: Record<string, LevelProgress>;
}

function emptyProgress(): VimProgress {
  return { levels: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLevelId(levelId: string): string | null {
  const id = levelId.trim();
  return id ? id : null;
}

function normalizeBestMoves(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : null;
}

function normalizeProgress(value: unknown): VimProgress {
  if (!isRecord(value) || !isRecord(value.levels)) return emptyProgress();
  const levels: Record<string, LevelProgress> = {};
  for (const [rawId, rawProgress] of Object.entries(value.levels)) {
    const levelId = normalizeLevelId(rawId);
    if (!levelId || !isRecord(rawProgress)) continue;
    levels[levelId] = {
      completed: rawProgress.completed === true,
      bestMoves: normalizeBestMoves(rawProgress.bestMoves),
    };
  }
  return { levels };
}

function normalizeLevelIds(levelIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const rawId of levelIds) {
    const id = normalizeLevelId(rawId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function load(): VimProgress {
  return normalizeProgress(readStorageJson(KEY, emptyProgress()));
}

const store = createSyncStore<VimProgress>(KEY, load);

export function readVimProgress(): VimProgress {
  return store.get();
}

export function writeVimProgress(progress: VimProgress): void {
  store.set(normalizeProgress(progress));
}

export function useVimProgress(): VimProgress {
  return store.use();
}

export function markLevelComplete(levelId: string, moves: number): VimProgress {
  const id = normalizeLevelId(levelId);
  const moveCount = normalizeBestMoves(moves);
  if (!id || moveCount === null) return store.get();
  let next!: VimProgress;
  store.update((progress) => {
    const prev = progress.levels[id];
    const bestMoves = prev?.bestMoves != null ? Math.min(prev.bestMoves, moveCount) : moveCount;
    next = {
      levels: {
        ...progress.levels,
        [id]: { completed: true, bestMoves },
      },
    };
    return next;
  });
  return next;
}

export function isLevelUnlocked(
  levelIds: readonly string[],
  index: number,
  progress: VimProgress,
): boolean {
  const ids = normalizeLevelIds(levelIds);
  const currentIndex = Number.isInteger(index) ? index : 0;
  if (currentIndex <= 0) return true;
  const prevId = ids[currentIndex - 1];
  return prevId ? normalizeProgress(progress).levels[prevId]?.completed === true : true;
}

export function firstIncompleteLevelId(
  levelIds: readonly string[],
  progress: VimProgress,
): string | null {
  const ids = normalizeLevelIds(levelIds);
  const normalized = normalizeProgress(progress);
  for (const id of ids) {
    if (!normalized.levels[id]?.completed) return id;
  }
  return ids[0] ?? null;
}
