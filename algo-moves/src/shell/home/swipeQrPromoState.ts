const KEY = 'algo-moves:swipe-qr-dismissed';

export function isSwipeQrPromoDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markSwipeQrPromoDismissed() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* storage blocked */
  }
}
