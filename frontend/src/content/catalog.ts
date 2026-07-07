import { getPluginMeta } from '../core';
import type { Course, CourseDef, Item, ItemDef, Topic } from './types';

function uniqueIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function normalizeEstimatedMinutes(minutes: number | undefined): number | undefined {
  if (minutes == null || !Number.isFinite(minutes)) return undefined;
  return Math.max(1, Math.round(minutes));
}

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
  const estimatedMinutes = normalizeEstimatedMinutes(def.estimatedMinutes);

  return {
    id: def.id,
    kind: def.kind,
    title: title ?? def.id,
    tags: uniqueIds([...pluginTags, ...(def.tags ?? [])]),
    status: def.status ?? 'todo',
    prereqs: uniqueIds(def.prereqs ?? []),
    courseId,
    topicId,
    ...(def.pluginId ? { pluginId: def.pluginId } : {}),
    ...(summary ? { summary } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(source ? { source } : {}),
    ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
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
    topics: c.topics.map<Topic>((t) => ({
      id: t.id,
      title: t.title,
      courseId: c.id,
      items: t.items.map((it) => hydrateItem(it, c.id, t.id)),
      ...(t.summary ? { summary: t.summary } : {}),
    })),
    ...(c.summary ? { summary: c.summary } : {}),
    ...(c.icon ? { icon: c.icon } : {}),
  }));

  const topics = courses.flatMap((c) => c.topics);
  const items = topics.flatMap((t) => t.items);
  const courseIndex = new Map(courses.map((c) => [c.id, c]));
  const topicIndex = new Map(topics.map((t) => [t.id, t]));
  const itemIndex = new Map(items.map((i) => [i.id, i]));
  const itemPosition = new Map(items.map((i, idx) => [i.id, idx]));

  return {
    courses,
    topics,
    items,
    firstItemId: items[0]?.id ?? '',
    getItem: (id) => itemIndex.get(id),
    getTopic: (id) => topicIndex.get(id),
    breadcrumb: (itemId) => {
      const item = itemIndex.get(itemId);
      const topic = item ? topicIndex.get(item.topicId) : undefined;
      const course = item ? courseIndex.get(item.courseId) : undefined;
      return {
        ...(item ? { item } : {}),
        ...(topic ? { topic } : {}),
        ...(course ? { course } : {}),
      };
    },
    adjacent: (itemId) => {
      const idx = itemPosition.get(itemId) ?? -1;
      return {
        ...(idx > 0 && items[idx - 1] ? { prev: items[idx - 1] } : {}),
        ...(idx >= 0 && idx < items.length - 1 && items[idx + 1] ? { next: items[idx + 1] } : {}),
      };
    },
  };
}
