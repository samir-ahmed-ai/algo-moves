import { buildCatalog } from './catalog';
import { curatedCourses } from './courses';
import { mergeCourses } from './mergeCourses';
import { importedCourses } from '../plugins/imported';
import { prepCourses } from '../plugins/imported/prep';

export const catalog = buildCatalog([
  ...mergeCourses(curatedCourses, importedCourses),
  ...prepCourses,
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
