import { getHashBody, readCurrentPage, writeAppUrl } from './appRoute';

/** Parsed Vim Dojo deep-link target from the URL hash. */
export interface VimHashTarget {
  levelId?: string;
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function vimRouteBody(hash: string, pathname?: string): string | null {
  if (pathname !== undefined ? readCurrentPage(pathname) === 'vim' : readCurrentPage() === 'vim') {
    return getHashBody(hash);
  }
  return null;
}

/** True when the current URL is the Vim Dojo route. */
export function isVimHash(hash: string, pathname?: string): boolean {
  return vimRouteBody(hash, pathname) !== null;
}

/**
 * Parse Vim hash routes on `/vim`:
 * - `/vim#`
 * - `/vim#level/{levelId}`
 */
export function parseVimHash(hash: string, pathname?: string): VimHashTarget | null {
  const rest = vimRouteBody(hash, pathname);
  if (rest === null) return null;
  if (!rest) return {};
  const parts = rest.split('/').filter(Boolean);
  if (parts[0] === 'level' && parts[1]) {
    return { levelId: decodeRoutePart(parts[1]) };
  }
  return {};
}

/** Write the Vim route without a full page reload. */
export function writeVimHash(target?: VimHashTarget | null, opts?: { replace?: boolean }) {
  if (typeof location === 'undefined') return;
  let hashBody = '';
  if (target?.levelId) hashBody += `level/${encodeURIComponent(target.levelId)}`;
  writeAppUrl('vim', hashBody, opts);
}
