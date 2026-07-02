import { useCallback } from 'react';
import { readStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';

export interface EditorPrefs {
  vim: boolean;
  wrap: boolean;
  splitPct: number;
}

const KEY = STORAGE_KEYS.EDITOR_PREFS;
const DEFAULTS: EditorPrefs = { vim: false, wrap: false, splitPct: 50 };

export const SPLIT_MIN = 28;
export const SPLIT_MAX = 72;

export function clampSplitPct(pct: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct));
}

function load(): EditorPrefs {
  const data = readStorageJson(KEY, null as Partial<EditorPrefs> | null, (value): value is Partial<EditorPrefs> => {
    return value !== null && typeof value === 'object';
  });
  if (!data) return DEFAULTS;
  return {
    vim: Boolean(data.vim),
    wrap: Boolean(data.wrap),
    splitPct: clampSplitPct(typeof data.splitPct === 'number' ? data.splitPct : DEFAULTS.splitPct),
  };
}

const store = createSyncStore<EditorPrefs>(KEY, load);

export function loadEditorPrefs(): EditorPrefs {
  return store.get();
}

export function saveEditorPrefs(next: EditorPrefs) {
  store.set(next);
}

export function useEditorPrefs(): [EditorPrefs, (patch: Partial<EditorPrefs>) => void] {
  const current = store.use();
  const set = useCallback((patch: Partial<EditorPrefs>) => {
    const next = { ...store.get(), ...patch };
    if (patch.splitPct !== undefined) next.splitPct = clampSplitPct(patch.splitPct);
    store.set(next);
  }, []);
  return [current, set];
}
