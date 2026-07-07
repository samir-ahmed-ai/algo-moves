import { PLATFORM_STORAGE_KEYS, readText, writeText } from '@/lib/persistence/platformStorage';
import { apiServerHttpBase } from './config';

/**
 * Platform REST client for the Go backend /api/* routes (Postgres-backed when
 * DATABASE_URL is set). Degrades gracefully when the backend has no database.
 */

let arcadeAvailable: boolean | null = null;

/** Stable browser guest id used to derive a personal room code offline. */
export function getOrCreateLocalGuestId(): string {
  const existing = readText(PLATFORM_STORAGE_KEYS.GUEST_ID);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeText(PLATFORM_STORAGE_KEYS.GUEST_ID, id);
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
  const saved = readText(PLATFORM_STORAGE_KEYS.PERSONAL_ROOM);
  if (saved) return saved;
  const code = derivePersonalRoomCode(getOrCreateLocalGuestId());
  writeText(PLATFORM_STORAGE_KEYS.PERSONAL_ROOM, code);
  return code;
}

export function setPersonalRoomCode(code: string): void {
  if (!code.trim()) return;
  writeText(PLATFORM_STORAGE_KEYS.PERSONAL_ROOM, code.trim().toUpperCase());
}

/** Whether the backend has arcade persistence (Postgres) enabled. */
export async function isArcadeConfigured(): Promise<boolean> {
  if (arcadeAvailable !== null) return arcadeAvailable;
  try {
    const res = await fetch(`${apiServerHttpBase()}/healthz`);
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
  try {
    const res = await fetch(`${apiServerHttpBase()}${path}`, {
      ...init,
      headers,
      credentials: init.credentials ?? 'include',
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Auth endpoints return structured errors for popover UI. */
export async function arcadeAuthRequest<T>(
  path: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    const res = await fetch(`${apiServerHttpBase()}${path}`, {
      ...init,
      headers,
      credentials: init.credentials ?? 'include',
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: body.error ?? `Request failed (${res.status})` };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: 'Network error — check your connection' };
  }
}
