import { useCallback } from 'react';
import { readStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';
import { clampCodeSplitPct } from '@/lib/editor/resizeSplit';
import {
  clampRecallFontSize,
  isRecallLineHeight,
  RECALL_FONT_DEFAULT,
  type RecallLineHeight,
} from '@/lib/editor/recallEditorTheme';

export interface EditorPrefs {
  vim: boolean;
  wrap: boolean;
  splitPct: number;
  /** Icon-only recall toolbar with editor toggles in the overflow menu. */
  recallCompact: boolean;
  /** Show change markers in the recall merge gutter. */
  mergeGutter: boolean;
  /** Collapse long unchanged regions in the recall merge view. */
  mergeCollapse: boolean;
  /** Recall editor font size in px. */
  fontSize: number;
  /** Recall editor line height preset. */
  lineHeight: RecallLineHeight;
  /** Show line numbers in recall merge view. */
  showLineNumbers: boolean;
  /** Highlight changed lines in the merge diff view. */
  highlightChanges: boolean;
}

const KEY = STORAGE_KEYS.EDITOR_PREFS;
const DEFAULTS: EditorPrefs = {
  vim: false,
  wrap: false,
  splitPct: 50,
  recallCompact: true,
  mergeGutter: true,
  mergeCollapse: true,
  fontSize: RECALL_FONT_DEFAULT,
  lineHeight: 'normal',
  showLineNumbers: true,
  highlightChanges: true,
};

function load(): EditorPrefs {
  const data = readStorageJson(
    KEY,
    null as Partial<EditorPrefs> | null,
    (value): value is Partial<EditorPrefs> => {
      return value !== null && typeof value === 'object';
    },
  );
  if (!data) return DEFAULTS;
  return {
    vim: Boolean(data.vim),
    wrap: Boolean(data.wrap),
    splitPct: clampCodeSplitPct(
      typeof data.splitPct === 'number' ? data.splitPct : DEFAULTS.splitPct,
    ),
    recallCompact:
      data.recallCompact !== undefined ? Boolean(data.recallCompact) : DEFAULTS.recallCompact,
    mergeGutter: data.mergeGutter !== undefined ? Boolean(data.mergeGutter) : DEFAULTS.mergeGutter,
    mergeCollapse:
      data.mergeCollapse !== undefined ? Boolean(data.mergeCollapse) : DEFAULTS.mergeCollapse,
    fontSize: clampRecallFontSize(
      typeof data.fontSize === 'number' ? data.fontSize : DEFAULTS.fontSize,
    ),
    lineHeight: isRecallLineHeight(data.lineHeight) ? data.lineHeight : DEFAULTS.lineHeight,
    showLineNumbers:
      data.showLineNumbers !== undefined ? Boolean(data.showLineNumbers) : DEFAULTS.showLineNumbers,
    highlightChanges:
      data.highlightChanges !== undefined
        ? Boolean(data.highlightChanges)
        : DEFAULTS.highlightChanges,
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
    if (patch.splitPct !== undefined) next.splitPct = clampCodeSplitPct(patch.splitPct);
    if (patch.fontSize !== undefined) next.fontSize = clampRecallFontSize(patch.fontSize);
    store.set(next);
  }, []);
  return [current, set];
}
