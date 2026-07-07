import type { CourseDef, ItemDef, TopicDef } from './types';

/** Imported category key → curated course id. */
const MERGE_MAP: Readonly<Record<string, string>> = {
  backtracking: 'backtracking',
  graph: 'graphs',
  'binary-search': 'binary-search',
  'dynamic-programming': 'dynamic-programming',
};

const REFERENCE_TOPIC_TITLE = 'Reference problems';

export const COURSE_ORDER = [
  'backtracking',
  'graphs',
  'binary-search',
  'dynamic-programming',
  'arrays',
  'trees',
  'heaps',
  'linked-lists',
  'greedy',
] as const;

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

function cloneTopic(topic: TopicDef): TopicDef {
  return {
    id: topic.id,
    title: topic.title,
    items: topic.items.map((item) => ({ ...item })),
    ...(topic.summary ? { summary: topic.summary } : {}),
  };
}

function uniqueItems(items: readonly ItemDef[]): ItemDef[] {
  const seen = new Set<string>();
  const out: ItemDef[] = [];
  for (const item of items) {
    const id = normalizeId(item.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...item, id });
  }
  return out;
}

/** Merge imported library topics into matching curated courses and enforce sidebar order. */
export function mergeCourses(
  curated: readonly CourseDef[],
  imported: readonly CourseDef[],
): CourseDef[] {
  const byId = new Map<string, CourseDef>(
    curated.map((c) => [
      c.id,
      {
        id: c.id,
        title: c.title,
        topics: c.topics.map(cloneTopic),
        ...(c.summary ? { summary: c.summary } : {}),
        ...(c.icon ? { icon: c.icon } : {}),
      },
    ]),
  );

  for (const lib of imported) {
    const category = normalizeId(lib.id).replace(/^lib-/, '');
    const targetId = MERGE_MAP[category];
    if (!targetId) continue;

    const target = byId.get(targetId);
    if (!target) continue;

    // Merge imported items into one flat reference topic instead of difficulty buckets.
    const importedItems: ItemDef[] = uniqueItems(lib.topics.flatMap((t) => t.items));
    if (importedItems.length === 0) continue;

    const refTopicId = `${targetId}-reference`;
    const existing = target.topics.find((t) => t.id === refTopicId);
    if (existing) {
      existing.items = uniqueItems([...existing.items, ...importedItems]);
      existing.summary = `${existing.items.length} imported reference solutions`;
    } else {
      const refTopic: TopicDef = {
        id: refTopicId,
        title: REFERENCE_TOPIC_TITLE,
        summary: `${importedItems.length} imported reference solutions`,
        items: importedItems,
      };
      target.topics.push(refTopic);
    }
  }

  // COURSE_ORDER controls sort priority, not membership: list the known ids in
  // order, then append any remaining curated courses so a newly-added one is
  // never silently dropped for being absent from the hardcoded list.
  const ordered = COURSE_ORDER.map((id) => byId.get(id)).filter((c): c is CourseDef => c != null);
  const orderedIds = new Set<string>(COURSE_ORDER);
  const rest = [...byId.values()].filter((c) => !orderedIds.has(c.id));
  return [...ordered, ...rest];
}
