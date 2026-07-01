import type { CourseDef, ItemDef, TopicDef } from './types';

/** Imported category key → curated course id. */
const MERGE_MAP: Record<string, string> = {
  backtracking: 'backtracking',
  graph: 'graphs',
  'binary-search': 'binary-search',
  'dynamic-programming': 'dynamic-programming',
};

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

/** Merge imported library topics into matching curated courses and enforce sidebar order. */
export function mergeCourses(curated: CourseDef[], imported: CourseDef[]): CourseDef[] {
  const byId = new Map<string, CourseDef>(
    curated.map((c) => [c.id, { ...c, topics: [...c.topics] }]),
  );

  for (const lib of imported) {
    const category = lib.id.replace(/^lib-/, '');
    const targetId = MERGE_MAP[category];
    if (!targetId) continue;

    const target = byId.get(targetId);
    if (!target) continue;

    // Merge imported items into one flat reference topic instead of difficulty buckets.
    const importedItems: ItemDef[] = lib.topics.flatMap((t) => t.items);
    if (importedItems.length === 0) continue;

    const refTopic: TopicDef = {
      id: `${targetId}-reference`,
      title: 'Reference problems',
      summary: `${importedItems.length} imported reference solutions`,
      items: importedItems,
    };
    target.topics.push(refTopic);
  }

  // COURSE_ORDER controls sort priority, not membership: list the known ids in
  // order, then append any remaining curated courses so a newly-added one is
  // never silently dropped for being absent from the hardcoded list.
  const ordered = COURSE_ORDER.map((id) => byId.get(id)).filter((c): c is CourseDef => c != null);
  const orderedIds = new Set<string>(COURSE_ORDER);
  const rest = [...byId.values()].filter((c) => !orderedIds.has(c.id));
  return [...ordered, ...rest];
}
