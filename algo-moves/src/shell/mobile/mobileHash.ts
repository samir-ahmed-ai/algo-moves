/** Parsed mobile deep-link target from the URL hash. */
export interface MobileHashTarget {
  topicId?: string;
  itemId?: string;
}

/** Parse `#mobile`, `#mobile/topic/{id}`, or `#mobile/topic/{id}/item/{id}`. */
export function parseMobileHash(hash: string): MobileHashTarget | null {
  if (!hash.startsWith('#mobile')) return null;
  const rest = hash.slice('#mobile'.length);
  if (!rest) return {};
  const parts = rest.split('/').filter(Boolean);
  if (parts[0] === 'topic' && parts[1]) {
    const target: MobileHashTarget = { topicId: decodeURIComponent(parts[1]) };
    if (parts[2] === 'item' && parts[3]) target.itemId = decodeURIComponent(parts[3]);
    return target;
  }
  return {};
}

/** Full URL that opens Swipe mode on the current origin (for QR / copy link). */
export function buildMobileModeUrl(): string {
  if (typeof location === 'undefined') return '#mobile';
  return `${location.origin}${location.pathname}${location.search || ''}#mobile`;
}

/** Write the mobile hash without a full page reload. */
export function writeMobileHash(target?: MobileHashTarget | null, opts?: { replace?: boolean }) {
  if (typeof location === 'undefined') return;
  let hash = '#mobile';
  if (target?.topicId) {
    hash += `/topic/${encodeURIComponent(target.topicId)}`;
    if (target.itemId) hash += `/item/${encodeURIComponent(target.itemId)}`;
  }
  const url = `${location.pathname}${location.search}${hash}`;
  if (opts?.replace !== false) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}
