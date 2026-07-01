import type { TrackId } from '../../content';

/** Parsed mobile deep-link target from the URL hash. */
export interface MobileHashTarget {
  trackId?: TrackId;
  categoryId?: string;
  /** Legacy topic id (including synthetic browse-* ids). */
  topicId?: string;
  itemId?: string;
}

/**
 * Parse mobile hash routes:
 * - `#mobile`
 * - `#mobile/track/{trackId}`
 * - `#mobile/track/{trackId}/category/{categoryId}`
 * - `#mobile/track/{trackId}/category/{categoryId}/item/{itemId}`
 * - `#mobile/topic/{topicId}` (legacy)
 * - `#mobile/topic/{topicId}/item/{itemId}` (legacy)
 */
export function parseMobileHash(hash: string): MobileHashTarget | null {
  if (!isMobileHash(hash)) return null;
  const rest = hash.slice(MOBILE_HASH_PREFIX.length);
  if (!rest) return {};
  const parts = rest.split('/').filter(Boolean);

  if (parts[0] === 'track' && parts[1]) {
    const target: MobileHashTarget = { trackId: decodeRoutePart(parts[1]) as TrackId };
    if (parts[2] === 'category' && parts[3]) {
      target.categoryId = decodeRoutePart(parts[3]);
      if (parts[4] === 'item' && parts[5]) target.itemId = decodeRoutePart(parts[5]);
    }
    return target;
  }

  if (parts[0] === 'topic' && parts[1]) {
    const topicId = decodeRoutePart(parts[1]);
    const target: MobileHashTarget = { topicId };
    if (topicId.startsWith('browse-')) target.categoryId = topicId.slice('browse-'.length);
    if (parts[2] === 'item' && parts[3]) target.itemId = decodeRoutePart(parts[3]);
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
  const trackId = target?.trackId;
  const categoryId = target?.categoryId;
  const defaultTrack: TrackId = 'interview-prep';

  if (trackId && categoryId) {
    hash += `/track/${encodeURIComponent(trackId)}/category/${encodeURIComponent(categoryId)}`;
    if (target.itemId) hash += `/item/${encodeURIComponent(target.itemId)}`;
  } else if (categoryId) {
    hash += `/track/${encodeURIComponent(trackId ?? defaultTrack)}/category/${encodeURIComponent(categoryId)}`;
    if (target.itemId) hash += `/item/${encodeURIComponent(target.itemId)}`;
  } else if (target?.trackId) {
    hash += `/track/${encodeURIComponent(target.trackId)}`;
  } else if (target?.topicId) {
    hash += `/topic/${encodeURIComponent(target.topicId)}`;
    if (target.itemId) hash += `/item/${encodeURIComponent(target.itemId)}`;
  }
  const url = `${location.pathname}${location.search}${hash}`;
  if (opts?.replace !== false) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
}

export const MOBILE_HASH_PREFIX = '#mobile';

/** Fast check for the mobile route family. */
export function isMobileHash(hash: string): boolean {
  return hash.startsWith(MOBILE_HASH_PREFIX);
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
