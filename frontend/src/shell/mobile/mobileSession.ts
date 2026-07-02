import { readStorageJson, removeStorageValue, writeStorageJson } from '@/store/persistence';

const KEY = 'algo-moves:mobile-session';
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

export function loadMobileSession(): MobileSession | null {
  const session = readStorageJson<MobileSession | null>(KEY, null, isMobileSession);
  if (!session) return null;
  if (Date.now() - session.updatedAt > TTL_MS) {
    removeStorageValue(KEY);
    return null;
  }
  return session;
}

export function saveMobileSession(session: Omit<MobileSession, 'updatedAt'>) {
  const next: MobileSession = { ...session, updatedAt: Date.now() };
  writeStorageJson(KEY, next);
}

export function clearMobileSession() {
  removeStorageValue(KEY);
}
