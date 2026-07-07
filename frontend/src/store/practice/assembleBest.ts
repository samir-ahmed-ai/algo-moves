import { readStorageText, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

export interface AssembleGameStatsStore {
  read<T extends object>(gameId: string, fallback: T): T;
  write(gameId: string, value: object): void;
}

function parseAssembleBestSeconds(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isBetterAssembleTime(seconds: number, best: number | null): boolean {
  return Number.isFinite(seconds) && seconds > 0 && (best === null || seconds < best);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Persisted assemble-game bests — one JSON blob per game per scope. */
export function assembleGameStatsStore(scope: string): AssembleGameStatsStore {
  return {
    read<T extends object>(gameId: string, fallback: T): T {
      const raw = readStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST(gameId, scope), null);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return isPlainRecord(parsed) ? { ...fallback, ...(parsed as Partial<T>) } : fallback;
      } catch {
        return fallback;
      }
    },
    write(gameId: string, value: object) {
      if (!isPlainRecord(value)) return;
      writeStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST(gameId, scope), JSON.stringify(value));
    },
  };
}

export function readRushBestSeconds(itemId: string, variant: string | number): number | null {
  const scope = `${itemId}:${variant}`;
  const primary = readStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST('rush', scope), null);
  return parseAssembleBestSeconds(primary);
}

export function writeRushBestSeconds(itemId: string, variant: string | number, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const scope = `${itemId}:${variant}`;
  writeStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST('rush', scope), String(seconds));
}

export function maybeWriteRushBest(
  itemId: string,
  variant: string | number,
  seconds: number,
): boolean {
  if (!isBetterAssembleTime(seconds, readRushBestSeconds(itemId, variant))) return false;
  writeRushBestSeconds(itemId, variant, seconds);
  return true;
}
