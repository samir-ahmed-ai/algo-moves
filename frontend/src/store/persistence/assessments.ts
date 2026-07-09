import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';
import { readStorageJson } from './storage';

/**
 * Graded checkpoint results. `bestPct` never regresses; `passedAt` latches the first
 * pass (the certification moment). localStorage-only for now (the `assessment_results`
 * server table exists; a sync adapter can layer on later).
 */
export interface AssessmentRecord {
  bestPct: number;
  passedAt?: number;
  attempts: number;
}

export interface AssessmentData {
  results: Record<string, AssessmentRecord>;
}

const KEY = STORAGE_KEYS.ASSESSMENTS;

function nonNegInt(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

function isAssessmentData(value: unknown): value is AssessmentData {
  if (!value || typeof value !== 'object') return false;
  const results = (value as Partial<AssessmentData>).results;
  return !!results && typeof results === 'object';
}

function load(): AssessmentData {
  const raw = readStorageJson<AssessmentData>(KEY, { results: {} }, isAssessmentData);
  const results: Record<string, AssessmentRecord> = {};
  for (const [id, rec] of Object.entries(raw.results)) {
    if (!rec || typeof rec !== 'object') continue;
    const r = rec as Partial<AssessmentRecord>;
    const bestPct = Math.min(100, nonNegInt(r.bestPct));
    results[id.trim()] = {
      bestPct,
      attempts: nonNegInt(r.attempts),
      ...(typeof r.passedAt === 'number' && r.passedAt > 0 ? { passedAt: r.passedAt } : {}),
    };
  }
  return { results };
}

const store = createSyncStore<AssessmentData>(KEY, load);

export function useAssessments(): AssessmentData {
  return store.use();
}

/** Record a checkpoint attempt; latch the pass timestamp the first time it passes. */
export function recordCheckpoint(
  checkpointId: string,
  pct: number,
  passPct: number,
): AssessmentRecord {
  const id = checkpointId.trim();
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  let next!: AssessmentRecord;
  store.update((data) => {
    const prev = data.results[id];
    next = {
      bestPct: Math.max(prev?.bestPct ?? 0, clamped),
      attempts: (prev?.attempts ?? 0) + 1,
      ...(prev?.passedAt
        ? { passedAt: prev.passedAt }
        : clamped >= passPct
          ? { passedAt: Date.now() }
          : {}),
    };
    return { results: { ...data.results, [id]: next } };
  });
  return next;
}

export function assessmentFor(data: AssessmentData, checkpointId: string): AssessmentRecord | null {
  return data.results[checkpointId.trim()] ?? null;
}

export function isCheckpointPassed(checkpointId: string): boolean {
  return !!store.get().results[checkpointId.trim()]?.passedAt;
}
