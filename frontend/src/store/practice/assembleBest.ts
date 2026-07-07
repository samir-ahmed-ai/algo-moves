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

function normalizeKeyPart(value: string | number): string | null {
  const key = String(value).trim();
  return key ? key : null;
}

function assembleBestKey(gameId: string, scope: string): string | null {
  const normalizedGameId = normalizeKeyPart(gameId);
  const normalizedScope = normalizeKeyPart(scope);
  return normalizedGameId && normalizedScope
    ? STORAGE_KEYS.ASSEMBLE_GAME_BEST(normalizedGameId, normalizedScope)
    : null;
}

function rushScope(itemId: string, variant: string | number): string | null {
  const normalizedItemId = normalizeKeyPart(itemId);
  const normalizedVariant = normalizeKeyPart(variant);
  return normalizedItemId && normalizedVariant ? `${normalizedItemId}:${normalizedVariant}` : null;
}

/** Persisted assemble-game bests — one JSON blob per game per scope. */
export function assembleGameStatsStore(scope: string): AssembleGameStatsStore {
  const normalizedScope = normalizeKeyPart(scope);
  return {
    read<T extends object>(gameId: string, fallback: T): T {
      if (!normalizedScope) return fallback;
      const key = assembleBestKey(gameId, normalizedScope);
      if (!key) return fallback;
      const raw = readStorageText(key, null);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return isPlainRecord(parsed) ? { ...fallback, ...(parsed as Partial<T>) } : fallback;
      } catch {
        return fallback;
      }
    },
    write(gameId: string, value: object): void {
      if (!isPlainRecord(value)) return;
      if (!normalizedScope) return;
      const key = assembleBestKey(gameId, normalizedScope);
      if (key) writeStorageText(key, JSON.stringify(value));
    },
  };
}

export function readRushBestSeconds(itemId: string, variant: string | number): number | null {
  const scope = rushScope(itemId, variant);
  if (!scope) return null;
  const primary = readStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST('rush', scope), null);
  return parseAssembleBestSeconds(primary);
}

export function writeRushBestSeconds(
  itemId: string,
  variant: string | number,
  seconds: number,
): void {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const scope = rushScope(itemId, variant);
  if (scope) writeStorageText(STORAGE_KEYS.ASSEMBLE_GAME_BEST('rush', scope), String(seconds));
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
