import { catalog } from './index';
import {
  buildProblemUnlockGraph,
  getUnmetPrerequisites,
  isItemUnlocked,
  type MasteryLookup,
} from './taxonomy';

/**
 * Activates the (previously dormant) prerequisite unlock graph. `content` cannot
 * import `store`, so callers inject a `MasteryLookup` built from the progress store
 * (and, later, read lessons). Gating is SOFT — consumers dim/tooltip locked items
 * but keep them clickable; the lookup indirection means a future server-synced
 * progress source swaps in without touching call sites.
 */

let cached: Map<string, string[]> | null = null;

/** Memoized item-id → prerequisite-item-ids adjacency for the whole catalog. */
export function getUnlockGraph(): Map<string, string[]> {
  cached ??= buildProblemUnlockGraph(catalog.items);
  return cached;
}

/** Item ids blocking `itemId`, given how the caller decides mastery. */
export function unmetPrereqs(itemId: string, isMastered: MasteryLookup): string[] {
  return getUnmetPrerequisites(itemId, getUnlockGraph(), isMastered);
}

/** True when every prerequisite of `itemId` is mastered (or there are none). */
export function itemUnlocked(itemId: string, isMastered: MasteryLookup): boolean {
  return isItemUnlocked(itemId, getUnlockGraph(), isMastered);
}

export type { MasteryLookup };
