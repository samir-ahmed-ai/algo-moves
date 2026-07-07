import { getHashBody, readCurrentPage, writeAppUrl } from './appRoute';

/** Parsed Dojo Hub deep-link target from the URL hash. */
export interface DojoHashTarget {
  /** Which dojo game is open; absent means the hub grid. */
  gameId?: string;
  /** Level within the game. */
  levelId?: string;
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

function dojoRouteBody(hash: string, pathname?: string): string | null {
  if (
    pathname !== undefined ? readCurrentPage(pathname) === 'dojo' : readCurrentPage() === 'dojo'
  ) {
    return getHashBody(hash);
  }
  return null;
}

/** True when the current URL is the Dojo Hub route. */
export function isDojoHash(hash: string, pathname?: string): boolean {
  return dojoRouteBody(hash, pathname) !== null;
}

/**
 * Parse Dojo hash routes on `/dojo`:
 * - `/dojo#` — the hub grid
 * - `/dojo#g/{gameId}` — a game at its resume point
 * - `/dojo#g/{gameId}/{levelId}` — a specific level
 */
export function parseDojoHash(hash: string, pathname?: string): DojoHashTarget | null {
  const rest = dojoRouteBody(hash, pathname);
  if (rest === null) return null;
  if (!rest) return {};
  const parts = rest.split('/').map(decodeRoutePart).filter(Boolean);
  if (parts[0] === 'g' && parts[1]) {
    const target: DojoHashTarget = { gameId: parts[1] };
    if (parts[2]) target.levelId = parts[2];
    return target;
  }
  return {};
}

/**
 * Fired on window after every {@link writeDojoHash} — history.replaceState emits
 * no hashchange, so same-route listeners (the hub) subscribe to this instead.
 */
export const DOJO_NAVIGATE_EVENT = 'dojo:navigate';

/** Write the Dojo route without a full page reload. */
export function writeDojoHash(target?: DojoHashTarget | null, opts?: { replace?: boolean }) {
  if (typeof location === 'undefined') return;
  let hashBody = '';
  const gameId = target?.gameId?.trim();
  const levelId = target?.levelId?.trim();
  if (gameId) {
    hashBody = `g/${encodeURIComponent(gameId)}`;
    if (levelId) {
      hashBody += `/${encodeURIComponent(levelId)}`;
    }
  }
  writeAppUrl('dojo', hashBody, opts);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DOJO_NAVIGATE_EVENT));
}
