import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

const KEY = STORAGE_KEYS.SWIPE_QR_DISMISSED;

export function isSwipeQrPromoDismissed(): boolean {
  return readStorageText(KEY) === '1';
}

export function markSwipeQrPromoDismissed() {
  writeStorageText(KEY, '1');
}
