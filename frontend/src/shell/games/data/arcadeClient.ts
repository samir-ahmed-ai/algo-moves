import { gameServerHttpBase } from '../net/gameServer';

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
