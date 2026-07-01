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
