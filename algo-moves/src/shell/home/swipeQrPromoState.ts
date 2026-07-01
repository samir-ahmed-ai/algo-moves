import { readStorageText, writeStorageText } from '../../lib/storage';

const KEY = 'algo-moves:swipe-qr-dismissed';

export function isSwipeQrPromoDismissed(): boolean {
  return readStorageText(KEY) === '1';
}

export function markSwipeQrPromoDismissed() {
  writeStorageText(KEY, '1');
}
