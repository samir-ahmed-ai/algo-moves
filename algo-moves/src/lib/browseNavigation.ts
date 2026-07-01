import { catalog } from '../content';
import { parseMobileHash } from '../shell/mobile/mobileHash';
import type { TrackId } from '../content';
import { isMobileHash } from '../shell/mobile/mobileHash';

export interface BrowseNavigationState {
  trackId: TrackId | null;
  categoryId: string | null;
  topicId: string | null;
}

/**
 * Hydrate browse flags from `#mobile/...` only when that route is active.
 * Shared `?item=` links must not leave stale browse state on the canvas workspace.
 */
export function initialBrowseFromHash(
  hash: string,
  sharedItem?: string | null,
): BrowseNavigationState {
  if (sharedItem && catalog.getItem(sharedItem)) {
    return { trackId: null, categoryId: null, topicId: null };
  }
  if (!isMobileHash(hash)) {
    return { trackId: null, categoryId: null, topicId: null };
  }
  const parsed = parseMobileHash(hash);
  return {
    trackId: parsed?.trackId ?? null,
    categoryId: parsed?.categoryId ?? null,
    topicId: parsed?.topicId ?? null,
  };
}
