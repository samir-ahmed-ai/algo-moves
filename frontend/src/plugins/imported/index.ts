import type { ProblemPlugin } from '../../core/types';
import type { CourseDef, ItemDef, TopicDef } from '../../content/types';
import { makeImportedPlugin, type ImportedProblem } from './factory';
import { IMPORTED_DATA } from './manifest';

/** Every imported problem as a generic ProblemPlugin (concept view + real Go code). */
export const importedPlugins: ProblemPlugin<any, any>[] = IMPORTED_DATA.map(makeImportedPlugin);

/** A `library` course per source category, with all problems in one flat topic. */
export const importedCourses: CourseDef[] = (() => {
  const byCourse = new Map<string, ImportedProblem[]>();
  for (const p of IMPORTED_DATA) {
    const arr = byCourse.get(p.course) ?? [];
    arr.push(p);
    byCourse.set(p.course, arr);
  }
  return [...byCourse.entries()].map(([course, problems]) => {
    const courseId = `lib-${problems[0]!.category}`;
    const items: ItemDef[] = problems
      .slice()
      .sort((a, b) => Number(a.number) - Number(b.number))
      .map((p) => ({ id: p.id, kind: 'problem', pluginId: p.id, status: 'todo' }));
    const topics: TopicDef[] = [
      {
        id: `${courseId}-all`,
        title: 'Reference problems',
        summary: `${items.length} imported reference solutions`,
        items,
      },
    ];
    return {
      id: courseId,
      title: course,
      summary: `${problems.length} reference solutions imported from your Go practice repo.`,
      icon: problems[0]!.courseIcon,
      topics,
    };
  });
})();
