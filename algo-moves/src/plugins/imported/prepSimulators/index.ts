/// <reference types="vite/client" />
import type { ProblemModule, ProblemSimulator } from './types';

export type { ProblemSimulator, ProblemModule } from './types';

/**
 * Auto-registry for hand-built prep simulators. Every `problems/*.tsx` file that
 * exports `{ manifestId, simulator }` (manifestId = the prep manifest id, e.g.
 * `prep-arrays-two-sum`) is picked up here and swaps the generic animated Scene
 * out for a real step-by-step visualization in the prep factory.
 */
const modules = import.meta.glob<ProblemModule>('./problems/*.tsx', { eager: true });

export const prepSimulatorsById: Record<string, ProblemSimulator> = {};

for (const mod of Object.values(modules)) {
  if (!mod?.simulator || !mod.manifestId) continue;
  prepSimulatorsById[mod.manifestId] = mod.simulator;
}

export function resolvePrepSimulator(manifestId: string): ProblemSimulator | undefined {
  return prepSimulatorsById[manifestId];
}
