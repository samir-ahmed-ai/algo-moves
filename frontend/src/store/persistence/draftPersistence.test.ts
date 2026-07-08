import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadPersistedDraft,
  markDraftSoftReloadExpected,
  resetDraftPageLoadPolicyForTests,
  savePersistedDraft,
} from './draftPersistence';

function mockStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
    clear: () => map.clear(),
  };
}

const DRAFT_KEY = 'algo-moves:draft:foo:0';

describe('draftPersistence', () => {
  beforeEach(() => {
    resetDraftPageLoadPolicyForTests();
    vi.stubGlobal('localStorage', mockStorage());
    vi.stubGlobal('sessionStorage', mockStorage());
    vi.stubGlobal('performance', {
      getEntriesByType: () => [{ type: 'navigate' }],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetDraftPageLoadPolicyForTests();
  });

  it('saves and restores draft on SPA item switch', () => {
    savePersistedDraft(DRAFT_KEY, 'func main() {}');
    expect(loadPersistedDraft(DRAFT_KEY, { itemSwitch: true })).toBe('func main() {}');
  });

  it('restores draft on navigation when localStorage has a saved attempt', () => {
    savePersistedDraft(DRAFT_KEY, 'saved attempt');
    expect(loadPersistedDraft(DRAFT_KEY)).toBe('saved attempt');
  });

  it('restores draft on soft reload', () => {
    savePersistedDraft(DRAFT_KEY, 'draft text');
    markDraftSoftReloadExpected();
    resetDraftPageLoadPolicyForTests();
    vi.stubGlobal('performance', {
      getEntriesByType: () => [{ type: 'reload' }],
    });
    expect(loadPersistedDraft(DRAFT_KEY)).toBe('draft text');
  });

  it('does not restore on hard refresh but preserves the saved attempt (never deletes on read)', () => {
    savePersistedDraft(DRAFT_KEY, 'draft text');
    resetDraftPageLoadPolicyForTests();
    vi.stubGlobal('performance', {
      getEntriesByType: () => [{ type: 'reload' }],
    });
    // Editor starts empty (not auto-restored) on a hard refresh...
    expect(loadPersistedDraft(DRAFT_KEY)).toBe('');
    // ...but the attempt survives so an unreliable reload signal can't erase work,
    // and a later SPA item switch can still recover it.
    expect(localStorage.getItem(DRAFT_KEY)).toBe('draft text');
    expect(loadPersistedDraft(DRAFT_KEY, { itemSwitch: true })).toBe('draft text');
  });

  it('returns empty when nothing is saved', () => {
    expect(loadPersistedDraft(DRAFT_KEY)).toBe('');
  });

  it('removes the storage key when saving an empty draft', () => {
    savePersistedDraft(DRAFT_KEY, 'text');
    savePersistedDraft(DRAFT_KEY, '');
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
