/** Parsed Games-arcade deep-link target from the URL hash. */
export interface GamesHashTarget {
  /** Room code to auto-join (uppercased). */
  room?: string;
}

export const GAMES_HASH_PREFIX = '#games';

/** Fast check for the Games route family. */
export function isGamesHash(hash: string): boolean {
  return hash === GAMES_HASH_PREFIX || hash.startsWith(`${GAMES_HASH_PREFIX}/`);
}

/**
 * Parse Games hash routes:
 * - `#games`
 * - `#games/room/{code}`
 */
export function parseGamesHash(hash: string): GamesHashTarget | null {
  if (!isGamesHash(hash)) return null;
  const rest = hash.slice(GAMES_HASH_PREFIX.length);
  if (!rest) return {};
  const parts = rest.split('/').filter(Boolean);
  if (parts[0] === 'room' && parts[1]) {
    return { room: decodeRoutePart(parts[1]).toUpperCase() };
  }
  return {};
}

/** Full URL that opens the Games arcade (optionally on a room) for QR / copy link. */
export function buildGamesUrl(room?: string): string {
  const base =
    typeof location === 'undefined'
      ? ''
      : `${location.origin}${location.pathname}${location.search || ''}`;
  let hash = GAMES_HASH_PREFIX;
  if (room) hash += `/room/${encodeURIComponent(room.toUpperCase())}`;
  return `${base}${hash}`;
}

/** Write the Games hash without a full page reload. */
export function writeGamesHash(target?: GamesHashTarget | null, opts?: { replace?: boolean }) {
  if (typeof location === 'undefined') return;
  let hash = GAMES_HASH_PREFIX;
  if (target?.room) hash += `/room/${encodeURIComponent(target.room.toUpperCase())}`;
  const url = `${location.pathname}${location.search}${hash}`;
  if (opts?.replace !== false) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
