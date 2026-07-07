/// <reference types="vite/client" />
import type { ProblemModule, ProblemSimulator } from './types';

export type { ProblemSimulator, ProblemModule, DpSimulator, DpModule } from './types';

/**
 * Auto-registry: every `problems/*.tsx` file that exports `{ manifestId, simulator }`
 * (or legacy `{ title, simulator }`) is picked up here.
 */
const modules = import.meta.glob<ProblemModule>('./problems/*.tsx', { eager: true });

/** Simulators keyed by manifest id (preferred). */
export const simulatorsById: Record<string, ProblemSimulator> = {};
/** Legacy fallback keyed by exact manifest title. */
export const simulatorsByTitle: Record<string, ProblemSimulator> = {};

for (const mod of Object.values(modules)) {
  if (!mod?.simulator) continue;
  if (mod.manifestId) simulatorsById[mod.manifestId] = mod.simulator;
  if (mod.title) simulatorsByTitle[mod.title] = mod.simulator;
}

export function resolveSimulator(
  manifestId: string,
  title: string,
  category: string,
): ProblemSimulator | undefined {
  const SIMULATED = new Set(['dynamic-programming', 'graph', 'backtracking', 'binary-search']);
  if (!SIMULATED.has(category)) return undefined;
  return simulatorsById[manifestId] ?? simulatorsByTitle[title];
}
