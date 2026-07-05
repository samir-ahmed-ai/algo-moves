import { defaultEdgeOpts, type BgVariant, type EdgeOpts } from '@/lib/canvas/layoutPrefs';
import { readStorageJson, writeStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';

export interface CanvasPrefs {
  edgeOpts: EdgeOpts;
  bg: BgVariant;
}

const KEY = STORAGE_KEYS.CANVAS_PREFS;

const DEFAULTS: CanvasPrefs = {
  edgeOpts: defaultEdgeOpts,
  bg: 'dots',
};

interface StoredCanvasPrefs {
  edgeOpts?: Partial<EdgeOpts>;
  bg?: BgVariant;
}

export function loadCanvasPrefs(): CanvasPrefs {
  const raw = readStorageJson<StoredCanvasPrefs | CanvasPrefs | null>(KEY, null, (value): value is StoredCanvasPrefs | CanvasPrefs => {
    if (!value || typeof value !== 'object') return false;
    return typeof (value as StoredCanvasPrefs).bg === 'string' || !!(value as StoredCanvasPrefs).edgeOpts;
  });
  if (!raw) return DEFAULTS;
  return {
    edgeOpts: { ...DEFAULTS.edgeOpts, ...(raw.edgeOpts ?? {}) },
    bg: raw.bg ?? DEFAULTS.bg,
  };
}

export function saveCanvasPrefs(p: CanvasPrefs) {
  writeStorageJson(KEY, p);
}
