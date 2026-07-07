import { readStorageJson, writeStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

export const COMMAND_PALETTE_RECENT_LIMIT = 6;

function isRecentCommandIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function readCommandPaletteRecentIds(): string[] {
  return readStorageJson(STORAGE_KEYS.COMMAND_PALETTE_RECENTS, [], isRecentCommandIds);
}

export function pushRecentCommandId(
  recentIds: string[],
  commandId: string,
  limit = COMMAND_PALETTE_RECENT_LIMIT,
): string[] {
  return [commandId, ...recentIds.filter((id) => id !== commandId)].slice(0, limit);
}

export function recordCommandPaletteRecentId(commandId: string): string[] {
  const next = pushRecentCommandId(readCommandPaletteRecentIds(), commandId);
  writeStorageJson(STORAGE_KEYS.COMMAND_PALETTE_RECENTS, next);
  return next;
}
