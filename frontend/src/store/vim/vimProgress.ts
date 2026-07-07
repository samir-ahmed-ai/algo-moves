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

function load(): VimProgress {
  return readStorageJson(KEY, emptyProgress());
}

const store = createSyncStore<VimProgress>(KEY, load);

export function readVimProgress(): VimProgress {
  return store.get();
}

export function writeVimProgress(progress: VimProgress) {
  store.set(progress);
}

export function useVimProgress(): VimProgress {
  return store.use();
}

export function markLevelComplete(levelId: string, moves: number): VimProgress {
  let next!: VimProgress;
  store.update((progress) => {
    const prev = progress.levels[levelId];
    const bestMoves = prev?.bestMoves != null ? Math.min(prev.bestMoves, moves) : moves;
    next = {
      levels: {
        ...progress.levels,
        [levelId]: { completed: true, bestMoves },
      },
    };
    return next;
  });
  return next;
}

export function isLevelUnlocked(levelIds: string[], index: number, progress: VimProgress): boolean {
  if (index === 0) return true;
  const prevId = levelIds[index - 1];
  return prevId ? progress.levels[prevId]?.completed === true : true;
}

export function firstIncompleteLevelId(levelIds: string[], progress: VimProgress): string | null {
  for (const id of levelIds) {
    if (!progress.levels[id]?.completed) return id;
  }
  return levelIds[0] ?? null;
}
