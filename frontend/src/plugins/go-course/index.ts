import type { CourseDef, ItemDef, TopicDef } from '../../content/types';
import type { ProblemPlugin } from '../../core/types';
import { makeGoConceptPlugin } from './factory';
import { GO_TOPICS } from './topics';

/**
 * The hand-authored "Go — Senior Developer" course. Every concept becomes a
 * generic ProblemPlugin (Scene player + Go sample + concept quiz); the concepts
 * are grouped into one catalog course with a topic per subject area.
 *
 * To extend the course, add a concept to a file under ./topics and it is picked
 * up automatically — the registry, sidebar, quiz, and Code Studio need no wiring.
 */
export const goCoursePlugins: ProblemPlugin<any, any>[] = GO_TOPICS.flatMap((t) =>
  t.concepts.map((c) => makeGoConceptPlugin(c, t)),
);

export const GO_COURSE_ID = 'go-senior';
const COURSE_ID = GO_COURSE_ID;

/**
 * Browse-taxonomy categories for the Go course — one per topic, each scoped to
 * its catalog topic so the home page and sidebar surface the course by subject.
 */
export const goBrowseCategories = GO_TOPICS.map((t) => ({
  id: `${COURSE_ID}-${t.id}`,
  title: t.title,
  summary: `${t.concepts.length} senior ${t.title.toLowerCase()} concept${t.concepts.length === 1 ? '' : 's'}.`,
  icon: t.icon,
  courseTopicId: `${COURSE_ID}-${t.id}`,
}));

export const goCourses: CourseDef[] = [
  {
    id: COURSE_ID,
    title: 'Go — Senior Developer',
    summary:
      'Advanced Go for senior & staff interviews — concurrency, runtime & memory, generics, and system design. Each concept ships an advanced quiz, a coding drill, and a design question.',
    icon: 'Boxes',
    topics: GO_TOPICS.map<TopicDef>((t) => ({
      id: `${COURSE_ID}-${t.id}`,
      title: t.title,
      summary: `${t.concepts.length} senior ${t.title.toLowerCase()} concept${t.concepts.length === 1 ? '' : 's'}.`,
      items: t.concepts.map<ItemDef>((c) => ({
        id: c.id,
        kind: 'problem',
        pluginId: c.id,
        status: 'todo',
        estimatedMinutes: 12,
      })),
    })),
  },
];
