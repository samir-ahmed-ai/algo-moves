import { useSyncExternalStore } from 'react';
import { readStorageJson, removeStorageValue } from '@/store/persistence/storage';
import { createSyncStore } from '@/store/createSyncStore';
import { STORAGE_KEYS } from '@/store/storageKeys';

const KEY = STORAGE_KEYS.MOBILE_SESSION;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface MobileSession {
  topicId: string;
  itemId?: string;
  pIdx: number;
  cIdx: number;
  updatedAt: number;
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id ? id : null;
}

function normalizeIndex(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizeUpdatedAt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeMobileSession(value: unknown): MobileSession | null {
  const candidate = value as Partial<MobileSession>;
  if (!candidate || typeof candidate !== 'object') return null;
  const topicId = normalizeId(candidate.topicId);
  const updatedAt = normalizeUpdatedAt(candidate.updatedAt);
  if (!topicId || updatedAt === null) return null;
  const itemId = normalizeId(candidate.itemId);
  return {
    topicId,
    ...(itemId ? { itemId } : {}),
    pIdx: normalizeIndex(candidate.pIdx),
    cIdx: normalizeIndex(candidate.cIdx),
    updatedAt,
  };
}

function isMobileSession(value: unknown): value is MobileSession {
  return normalizeMobileSession(value) !== null;
}

function readFresh(): MobileSession | null {
  const session = normalizeMobileSession(
    readStorageJson<MobileSession | null>(KEY, null, isMobileSession),
  );
  if (!session) return null;
  if (Date.now() - session.updatedAt > TTL_MS) {
    removeStorageValue(KEY);
    return null;
  }
  return session;
}

const store = createSyncStore<MobileSession | null>(KEY, readFresh);

function syncCache(): MobileSession | null {
  const fresh = readFresh();
  if (fresh?.updatedAt !== store.get()?.updatedAt || (fresh === null) !== (store.get() === null)) {
    store.set(fresh);
  }
  return fresh;
}

export function loadMobileSession(): MobileSession | null {
  return syncCache();
}

export function saveMobileSession(session: Omit<MobileSession, 'updatedAt'>) {
  const normalized = normalizeMobileSession({ ...session, updatedAt: Date.now() });
  if (normalized) store.set(normalized);
}

export function clearMobileSession() {
  removeStorageValue(KEY);
  store.set(null);
}

export function useMobileSession(): MobileSession | null {
  return useSyncExternalStore(store.subscribe, syncCache, syncCache);
}
