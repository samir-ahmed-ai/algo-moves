import { describe, expect, it, vi } from 'vitest';
import { hapticError, hapticSuccess } from './haptic';

describe('haptic', () => {
  it('calls navigator.vibrate when available', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    hapticSuccess();
    expect(vibrate).toHaveBeenCalledWith(10);
    hapticError();
    expect(vibrate).toHaveBeenCalledWith(12);
    vi.unstubAllGlobals();
  });

  it('no-ops when vibrate is unavailable', () => {
    vi.stubGlobal('navigator', {});
    expect(() => hapticSuccess()).not.toThrow();
    expect(() => hapticError()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
