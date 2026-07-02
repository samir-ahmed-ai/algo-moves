import { buildCatalog } from './catalog';
import { curatedCourses } from './courses';
import { mergeCourses } from './mergeCourses';
// Light, generated course defs (no heavy plugin manifests) — keeps catalog build
// out of the imported/prep/go-course chunks. Regenerate with `npm run build-plugin-meta`.
import { IMPORTED_COURSES, PREP_COURSES, GO_COURSES } from '@/plugins/_generated/courses';

export const catalog = buildCatalog([
  ...mergeCourses(curatedCourses, IMPORTED_COURSES),
  ...PREP_COURSES,
  ...GO_COURSES,
]);

export type { Catalog } from './catalog';
export * from './types';
export * from './tags';
export * from './patterns';
export * from './glossary';
export * from './taxonomy';
export * from './browse';
export { PROBLEM_GLYPHS } from './glyphs';
export { SHAPE_GLYPHS, glyphFor, shapeFor, type ShapeKey } from './problemShape';
export { PROBLEM_GISTS, gistFor } from './gists';
