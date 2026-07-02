import { getPluginMeta } from '../core';
import type { Course, CourseDef, Item, ItemDef, Topic } from './types';

/** Fill an item's metadata from its bound plugin, letting explicit fields win. */
function hydrateItem(def: ItemDef, courseId: string, topicId: string): Item {
  let title = def.title;
  let summary = def.summary;
  let difficulty = def.difficulty;
  let source = def.source;
  let pluginTags: string[] = [];

  if (def.kind === 'problem' && def.pluginId) {
    const p = getPluginMeta(def.pluginId);
    if (p) {
      title = title ?? p.title;
      summary = summary ?? p.summary;
      difficulty = difficulty ?? p.difficulty;
      pluginTags = p.tags ?? [];
      if (!source && p.source) source = { label: 'Source', url: p.source };
    }
  }

  return {
    id: def.id,
    kind: def.kind,
    pluginId: def.pluginId,
    title: title ?? def.id,
    summary,
    difficulty,
    tags: Array.from(new Set([...pluginTags, ...(def.tags ?? [])])),
    source,
    estimatedMinutes: def.estimatedMinutes,
    status: def.status ?? 'todo',
    prereqs: def.prereqs ?? [],
    courseId,
    topicId,
  };
}

export interface Catalog {
  courses: Course[];
  topics: Topic[];
  items: Item[];
  firstItemId: string;
  getItem(id: string): Item | undefined;
  getTopic(id: string): Topic | undefined;
  breadcrumb(itemId: string): { course?: Course; topic?: Topic; item?: Item };
  adjacent(itemId: string): { prev?: Item; next?: Item };
}

export function buildCatalog(defs: CourseDef[]): Catalog {
  const courses: Course[] = defs.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    icon: c.icon,
    topics: c.topics.map<Topic>((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      courseId: c.id,
      items: t.items.map((it) => hydrateItem(it, c.id, t.id)),
    })),
  }));

  const topics = courses.flatMap((c) => c.topics);
  const items = topics.flatMap((t) => t.items);
  const courseIndex = new Map(courses.map((c) => [c.id, c]));
  const topicIndex = new Map(topics.map((t) => [t.id, t]));
  const itemIndex = new Map(items.map((i) => [i.id, i]));

  return {
    courses,
    topics,
    items,
    firstItemId: items[0]?.id ?? '',
    getItem: (id) => itemIndex.get(id),
    getTopic: (id) => topicIndex.get(id),
    breadcrumb: (itemId) => {
      const item = itemIndex.get(itemId);
      return {
        item,
        topic: item ? topicIndex.get(item.topicId) : undefined,
        course: item ? courseIndex.get(item.courseId) : undefined,
      };
    },
    adjacent: (itemId) => {
      const idx = items.findIndex((i) => i.id === itemId);
      return {
        prev: idx > 0 ? items[idx - 1] : undefined,
        next: idx >= 0 && idx < items.length - 1 ? items[idx + 1] : undefined,
      };
    },
  };
}
