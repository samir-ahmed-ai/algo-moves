import type { CheckpointDef } from './types';
import { graphsCheckpoint } from './graphs';

export type { CheckpointDef } from './types';

const ALL: CheckpointDef[] = [graphsCheckpoint];

export const CHECKPOINTS: Record<string, CheckpointDef> = Object.fromEntries(
  ALL.map((c) => [c.id, c]),
);

export function getCheckpoint(id: string): CheckpointDef | undefined {
  return CHECKPOINTS[id];
}

export function hasCheckpoint(id: string): boolean {
  return id in CHECKPOINTS;
}

/** Checkpoints that certify a given course. */
export function checkpointsForCourse(courseId: string): CheckpointDef[] {
  return ALL.filter((c) => c.courseId === courseId);
}

export const CHECKPOINT_LIST: CheckpointDef[] = ALL;
