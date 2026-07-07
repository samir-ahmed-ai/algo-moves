import { readStorageText, removeStorageValue, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

const MAX_PLAYER_NAME_LENGTH = 40;
const FALLBACK_PLAYER_NAME = '';

export function normalizeLobbyPlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_PLAYER_NAME_LENGTH);
}

export function readLobbyPlayerName(): string {
  return normalizeLobbyPlayerName(
    readStorageText(STORAGE_KEYS.GAMES_NAME, FALLBACK_PLAYER_NAME) ?? '',
  );
}

export function writeLobbyPlayerName(name: string): void {
  const normalized = normalizeLobbyPlayerName(name);
  if (!normalized) {
    removeStorageValue(STORAGE_KEYS.GAMES_NAME);
    return;
  }
  writeStorageText(STORAGE_KEYS.GAMES_NAME, normalized);
}
