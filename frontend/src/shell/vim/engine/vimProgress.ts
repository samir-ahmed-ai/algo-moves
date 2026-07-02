import { readStorageJson, writeStorageJson } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

const VIM_PROGRESS_KEY = STORAGE_KEYS.VIM_PROGRESS;

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

export function readVimProgress(): VimProgress {
  return readStorageJson(VIM_PROGRESS_KEY, emptyProgress());
}

export function writeVimProgress(progress: VimProgress) {
  writeStorageJson(VIM_PROGRESS_KEY, progress);
}

export function markLevelComplete(levelId: string, moves: number): VimProgress {
  const progress = readVimProgress();
  const prev = progress.levels[levelId];
  const bestMoves = prev?.bestMoves != null ? Math.min(prev.bestMoves, moves) : moves;
  progress.levels[levelId] = { completed: true, bestMoves };
  writeVimProgress(progress);
  return progress;
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
