import type { GoTopic } from '../types';
import { concurrency } from './concurrency';
import { runtimeMemory } from './runtime-memory';
import { interfacesTypes } from './interfaces-types';
import { generics } from './generics';
import { errors } from './errors';
import { slicesMaps } from './slices-maps';
import { stdlibIdioms } from './stdlib-idioms';
import { performance } from './performance';
import { testing } from './testing';
import { design } from './design';

/** Ordered topics for the Go — Senior Developer course. */
export const GO_TOPICS: GoTopic[] = [
  concurrency,
  runtimeMemory,
  interfacesTypes,
  generics,
  errors,
  slicesMaps,
  stdlibIdioms,
  performance,
  testing,
  design,
];
