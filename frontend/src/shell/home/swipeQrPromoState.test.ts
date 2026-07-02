import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isSwipeQrPromoDismissed, markSwipeQrPromoDismissed } from './swipeQrPromoState';

function mockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
}

describe('swipeQrPromoState', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts undismissed', () => {
    expect(isSwipeQrPromoDismissed()).toBe(false);
  });

  it('remembers dismissal', () => {
    markSwipeQrPromoDismissed();
    expect(isSwipeQrPromoDismissed()).toBe(true);
  });
});
