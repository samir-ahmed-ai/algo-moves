/**
 * Central registry of verified per-language solution ports, keyed by problem id.
 *
 * Each course/batch contributes a generated ports map (Go→Python+Java, all
 * differentially verified against the Go reference). The factory (factory.tsx)
 * injects whatever ports exist for a problem as extra Code tabs. Add a batch by
 * importing its generated map and spreading it below.
 */
import { PROBLEM_PORTS as GRAPH_PORTS, type ProblemPorts } from './story/archipelago';
import { IMPORTED_LIBS_PORTS } from './ports/importedLibs.generated';
import { PREP_PORTS } from './ports/prep.generated';

export type { ProblemPorts };

export const PROBLEM_PORTS: Record<string, ProblemPorts> = {
  ...GRAPH_PORTS,
  ...IMPORTED_LIBS_PORTS,
  ...PREP_PORTS,
};
