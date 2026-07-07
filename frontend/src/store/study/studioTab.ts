import { readStorageText, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

function normalizeId(value: string): string | null {
  const id = value.trim();
  return id ? id : null;
}

function studioTabKey(itemId: string): string | null {
  const id = normalizeId(itemId);
  return id ? `${STORAGE_KEYS.STUDIO_TAB}:${id}` : null;
}

export function readStudioTab(itemId: string): string | null {
  const key = studioTabKey(itemId);
  if (!key) return null;
  const tabId = readStorageText(key, null)?.trim() ?? null;
  return tabId || null;
}

export function writeStudioTab(itemId: string, tabId: string): void {
  const key = studioTabKey(itemId);
  const nextTabId = normalizeId(tabId);
  if (!key || !nextTabId) return;
  writeStorageText(key, nextTabId);
}
