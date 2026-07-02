/// <reference types="vite/client" />
import type { PracticeBundle } from '../../_shared/pluginKit';

const itemModules = import.meta.glob<{ bundle: PracticeBundle }>('./items/*.ts', { eager: true });

/** Per-problem teaching bundles (quiz split from quizzes.ts monolith). */
export const IMPORTED_PRACTICE: Record<string, PracticeBundle> = {};

for (const [path, mod] of Object.entries(itemModules)) {
  const id = path.match(/\/items\/(.+)\.ts$/)?.[1];
  if (id && mod?.bundle) IMPORTED_PRACTICE[id] = mod.bundle;
}
