import type { TrackId } from '../../content';
import { getHashBody, pagePath, readCurrentPage, writeAppUrl } from './appRoute';

/** Parsed mobile deep-link target from the URL hash. */
export interface MobileHashTarget {
  trackId?: TrackId;
  categoryId?: string;
  /** Legacy topic id (including synthetic browse-* ids). */
  topicId?: string;
  itemId?: string;
}

function decodeRoutePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function mobileRouteBody(hash: string, pathname?: string): string | null {
  if (
    pathname !== undefined ? readCurrentPage(pathname) === 'mobile' : readCurrentPage() === 'mobile'
  ) {
    return getHashBody(hash);
  }
  return null;
}

/**
 * Parse mobile hash routes on `/mobile`:
 * - `/mobile#`
 * - `/mobile#track/{trackId}`
 * - `/mobile#track/{trackId}/category/{categoryId}`
 * - `/mobile#track/{trackId}/category/{categoryId}/item/{itemId}`
 * - `/mobile#topic/{topicId}` (legacy topic ids)
 * - `/mobile#topic/{topicId}/item/{itemId}`
 */
export function parseMobileHash(hash: string, pathname?: string): MobileHashTarget | null {
  const rest = mobileRouteBody(hash, pathname);
  if (rest === null) return null;
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
  if (typeof location === 'undefined') return pagePath('mobile');
  return `${location.origin}${pagePath('mobile')}${location.search || ''}`;
}

/** Write the mobile route without a full page reload. */
export function writeMobileHash(target?: MobileHashTarget | null, opts?: { replace?: boolean }) {
  if (typeof location === 'undefined') return;
  let hashBody = '';
  const trackId = target?.trackId;
  const categoryId = target?.categoryId;
  const defaultTrack: TrackId = 'interview-prep';

  if (trackId && categoryId) {
    hashBody += `track/${encodeURIComponent(trackId)}/category/${encodeURIComponent(categoryId)}`;
    if (target.itemId) hashBody += `/item/${encodeURIComponent(target.itemId)}`;
  } else if (categoryId) {
    hashBody += `track/${encodeURIComponent(trackId ?? defaultTrack)}/category/${encodeURIComponent(categoryId)}`;
    if (target.itemId) hashBody += `/item/${encodeURIComponent(target.itemId)}`;
  } else if (target?.trackId) {
    hashBody += `track/${encodeURIComponent(target.trackId)}`;
  } else if (target?.topicId) {
    hashBody += `topic/${encodeURIComponent(target.topicId)}`;
    if (target.itemId) hashBody += `/item/${encodeURIComponent(target.itemId)}`;
  }
  writeAppUrl('mobile', hashBody, opts);
}

/** True when the current URL is the mobile route. */
export function isMobileHash(hash: string, pathname?: string): boolean {
  return mobileRouteBody(hash, pathname) !== null;
}
