import {
  defaultEdgeOpts,
  normalizeBgVariant,
  normalizeEdgeOpts as normalizeCanvasEdgeOpts,
  type BgVariant,
  type EdgeOpts,
} from '@/lib/canvas/layoutPrefs';
import { readStorageJson } from '@/store/persistence/storage';
import { createSyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';

export interface CanvasPrefs {
  readonly edgeOpts: EdgeOpts;
  readonly bg: BgVariant;
}

const KEY = STORAGE_KEYS.CANVAS_PREFS;

const DEFAULTS: Readonly<CanvasPrefs> = {
  edgeOpts: defaultEdgeOpts,
  bg: 'dots',
};

interface StoredCanvasPrefs {
  edgeOpts?: Partial<EdgeOpts>;
  bg?: BgVariant;
}

function defaultPrefs(): CanvasPrefs {
  return {
    edgeOpts: { ...DEFAULTS.edgeOpts },
    bg: DEFAULTS.bg,
  };
}

function normalizePrefs(value: StoredCanvasPrefs | CanvasPrefs | null): CanvasPrefs {
  if (!value) return defaultPrefs();
  return {
    edgeOpts: normalizeCanvasEdgeOpts(value.edgeOpts),
    bg: normalizeBgVariant(value.bg, DEFAULTS.bg),
  };
}

function load(): CanvasPrefs {
  const raw = readStorageJson<StoredCanvasPrefs | CanvasPrefs | null>(
    KEY,
    null,
    (value): value is StoredCanvasPrefs | CanvasPrefs => {
      if (!value || typeof value !== 'object') return false;
      return (
        typeof (value as StoredCanvasPrefs).bg === 'string' ||
        !!(value as StoredCanvasPrefs).edgeOpts
      );
    },
  );
  return normalizePrefs(raw);
}

const store = createSyncStore<CanvasPrefs>(KEY, load);

export function loadCanvasPrefs(): CanvasPrefs {
  return store.get();
}

export function saveCanvasPrefs(p: CanvasPrefs): void {
  store.set(normalizePrefs(p));
}

export function useCanvasPrefs(): CanvasPrefs {
  return store.use();
}
