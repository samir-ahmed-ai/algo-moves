// Prep simulators reuse the imported simulator contract verbatim. Each
// `problems/*.tsx` file imports `ProblemSimulator` from here (`../types`) and
// exports `{ manifestId, simulator }`.
export type { ProblemSimulator, ProblemModule } from '../simulators/types';
