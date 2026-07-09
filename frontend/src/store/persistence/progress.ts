import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';
import { createServerSync } from '@/store/persistence/sync/syncEngine';
import { mergeProgress } from '@/store/persistence/sync/mergeStrategies';
import { pullProgress, pushProgress, type ProblemProgressRow } from '@/platform';
import { logActivityToday } from './activity';
import { readStorageJson } from './storage';

export interface ProblemStat {
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
  mastered: boolean;
  /** Epoch ms of the most recent attempt — drives the server-side streak merge. */
  lastAttemptAt?: number;
}

export interface Mistake {
  id: string;
  problemId: string;
  problemTitle: string;
  prompt: string;
  picked: string;
  answer: string;
}

export interface ProgressData {
  stats: Record<string, ProblemStat>;
  mistakes: Mistake[];
}

const KEY = STORAGE_KEYS.PROGRESS;
const EMPTY: Readonly<ProblemStat> = Object.freeze({
  attempts: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  mastered: false,
});

function emptyStat(): ProblemStat {
  return { ...EMPTY };
}

function normalizeProblemId(problemId: string): string | null {
  const id = problemId.trim();
  return id || null;
}

function nonNegativeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function normalizeStat(stat: ProblemStat): ProblemStat {
  const attempts = nonNegativeInt(stat.attempts);
  const correct = Math.min(nonNegativeInt(stat.correct), attempts);
  const streak = Math.min(nonNegativeInt(stat.streak), attempts);
  const lastAttemptAt =
    typeof stat.lastAttemptAt === 'number' &&
    Number.isFinite(stat.lastAttemptAt) &&
    stat.lastAttemptAt > 0
      ? Math.round(stat.lastAttemptAt)
      : undefined;
  return {
    attempts,
    correct,
    streak,
    bestStreak: Math.min(attempts, Math.max(nonNegativeInt(stat.bestStreak), streak)),
    mastered: Boolean(stat.mastered),
    ...(lastAttemptAt !== undefined ? { lastAttemptAt } : {}),
  };
}

function isProblemStat(value: unknown): value is ProblemStat {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProblemStat>;
  return (
    typeof candidate.attempts === 'number' &&
    typeof candidate.correct === 'number' &&
    typeof candidate.streak === 'number' &&
    typeof candidate.bestStreak === 'number' &&
    typeof candidate.mastered === 'boolean'
  );
}

function isProgressData(value: unknown): value is ProgressData {
  const candidate = value as Partial<ProgressData>;
  if (!candidate || typeof candidate !== 'object') return false;
  if (!candidate.stats || typeof candidate.stats !== 'object' || !Array.isArray(candidate.mistakes))
    return false;
  if (
    !candidate.mistakes.every((m: unknown) => {
      const item = m as Partial<Mistake>;
      return (
        typeof item.id === 'string' &&
        typeof item.problemId === 'string' &&
        typeof item.problemTitle === 'string' &&
        typeof item.prompt === 'string' &&
        typeof item.picked === 'string' &&
        typeof item.answer === 'string'
      );
    })
  )
    return false;
  return Object.values(candidate.stats).every((s) => isProblemStat(s));
}

function readMistakeSeq(mistakes: Mistake[]): number {
  let max = -1;
  for (const m of mistakes) {
    const match = /^m(\d+)$/.exec(m.id);
    const seq = match?.[1] ? Number(match[1]) : NaN;
    if (Number.isFinite(seq)) max = Math.max(max, seq);
  }
  return max + 1;
}

function load(): ProgressData {
  const data = readStorageJson(KEY, { stats: {}, mistakes: [] }, isProgressData);
  return {
    stats: Object.fromEntries(
      Object.entries(data.stats)
        .map(([id, stat]) => [normalizeProblemId(id), normalizeStat(stat)] as const)
        .filter((entry): entry is readonly [string, ProblemStat] => entry[0] != null),
    ),
    mistakes: data.mistakes.flatMap((m) => {
      const id = normalizeProblemId(m.id);
      const problemId = normalizeProblemId(m.problemId);
      return id && problemId ? [{ ...m, id, problemId }] : [];
    }),
  };
}

