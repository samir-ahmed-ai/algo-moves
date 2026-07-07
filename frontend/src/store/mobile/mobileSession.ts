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

function isMobileSession(value: unknown): value is MobileSession {
  const candidate = value as Partial<MobileSession>;
  if (!candidate || typeof candidate !== 'object') return false;
  return (
    typeof candidate.topicId === 'string' &&
    typeof candidate.pIdx === 'number' &&
    typeof candidate.cIdx === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    Number.isFinite(candidate.updatedAt)
  );
}

function readFresh(): MobileSession | null {
  const session = readStorageJson<MobileSession | null>(KEY, null, isMobileSession);
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
  store.set({ ...session, updatedAt: Date.now() });
}

export function clearMobileSession() {
  removeStorageValue(KEY);
  store.set(null);
}

export function useMobileSession(): MobileSession | null {
  return useSyncExternalStore(store.subscribe, syncCache, syncCache);
}
