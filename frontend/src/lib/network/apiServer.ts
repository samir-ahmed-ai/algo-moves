/**
 * HTTP(S) base for backend REST and WebSocket upgrade URLs.
 *
 * Priority:
 *  1. `VITE_GAMES_SERVER_URL` / `VITE_API_SERVER_URL` build-time env
 *  2. Same host as the frontend on port 8080 (LAN default)
 */
export function apiServerHttpBase(): string {
  const raw = (
    (import.meta.env.VITE_API_SERVER_URL as string | undefined) ??
    (import.meta.env.VITE_GAMES_SERVER_URL as string | undefined)
  )?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (typeof location === 'undefined') return 'http://localhost:8080';
  const proto = location.protocol === 'https:' ? 'https:' : 'http:';
  return `${proto}//${location.hostname}:8080`;
}

/** @deprecated Use apiServerHttpBase */
export const gameServerHttpBase = apiServerHttpBase;

export function hasConfiguredApiServer(): boolean {
  const raw = (
    (import.meta.env.VITE_API_SERVER_URL as string | undefined) ??
    (import.meta.env.VITE_GAMES_SERVER_URL as string | undefined)
  )?.trim();
  return Boolean(raw);
}