function statsToRows(stats: Record<string, ProblemStat>): ProblemProgressRow[] {
  const now = new Date().toISOString();
  return Object.entries(stats).map(([problemId, s]) => ({
    problemId,
    attempts: s.attempts,
    correct: s.correct,
    streak: s.streak,
    bestStreak: s.bestStreak,
    mastered: s.mastered,
    updatedAt: now,
    ...(s.lastAttemptAt ? { lastAttemptAt: new Date(s.lastAttemptAt).toISOString() } : {}),
  }));
}

function rowsToStats(rows: ProblemProgressRow[]): Record<string, ProblemStat> {
  const stats: Record<string, ProblemStat> = {};
  for (const r of rows) {
    const id = normalizeProblemId(r.problemId);
    if (!id) continue;
    const parsedTs = r.lastAttemptAt ? Date.parse(r.lastAttemptAt) : NaN;
    stats[id] = normalizeStat({
      attempts: r.attempts,
      correct: r.correct,
      streak: r.streak,
      bestStreak: r.bestStreak,
      mastered: r.mastered,
      ...(Number.isFinite(parsedTs) ? { lastAttemptAt: parsedTs } : {}),
    });
  }
  return stats;
}

// Server sync: stats round-trip to /api/progress; mistakes stay local (the server
// returns none via pull, so mergeProgress preserves the local list).
const progressSync = createServerSync<ProgressData>({
  key: KEY,
  empty: { stats: {}, mistakes: [] },
  pull: async () => {
    const rows = await pullProgress();
    return rows == null ? null : { stats: rowsToStats(rows), mistakes: [] };
  },
  push: (data, opts) => pushProgress(statsToRows(data.stats), opts),
  merge: mergeProgress,
});

const store = createSyncStore<ProgressData>(KEY, load, progressSync.save);
progressSync.attach(store);

let mistakeSeq = readMistakeSeq(store.get().mistakes);

export function recordAttempt(problemId: string, correct: boolean): void {
  const id = normalizeProblemId(problemId);
  if (!id) return;
  logActivityToday();
  store.update((data) => {
    const prev = data.stats[id] ?? emptyStat();
    const streak = correct ? prev.streak + 1 : 0;
    const stat: ProblemStat = {
      attempts: prev.attempts + 1,
      correct: prev.correct + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      mastered: prev.mastered || streak >= 3,
      lastAttemptAt: Date.now(),
    };
    return { ...data, stats: { ...data.stats, [id]: stat } };
  });
}

export function setMastered(problemId: string, mastered: boolean): void {
  const id = normalizeProblemId(problemId);
  if (!id) return;
  store.update((data) => {
    const prev = data.stats[id] ?? emptyStat();
    return { ...data, stats: { ...data.stats, [id]: { ...prev, mastered } } };
  });
}

export function logMistake(m: Omit<Mistake, 'id'>): void {
  const problemId = normalizeProblemId(m.problemId);
  if (!problemId) return;
  const entry: Mistake = { ...m, problemId, id: `m${mistakeSeq++}` };
  // keep the most recent 50
  store.update((data) => ({ ...data, mistakes: [entry, ...data.mistakes].slice(0, 50) }));
}

export function clearMistakes(): void {
  store.update((data) => ({ ...data, mistakes: [] }));
}

export function resetProgress(): void {
  store.set({ stats: {}, mistakes: [] });
}

export function useProgress(): ProgressData {
  return store.use();
}

export function statFor(d: ProgressData, problemId: string): ProblemStat {
  const id = normalizeProblemId(problemId);
  return id && d.stats[id] ? d.stats[id] : emptyStat();
}
