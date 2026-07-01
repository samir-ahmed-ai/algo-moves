import { useCallback, useSyncExternalStore } from 'react';

export interface EditorPrefs {
  vim: boolean;
  wrap: boolean;
  splitPct: number;
}

const KEY = 'algo-moves:editor-prefs';
const DEFAULTS: EditorPrefs = { vim: false, wrap: false, splitPct: 50 };

export const SPLIT_MIN = 28;
export const SPLIT_MAX = 72;

export function clampSplitPct(pct: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct));
}

function load(): EditorPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EditorPrefs>;
      return {
        vim: !!parsed.vim,
        wrap: !!parsed.wrap,
        splitPct: clampSplitPct(typeof parsed.splitPct === 'number' ? parsed.splitPct : DEFAULTS.splitPct),
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

let prefs: EditorPrefs = load();
const listeners = new Set<() => void>();

function commit(next: EditorPrefs) {
  prefs = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function loadEditorPrefs(): EditorPrefs {
  return prefs;
}

export function saveEditorPrefs(next: EditorPrefs) {
  commit(next);
}

export function useEditorPrefs(): [EditorPrefs, (patch: Partial<EditorPrefs>) => void] {
  const current = useSyncExternalStore(subscribe, () => prefs, () => prefs);
  const set = useCallback((patch: Partial<EditorPrefs>) => {
    const next = { ...prefs, ...patch };
    if (patch.splitPct !== undefined) next.splitPct = clampSplitPct(patch.splitPct);
    commit(next);
  }, []);
  return [current, set];
}
