import { defaultEdgeOpts, type BgVariant, type EdgeOpts } from '@/lib/canvas/layoutPrefs';
import { readStorageJson } from '@/store/persistence/storage';
import { createSyncStore } from '@/store/createSyncStore';
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

function load(): CanvasPrefs {
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

const store = createSyncStore<CanvasPrefs>(KEY, load);

export function loadCanvasPrefs(): CanvasPrefs {
  return store.get();
}

export function saveCanvasPrefs(p: CanvasPrefs) {
  store.set(p);
}

export function useCanvasPrefs(): CanvasPrefs {
  return store.use();
}
