import type { CourseDef, ItemDef, TopicDef } from '../../content/types';
import type { ProblemPlugin } from '../../core/types';
import { makeGoConceptPlugin } from '../go-course/factory';
import { OPENRTB_TOPICS } from './topics';

/**
 * The hand-authored "OpenRTB & Ad Platform Engineering (Go)" course.
 * Every concept becomes a ProblemPlugin (Scene player + Go sample + concept quiz).
 * Concepts are grouped into one catalog course with a topic per subject area.
 *
 * To extend the course, add a concept to a file under ./topics and it is picked
 * up automatically — the registry, sidebar, quiz, and Code Studio need no wiring.
 */
export const openrtbPlugins: ProblemPlugin<any, any>[] = OPENRTB_TOPICS.flatMap((t) =>
  t.concepts.map((c) => makeGoConceptPlugin(c, t, 'OpenRTB & Ad Platform Engineering')),
);

export const OPENRTB_COURSE_ID = 'openrtb-eng';
const COURSE_ID = OPENRTB_COURSE_ID;

export const openrtbBrowseCategories = OPENRTB_TOPICS.map((t) => ({
  id: `${COURSE_ID}-${t.id}`,
  title: t.title,
  summary: `${t.concepts.length} OpenRTB ${t.title.toLowerCase()} concept${t.concepts.length === 1 ? '' : 's'}.`,
  icon: t.icon,
  courseTopicId: `${COURSE_ID}-${t.id}`,
}));

export const openrtbCourses: CourseDef[] = [
  {
    id: COURSE_ID,
    title: 'OpenRTB & Ad Platform Engineering',
    summary:
      'Hands-on prep for Golang ads-platform roles — programmatic ecosystem, OpenRTB 2.6 bid request/response, bidder & exchange implementation, tracking, creatives, and at-scale system design. Each concept ships an advanced quiz, a Go coding drill, and a design question.',
    icon: 'Megaphone',
    topics: OPENRTB_TOPICS.map<TopicDef>((t) => ({
      id: `${COURSE_ID}-${t.id}`,
      title: t.title,
      summary: `${t.concepts.length} OpenRTB ${t.title.toLowerCase()} concept${t.concepts.length === 1 ? '' : 's'}.`,
      items: t.concepts.map<ItemDef>((c) => ({
        id: c.id,
        kind: 'problem',
        pluginId: c.id,
        status: 'todo',
        estimatedMinutes: 15,
      })),
    })),
  },
];
