/**
 * HTTP(S) base for backend REST and WebSocket upgrade URLs.
 *
 * Priority:
 *  1. `VITE_API_SERVER_URL` build-time env (primary)
 *  2. `VITE_GAMES_SERVER_URL` build-time env (legacy alias, one release)
 *  3. Same host as the frontend on port 8080 (LAN default)
 */
function configuredApiServerBase(): string | null {
  return (
    (
      (import.meta.env.VITE_API_SERVER_URL as string | undefined) ??
      (import.meta.env.VITE_GAMES_SERVER_URL as string | undefined)
    )?.trim() || null
  );
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function apiServerHttpBase(): string {
  const raw = configuredApiServerBase();
  if (raw) return trimTrailingSlash(raw);
  if (typeof location === 'undefined') return 'http://localhost:8080';
  const proto = location.protocol === 'https:' ? 'https:' : 'http:';
  return `${proto}//${location.hostname}:8080`;
}

/** @deprecated Use apiServerHttpBase */
export const gameServerHttpBase = apiServerHttpBase;

export function hasConfiguredApiServer(): boolean {
  return configuredApiServerBase() !== null;
}
