import { readStorageText, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

function studioTabKey(itemId: string): string {
  return `${STORAGE_KEYS.STUDIO_TAB}:${itemId}`;
}

export function readStudioTab(itemId: string): string | null {
  return readStorageText(studioTabKey(itemId), null);
}

export function writeStudioTab(itemId: string, tabId: string): void {
  writeStorageText(studioTabKey(itemId), tabId);
}
