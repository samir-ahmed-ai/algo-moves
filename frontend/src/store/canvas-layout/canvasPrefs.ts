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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEdgeOpts(value: unknown): EdgeOpts {
  if (!isRecord(value)) return DEFAULTS.edgeOpts;
  const next = { ...DEFAULTS.edgeOpts };
  for (const key of Object.keys(DEFAULTS.edgeOpts) as (keyof EdgeOpts)[]) {
    const fallback = DEFAULTS.edgeOpts[key];
    const candidate = value[String(key)];
    if (typeof candidate === typeof fallback) {
      (next as Record<string, unknown>)[String(key)] = candidate;
    }
  }
  return next;
}

function normalizeBg(value: unknown): BgVariant {
  return typeof value === 'string' && value.trim() ? (value.trim() as BgVariant) : DEFAULTS.bg;
}

function normalizePrefs(value: StoredCanvasPrefs | CanvasPrefs | null): CanvasPrefs {
  if (!value) return DEFAULTS;
  return {
    edgeOpts: normalizeEdgeOpts(value.edgeOpts),
    bg: normalizeBg(value.bg),
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

export function saveCanvasPrefs(p: CanvasPrefs) {
  store.set(normalizePrefs(p));
}

export function useCanvasPrefs(): CanvasPrefs {
  return store.use();
}
