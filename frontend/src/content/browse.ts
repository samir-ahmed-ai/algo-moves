import type { Catalog } from './catalog';
import type { Item, Topic } from './types';
import {
  browseTopicId,
  categoryIdFromBrowseTopic,
  getAllCategories,
  getCategoriesForTrack,
  getCategoryById,
  getTrackById,
  getTracks,
  isBrowseTopicId,
  type BrowseCategory,
  type BrowseTrack,
  type TrackId,
} from './taxonomy';

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export type { BrowseCategory, BrowseTrack, TrackId };
export {
  browseTopicId,
  categoryIdFromBrowseTopic,
  getAllCategories,
  getCategoriesForTrack,
  getCategoryById,
  getTrackById,
  getTracks,
  isBrowseTopicId,
};

function normalizeSearch(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function itemMatchesQuery(item: Item, q: string): boolean {
  return (
    item.title.toLowerCase().includes(q) ||
    item.summary?.toLowerCase().includes(q) === true ||
    item.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

/** Collect all drillable problems for a browse category, deduped and sorted. */
export function getItemsForCategory(categoryId: string, catalog: Catalog): Item[] {
  const cat = getCategoryById(categoryId);
  if (!cat) return [];

  const seen = new Set<string>();
  const items: Item[] = [];

  for (const src of cat.sources) {
    const course = catalog.courses.find((c) => c.id === src.courseId);
    if (!course) continue;

    const topics = src.topicIds
      ? course.topics.filter((t) => src.topicIds!.includes(t.id))
      : course.topics;

    for (const topic of topics) {
      for (const item of topic.items) {
        if (!item.pluginId || seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  return items.sort((a, b) => collator.compare(a.title, b.title));
}

/** Build a synthetic Topic for mobile deck / sidebar sibling navigation. */
export function topicForCategory(categoryId: string, catalog: Catalog): Topic | undefined {
  const cat = getCategoryById(categoryId);
  if (!cat) return undefined;
  const items = getItemsForCategory(categoryId, catalog);
  if (items.length === 0) return undefined;
  return {
    id: browseTopicId(categoryId),
    title: cat.title,
    summary: cat.summary,
    courseId: cat.sources[0]?.courseId ?? '',
    items,
  };
}

/** Resolve a catalog or synthetic browse topic to its category id. */
export function categoryIdForTopic(topicId: string): string | undefined {
  if (isBrowseTopicId(topicId)) return categoryIdFromBrowseTopic(topicId);
  const topic = getAllCategories().find((cat) =>
    cat.sources.some((src) => {
      const prefix = `${src.courseId}-`;
      return topicId.startsWith(prefix) || topicId === `${src.courseId}-all`;
    }),
  );
  return topic?.id;
}

/** Find which track owns a category (first match). */
export function trackForCategory(categoryId: string): BrowseTrack | undefined {
  for (const track of getTracks()) {
    if (track.id === 'interview-prep') continue;
    if (track.categoryIds.includes(categoryId)) return track;
  }
  return getTrackById('interview-prep');
}

/** Count problems in a category without building the full item list twice. */
export function countItemsForCategory(categoryId: string, catalog: Catalog): number {
  return getItemsForCategory(categoryId, catalog).length;
}

/** Search categories and problems across all tracks. */
export function searchBrowse(
  query: string,
  catalog: Catalog,
): { categories: BrowseCategory[]; items: Item[] } {
  const q = normalizeSearch(query);
  if (!q) return { categories: getAllCategories(), items: [] };

  const categories = getAllCategories().filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      getItemsForCategory(c.id, catalog).some((it) => itemMatchesQuery(it, q)),
  );

  const itemSeen = new Set<string>();
  const items: Item[] = [];
  for (const cat of getAllCategories()) {
    for (const item of getItemsForCategory(cat.id, catalog)) {
      if (itemSeen.has(item.id)) continue;
      if (itemMatchesQuery(item, q)) {
        itemSeen.add(item.id);
        items.push(item);
      }
    }
  }

  return { categories, items: items.sort((a, b) => collator.compare(a.title, b.title)) };
}

let itemToCategoryCache: WeakMap<Catalog, Map<string, string>> | null = null;

function buildItemCategoryIndex(catalog: Catalog): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of getAllCategories()) {
    for (const item of getItemsForCategory(cat.id, catalog)) {
      if (!map.has(item.id)) map.set(item.id, cat.id);
    }
  }
  return map;
}

/** Which browse category contains this item? */
export function categoryIdForItem(itemId: string, catalog: Catalog): string | undefined {
  itemToCategoryCache ??= new WeakMap<Catalog, Map<string, string>>();
  let index = itemToCategoryCache.get(catalog);
  if (!index) {
    index = buildItemCategoryIndex(catalog);
    itemToCategoryCache.set(catalog, index);
  }
  return index.get(itemId);
}

/** Full sibling list for in-problem navigation — category items if found, else catalog topic fallback. */
export function getSiblingItems(itemId: string, catalog: Catalog): Item[] {
  const catId = categoryIdForItem(itemId, catalog);
  if (catId) return getItemsForCategory(catId, catalog);
  const topic = catalog.breadcrumb(itemId).topic;
  const sibs = topic?.items.filter((i) => i.pluginId) ?? [];
  return sibs.length >= 2 ? sibs : catalog.items.filter((i) => i.pluginId);
}

/** Display breadcrumb: Track › Category › Item */
export function browseBreadcrumbForItem(
  itemId: string,
  catalog: Catalog,
): {
  track?: BrowseTrack;
  category?: BrowseCategory;
  item?: Item;
} {
  const item = catalog.getItem(itemId);
  const catId = categoryIdForItem(itemId, catalog);
  const category = catId ? getCategoryById(catId) : undefined;
  const track = catId ? trackForCategory(catId) : undefined;
  return { track, category, item };
}
