import { STORAGE_KEYS } from '@/store/storageKeys';
import { readStorageText, removeStorageValue, writeStorageText } from './storage';

function sessionStorageSafe(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function normalizeDraftKey(draftKey: string): string {
  return draftKey.trim();
}

/** Set before a normal reload so the next page load may restore drafts from localStorage. */
export function markDraftSoftReloadExpected(): void {
  try {
    sessionStorageSafe()?.setItem(STORAGE_KEYS.DRAFT_SOFT_RELOAD, '1');
  } catch {
    // ignore
  }
}

function consumeDraftSoftReload(): boolean {
  try {
    const storage = sessionStorageSafe();
    const flag = storage?.getItem(STORAGE_KEYS.DRAFT_SOFT_RELOAD);
    storage?.removeItem(STORAGE_KEYS.DRAFT_SOFT_RELOAD);
    return flag === '1';
  } catch {
    return false;
  }
}

function isNavigationReload(): boolean {
  if (typeof globalThis.performance === 'undefined') return false;
  const nav = globalThis.performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
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

/**
 * Load a saved attempt. SPA item switches always restore; a full reload respects soft vs
 * hard refresh for whether to *show* the draft — but never deletes it. Deleting on read was
 * a data-loss hazard: an unreliable beforeunload signal (mobile background kill, crash,
 * bfcache) would silently erase the attempt. Drafts are cleared only on explicit user action.
 */
export function loadPersistedDraft(draftKey: string, opts?: { itemSwitch?: boolean }): string {
  const key = normalizeDraftKey(draftKey);
  if (!key) return '';
  const allowRestore = opts?.itemSwitch || shouldRestoreDraftOnPageLoad();
  if (!allowRestore) return '';
  return readStorageText(key, '') ?? '';
}

/** Persist the current attempt to localStorage. Empty string removes the key. */
export function savePersistedDraft(draftKey: string, value: string): void {
  const key = normalizeDraftKey(draftKey);
  if (!key) return;
  if (value === '') {
    removeStorageValue(key);
  } else {
    writeStorageText(key, value);
  }
}

/** Remove a saved attempt from localStorage. */
export function clearPersistedDraft(draftKey: string): void {
  const key = normalizeDraftKey(draftKey);
  if (key) removeStorageValue(key);
}
