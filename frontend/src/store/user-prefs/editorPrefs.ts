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
  /** Ignore leading/trailing whitespace and indentation when diffing the recall attempt. */
  recallIgnoreWhitespace: boolean;
  /** Strict recall: reset the attempt to empty on any typing mistake (reset-on-mistake mode). */
  strictRecall: boolean;
}

const KEY = STORAGE_KEYS.EDITOR_PREFS;
const DEFAULTS: Readonly<EditorPrefs> = {
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
  recallIgnoreWhitespace: true,
  strictRecall: false,
};

function booleanPref(value: unknown, fallback: boolean): boolean {
  return value === undefined ? fallback : value === true;
}

function numberPref(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizePrefs(data: Partial<EditorPrefs> | null | undefined): EditorPrefs {
  if (!data) return { ...DEFAULTS };
  return {
    vim: booleanPref(data.vim, DEFAULTS.vim),
    wrap: booleanPref(data.wrap, DEFAULTS.wrap),
    splitPct: clampCodeSplitPct(numberPref(data.splitPct, DEFAULTS.splitPct)),
    recallCompact: booleanPref(data.recallCompact, DEFAULTS.recallCompact),
    mergeGutter: booleanPref(data.mergeGutter, DEFAULTS.mergeGutter),
    mergeCollapse: booleanPref(data.mergeCollapse, DEFAULTS.mergeCollapse),
    fontSize: clampRecallFontSize(numberPref(data.fontSize, DEFAULTS.fontSize)),
    lineHeight: isRecallLineHeight(data.lineHeight) ? data.lineHeight : DEFAULTS.lineHeight,
    showLineNumbers: booleanPref(data.showLineNumbers, DEFAULTS.showLineNumbers),
    highlightChanges: booleanPref(data.highlightChanges, DEFAULTS.highlightChanges),
    recallIgnoreWhitespace: booleanPref(
      data.recallIgnoreWhitespace,
      DEFAULTS.recallIgnoreWhitespace,
    ),
    strictRecall: booleanPref(data.strictRecall, DEFAULTS.strictRecall),
  };
}

function load(): EditorPrefs {
  const data = readStorageJson(
    KEY,
    null as Partial<EditorPrefs> | null,
    (value): value is Partial<EditorPrefs> => {
      return value !== null && typeof value === 'object';
    },
  );
  return normalizePrefs(data);
}

const store = createSyncStore<EditorPrefs>(KEY, load);

export function loadEditorPrefs(): EditorPrefs {
  return store.get();
}

export function saveEditorPrefs(next: EditorPrefs): void {
  store.set(normalizePrefs(next));
}

export function useEditorPrefs(): [EditorPrefs, (patch: Partial<EditorPrefs>) => void] {
  const current = store.use();
  const set = useCallback((patch: Partial<EditorPrefs>) => {
    store.set(normalizePrefs({ ...store.get(), ...patch }));
  }, []);
  return [current, set];
}
