import type { GoTopic } from '../types';
// Fundamentals
import { basics } from './basics';
import { typesValues } from './types-values';
import { collections } from './collections';
import { functionsClosures } from './functions-closures';
import { structsMethods } from './structs-methods';
import { interfacesBasics } from './interfaces-basics';
import { stringsRunes } from './strings-runes';
import { packagesModules } from './packages-modules';
// Senior-interview depth
import { errors } from './errors';
import { slicesMaps } from './slices-maps';
import { interfacesTypes } from './interfaces-types';
import { generics } from './generics';
import { concurrency } from './concurrency';
import { runtimeMemory } from './runtime-memory';
import { stdlibIdioms } from './stdlib-idioms';
import { performance } from './performance';
import { testing } from './testing';
import { design } from './design';

/** Ordered topics for the Go Course — fundamentals first, then senior depth. */
export const GO_TOPICS: GoTopic[] = [
  basics,
  typesValues,
  collections,
  functionsClosures,
  structsMethods,
  interfacesBasics,
  stringsRunes,
  packagesModules,
  errors,
  slicesMaps,
  interfacesTypes,
  generics,
  concurrency,
  runtimeMemory,
  stdlibIdioms,
  performance,
  testing,
  design,
];
