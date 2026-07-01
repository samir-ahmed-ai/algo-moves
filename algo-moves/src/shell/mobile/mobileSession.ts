const KEY = 'algo-moves:mobile-session';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface MobileSession {
  topicId: string;
  itemId?: string;
  pIdx: number;
  cIdx: number;
  updatedAt: number;
}

export function loadMobileSession(): MobileSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MobileSession;
    if (!session.topicId || typeof session.pIdx !== 'number' || typeof session.cIdx !== 'number') return null;
    if (Date.now() - session.updatedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveMobileSession(session: Omit<MobileSession, 'updatedAt'>) {
  try {
    const next: MobileSession = { ...session, updatedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
}

export function clearMobileSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
