import { STORAGE_KEYS } from '@/store/storageKeys';
import { readStorageText, removeStorageValue, writeStorageText } from './storage';

/** Set before a normal reload so the next page load may restore drafts from localStorage. */
export function markDraftSoftReloadExpected(): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.DRAFT_SOFT_RELOAD, '1');
  } catch {
    // ignore
  }
}

function consumeDraftSoftReload(): boolean {
  try {
    const flag = sessionStorage.getItem(STORAGE_KEYS.DRAFT_SOFT_RELOAD);
    sessionStorage.removeItem(STORAGE_KEYS.DRAFT_SOFT_RELOAD);
    return flag === '1';
  } catch {
    return false;
  }
}

function isNavigationReload(): boolean {
  if (typeof performance === 'undefined') return false;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === 'reload';
}

let pageLoadPolicy: boolean | null = null;

/** @internal test-only */
export function resetDraftPageLoadPolicyForTests(): void {
  pageLoadPolicy = null;
}

/**
 * True on navigation or soft reload; false on hard refresh (reload without beforeunload flag).
 * Evaluated once per full page load.
 */
function shouldRestoreDraftOnPageLoad(): boolean {
  if (pageLoadPolicy !== null) return pageLoadPolicy;
  const isReload = isNavigationReload();
  pageLoadPolicy = !isReload || consumeDraftSoftReload();
  return pageLoadPolicy;
}

/** Load a saved attempt. SPA item switches always restore; full reload respects soft vs hard refresh. */
export function loadPersistedDraft(draftKey: string, opts?: { itemSwitch?: boolean }): string {
  const allowRestore = opts?.itemSwitch || shouldRestoreDraftOnPageLoad();
  if (!allowRestore) {
    removeStorageValue(draftKey);
    return '';
  }
  return readStorageText(draftKey, '') ?? '';
}

/** Persist the current attempt to localStorage. Empty string removes the key. */
export function savePersistedDraft(draftKey: string, value: string): void {
  if (value === '') {
    removeStorageValue(draftKey);
  } else {
    writeStorageText(draftKey, value);
  }
}

/** Remove a saved attempt from localStorage. */
export function clearPersistedDraft(draftKey: string): void {
  removeStorageValue(draftKey);
}
