import { readStorageText, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

export function readLobbyPlayerName(): string {
  return readStorageText(STORAGE_KEYS.GAMES_NAME, '') ?? '';
}

export function writeLobbyPlayerName(name: string): void {
  writeStorageText(STORAGE_KEYS.GAMES_NAME, name.trim());
}
