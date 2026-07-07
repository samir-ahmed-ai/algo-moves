import { readStorageText, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { LAST_ITEM_KEY } from '@/store/workspace/workspaceConstants';

const TAB_KEY = `${STORAGE_KEYS.PROGRESS}:last-tab`;

export interface StudySessionResume {
  lastItemId: string | null;
  lastTab: string | null;
}

function normalizeId(value: string | null | undefined): string | null {
  const id = value?.trim() ?? '';
  return id ? id : null;
}

export function loadStudySession(): StudySessionResume {
  return {
    lastItemId: normalizeId(readStorageText(LAST_ITEM_KEY)),
    lastTab: normalizeId(readStorageText(TAB_KEY)),
  };
}

export function saveStudyTab(tabId: string): void {
  const nextTabId = normalizeId(tabId);
  if (nextTabId) writeStorageText(TAB_KEY, nextTabId);
}

export function saveStudyResume(itemId: string): void {
  const nextItemId = normalizeId(itemId);
  if (nextItemId) writeStorageText(LAST_ITEM_KEY, nextItemId);
}
