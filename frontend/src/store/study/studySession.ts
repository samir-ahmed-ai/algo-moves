import { readStorageText, writeStorageText } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { LAST_ITEM_KEY } from '@/store/workspace/workspaceConstants';

const TAB_KEY = `${STORAGE_KEYS.PROGRESS}:last-tab`;

export interface StudySessionResume {
  lastItemId: string | null;
  lastTab: string | null;
}

export function loadStudySession(): StudySessionResume {
  return {
    lastItemId: readStorageText(LAST_ITEM_KEY) || null,
    lastTab: readStorageText(TAB_KEY) || null,
  };
}

export function saveStudyTab(tabId: string): void {
  writeStorageText(TAB_KEY, tabId);
}

export function saveStudyResume(itemId: string): void {
  writeStorageText(LAST_ITEM_KEY, itemId);
}
