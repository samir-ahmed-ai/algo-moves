import { getHashBody, pagePath, readCurrentPage, writeAppUrl } from './appRoute';

/** Parsed Games-arcade deep-link target from the URL hash. */
export interface GamesHashTarget {
  /** Room code to auto-join (uppercased). */
  room?: string;
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function gamesRouteBody(hash: string, pathname?: string): string | null {
  if (
    pathname !== undefined ? readCurrentPage(pathname) === 'games' : readCurrentPage() === 'games'
  ) {
    return getHashBody(hash);
  }
  return null;
}

/** True when the current URL is the Games route. */
export function isGamesHash(hash: string, pathname?: string): boolean {
  return gamesRouteBody(hash, pathname) !== null;
}

/**
 * Parse Games hash routes on `/games`:
 * - `/games#`
 * - `/games#room/{code}`
 */
export function parseGamesHash(hash: string, pathname?: string): GamesHashTarget | null {
  const rest = gamesRouteBody(hash, pathname);
  if (rest === null) return null;
  if (!rest) return {};
  const parts = rest.split('/').map(decodeRoutePart).filter(Boolean);
  if (parts[0] === 'room' && parts[1]) {
    return { room: parts[1].toUpperCase() };
  }
  return {};
}

/** Full URL that opens the Games arcade (optionally on a room) for QR / copy link. */
export function buildGamesUrl(room?: string): string {
  const base =
    typeof location === 'undefined'
      ? pagePath('games')
      : `${location.origin}${pagePath('games')}${location.search || ''}`;
  let hashBody = '';
  const roomCode = room?.trim().toUpperCase();
  if (roomCode) hashBody = `room/${encodeURIComponent(roomCode)}`;
  return hashBody ? `${base}#${hashBody}` : base;
}

/** Write the Games route without a full page reload. */
export function writeGamesHash(
  target?: GamesHashTarget | null,
  opts?: { replace?: boolean },
): void {
  if (typeof location === 'undefined') return;
  let hashBody = '';
  const room = target?.room?.trim().toUpperCase();
  if (room) hashBody = `room/${encodeURIComponent(room)}`;
  writeAppUrl('games', hashBody, opts);
}
