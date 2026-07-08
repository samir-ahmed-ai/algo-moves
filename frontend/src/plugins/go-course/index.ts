import type { CourseDef, ItemDef, TopicDef } from '../../content/types';
import type { ProblemPlugin } from '../../core/types';
import { makeGoConceptPlugin } from './factory';
import { GO_TOPICS } from './topics';

/**
 * The hand-authored "Go Course" — a complete, recall-first Go curriculum from
 * fundamentals through senior-interview topics. Every concept becomes a generic
 * ProblemPlugin (Scene player + compilable Go snippet, auto-split into the
 * Assemble/Recall exercise); the concepts are grouped into one catalog course
 * with a topic per subject area. There are no quiz or design "problems" — the
 * course is about internalizing concepts and code you can reproduce from memory.
 *
 * To extend the course, add a concept to a file under ./topics and it is picked
 * up automatically — the registry, sidebar, and Code Studio need no wiring.
 */
export const goCoursePlugins: ProblemPlugin<any, any>[] = GO_TOPICS.flatMap((t) =>
  t.concepts.map((c) => makeGoConceptPlugin(c, t)),
);

// The course id stays `go-senior` to preserve saved progress and seeded content;
// the display title is "Go Course".
export const GO_COURSE_ID = 'go-senior';
const COURSE_ID = GO_COURSE_ID;

const conceptCount = (t: (typeof GO_TOPICS)[number]) =>
  `${t.concepts.length} ${t.title.toLowerCase()} concept${t.concepts.length === 1 ? '' : 's'} to recall.`;

/**
 * Browse-taxonomy categories for the Go course — one per topic, each scoped to
 * its catalog topic so the home page and sidebar surface the course by subject.
 */
export const goBrowseCategories = GO_TOPICS.map((t) => ({
  id: `${COURSE_ID}-${t.id}`,
  title: t.title,
  summary: conceptCount(t),
  icon: t.icon,
  courseTopicId: `${COURSE_ID}-${t.id}`,
}));

export const goCourses: CourseDef[] = [
  {
    id: COURSE_ID,
    title: 'Go Course',
    summary:
      'A complete Go course for senior-interview prep — from fundamentals (types, structs, interfaces, closures, modules) through concurrency, the runtime & memory model, generics, and system design. Recall-first: every concept pairs a memory hook with a compilable Go snippet you rebuild from memory.',
    icon: 'Boxes',
    topics: GO_TOPICS.map<TopicDef>((t) => ({
      id: `${COURSE_ID}-${t.id}`,
      title: t.title,
      summary: conceptCount(t),
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
