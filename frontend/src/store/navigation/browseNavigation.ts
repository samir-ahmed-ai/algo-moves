import { catalog } from '@/content';
import type { TrackId } from '@/content';
import { parseMobileHash, isMobileHash } from '@/lib/navigation';

export interface BrowseNavigationState {
  trackId: TrackId | null;
  categoryId: string | null;
  topicId: string | null;
}

/**
 * Hydrate browse flags from `/mobile#...` only when that route is active.
 * Shared `?item=` links must not leave stale browse state on the canvas workspace.
 */
export function initialBrowseFromHash(
  hash: string,
  sharedItem?: string | null,
  pathname?: string,
): BrowseNavigationState {
  const itemId = sharedItem?.trim();
  if (itemId && catalog.getItem(itemId)) {
    return { trackId: null, categoryId: null, topicId: null };
  }
  if (!isMobileHash(hash, pathname)) {
    return { trackId: null, categoryId: null, topicId: null };
  }
  const parsed = parseMobileHash(hash, pathname);
  return {
    trackId: parsed?.trackId ?? null,
    categoryId: parsed?.categoryId ?? null,
    topicId: parsed?.topicId ?? null,
  };
}
