import type { ProblemPlugin } from '../../core/types';
import type { CourseDef, ItemDef, TopicDef } from '../../content/types';
import { makePrepPlugin, type PrepProblem } from './prepFactory';
import { PREP_DATA } from './prepManifest';

/** Every imported prep problem as a generic ProblemPlugin (scene anim or simulator). */
export const prepPlugins: ProblemPlugin<any, any>[] = PREP_DATA.map(makePrepPlugin);

/** Curated sidebar order for the prep library (fundamentals → structures → advanced). */
const TOPIC_ORDER = [
  'arrays',
  'strings',
  'hash-maps',
  'linked-lists',
  'stacks-queues',
  'trees',
  'tries',
  'matrices',
  'intervals',
  'prefix-sum',
  'sliding-window',
  'sorting',
  'math',
  'design',
  'streams-io',
  'database',
];

/** A standalone `prep-*` library course per prep topic (appended after curated courses). */
export const prepCourses: CourseDef[] = (() => {
  const byTopic = new Map<string, PrepProblem[]>();
  for (const p of PREP_DATA) {
    const arr = byTopic.get(p.topic) ?? [];
    arr.push(p);
    byTopic.set(p.topic, arr);
  }
  const rank = (t: string) => {
    const i = TOPIC_ORDER.indexOf(t);
    return i === -1 ? TOPIC_ORDER.length : i;
  };
  return [...byTopic.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([topic, problems]) => {
      const courseId = `prep-${topic}`;
      const items: ItemDef[] = problems
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((p) => ({ id: p.id, kind: 'problem', pluginId: p.id, status: 'todo' }));
      const onlyTopic: TopicDef = { id: `${courseId}-all`, title: problems[0].topicTitle, items };
      return {
        id: courseId,
        title: problems[0].course,
        summary: `${problems.length} ${problems[0].topicTitle} problems from your prep study collection.`,
        icon: problems[0].courseIcon,
        topics: [onlyTopic],
      };
    });
})();
