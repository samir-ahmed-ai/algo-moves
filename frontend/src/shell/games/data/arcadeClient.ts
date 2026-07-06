import { gameServerHttpBase } from '../net/gameServer';
import { readStorageText, writeStorageText } from '@/store/persistence';
import { STORAGE_KEYS } from '@/store/storageKeys';

/**
 * Arcade persistence talks to the Go backend's /api/* routes, backed by
 * Railway Postgres when DATABASE_URL is set on the server. The arcade degrades
 * gracefully when the backend has no database — LAN play still works.
 */

const SESSION_KEY = 'algo-moves-games-session';

let arcadeAvailable: boolean | null = null;

export function getSessionToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

/** Stable browser guest id used to derive a personal room code offline. */
export function getOrCreateLocalGuestId(): string {
  const existing = readStorageText(STORAGE_KEYS.GAMES_GUEST_ID);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeStorageText(STORAGE_KEYS.GAMES_GUEST_ID, id);
  return id;
}

function derivePersonalRoomCode(guestId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < guestId.length; i++) {
    hash ^= guestId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
}

/** Personal room code for this browser — stable even without Postgres. */
export function getPersonalRoomCode(): string {
  const saved = readStorageText(STORAGE_KEYS.GAMES_PERSONAL_ROOM);
  if (saved) return saved;
  const code = derivePersonalRoomCode(getOrCreateLocalGuestId());
  writeStorageText(STORAGE_KEYS.GAMES_PERSONAL_ROOM, code);
  return code;
}

export function setPersonalRoomCode(code: string): void {
  if (!code.trim()) return;
  writeStorageText(STORAGE_KEYS.GAMES_PERSONAL_ROOM, code.trim().toUpperCase());
}

/** Whether the game server has arcade persistence (Postgres) enabled. */
export async function isArcadeConfigured(): Promise<boolean> {
  if (arcadeAvailable !== null) return arcadeAvailable;
  try {
    const res = await fetch(`${gameServerHttpBase()}/healthz`);
    if (!res.ok) {
      arcadeAvailable = false;
      return false;
    }
    const body = (await res.json()) as { arcade?: boolean };
    arcadeAvailable = Boolean(body.arcade);
    return arcadeAvailable;
  } catch {
    arcadeAvailable = false;
    return false;
  }
}

export function resetArcadeConfiguredCache(): void {
  arcadeAvailable = null;
}

export async function arcadeFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T | null> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (init.auth !== false) {
    const token = getSessionToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  try {
    const res = await fetch(`${gameServerHttpBase()}${path}`, { ...init, headers });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
