/** Parsed Vim Dojo deep-link target from the URL hash. */
export interface VimHashTarget {
  levelId?: string;
}

export const VIM_HASH_PREFIX = '#vim';

/** Fast check for the Vim Dojo route family. */
export function isVimHash(hash: string): boolean {
  return hash === VIM_HASH_PREFIX || hash.startsWith(`${VIM_HASH_PREFIX}/`);
}

/**
 * Parse Vim hash routes:
 * - `#vim`
 * - `#vim/level/{levelId}`
 */
export function parseVimHash(hash: string): VimHashTarget | null {
  if (!isVimHash(hash)) return null;
  const rest = hash.slice(VIM_HASH_PREFIX.length);
  if (!rest) return {};
  const parts = rest.split('/').filter(Boolean);
  if (parts[0] === 'level' && parts[1]) {
    return { levelId: decodeRoutePart(parts[1]) };
  }
  return {};
}

/** Write the Vim hash without a full page reload. */
export function writeVimHash(target?: VimHashTarget | null, opts?: { replace?: boolean }) {
  if (typeof location === 'undefined') return;
  let hash = VIM_HASH_PREFIX;
  if (target?.levelId) hash += `/level/${encodeURIComponent(target.levelId)}`;
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
