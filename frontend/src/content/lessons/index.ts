import type { LessonDef } from './types';
import { graphsLessons } from './graphs';
import { dynamicProgrammingLessons } from './dynamic-programming';

export type { LessonDef, LessonBlock } from './types';

/**
 * All authored lessons, indexed by id. One module per course keeps heavy prose out
 * of the plugin chunks (mirrors `_generated/courses`). Add a course by importing its
 * array here.
 */
const ALL: LessonDef[] = [...graphsLessons, ...dynamicProgrammingLessons];

export const LESSONS: Record<string, LessonDef> = Object.fromEntries(
  ALL.map((lesson) => [lesson.id, lesson]),
);

export function getLesson(id: string): LessonDef | undefined {
  return LESSONS[id];
}

export function hasLesson(id: string): boolean {
  return id in LESSONS;
}

export const LESSON_LIST: LessonDef[] = ALL;
