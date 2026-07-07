import { readStorageText, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

export interface AssembleGameStatsStore {
  read<T extends object>(gameId: string, fallback: T): T;
  write(gameId: string, value: object): void;
}

function parseAssembleBestSeconds(value: string | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveAssembleBestSeconds(primary: string | null, legacy: string | null = null): number | null {
  return parseAssembleBestSeconds(primary) ?? parseAssembleBestSeconds(legacy);
}

function isBetterAssembleTime(seconds: number, best: number | null): boolean {
  return Number.isFinite(seconds) && seconds > 0 && (best === null || seconds < best);
}

/**
 * Persisted assemble-game bests — one JSON blob per game per scope, plus legacy
 * rush-best text keys migrated on read.
 */
export function assembleGameStatsStore(scope: string): AssembleGameStatsStore {
  return {
    read<T extends object>(gameId: string, fallback: T): T {
      const raw = readStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST(gameId, scope), null);
      if (!raw) return fallback;
      try {
        return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
      } catch {
        return fallback;
      }
    },
    write(gameId: string, value: object) {
      writeStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST(gameId, scope), JSON.stringify(value));
    },
  };
}

export function readRushBestSeconds(itemId: string, variant: string | number): number | null {
  const scope = `${itemId}:${variant}`;
  const primary = readStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST('rush', scope), null);
  const legacy = readStorageText(STORAGE_KEYS.RUSH_BEST(itemId, variant), null);
  return resolveAssembleBestSeconds(primary, legacy);
}

export function writeRushBestSeconds(itemId: string, variant: string | number, seconds: number) {
  const scope = `${itemId}:${variant}`;
  const text = String(seconds);
  writeStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST('rush', scope), text);
  writeStorageText(STORAGE_KEYS.RUSH_BEST(itemId, variant), text);
}

export function maybeWriteRushBest(itemId: string, variant: string | number, seconds: number): boolean {
  if (!isBetterAssembleTime(seconds, readRushBestSeconds(itemId, variant))) return false;
  writeRushBestSeconds(itemId, variant, seconds);
  return true;
}
