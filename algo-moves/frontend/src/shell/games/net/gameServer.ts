/**
 * Resolves where the realtime game server lives and builds connection URLs.
 *
 * Priority:
 *  1. `VITE_GAMES_SERVER_URL` build-time env (e.g. https://games.example.com) —
 *     use this for a real internet deployment.
 *  2. Same host as the frontend on port 8080 — the zero-config LAN default, so
 *     opening the site on your laptop's IP from two phones just works.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1

function envUrl(): string | null {
  const raw = (import.meta.env.VITE_GAMES_SERVER_URL as string | undefined)?.trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}

/** HTTP(S) base for REST calls like `/new` and `/healthz`. */
export function gameServerHttpBase(): string {
  const env = envUrl();
  if (env) return env;
  if (typeof location === 'undefined') return 'http://localhost:8080';
  const proto = location.protocol === 'https:' ? 'https:' : 'http:';
  return `${proto}//${location.hostname}:8080`;
}

/** WebSocket URL to join a room. http→ws and https→wss are derived automatically. */
export function gameServerWsUrl(room: string, name: string): string {
  const ws = gameServerHttpBase().replace(/^http/, 'ws');
  const params = new URLSearchParams({ room: room.toUpperCase(), name });
  return `${ws}/ws?${params.toString()}`;
}

/** Whether a custom server was configured (affects the "how to run it" hint). */
export function hasConfiguredServer(): boolean {
  return envUrl() !== null;
}

/** A short, screen-friendly room code generated client-side (crypto-random). */
export function makeRoomCode(len = 4): string {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}

/** Normalise user-typed codes: upper-case, keep only alphabet chars, cap length. */
export function normalizeRoomCode(input: string, len = 4): string {
  return input
    .toUpperCase()
    .split('')
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, len);
}
