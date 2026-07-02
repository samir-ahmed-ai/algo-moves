import { STORAGE_KEYS } from '@/store/storageKeys';
import { createSyncStore } from '@/store/createSyncStore';
import { readStorageJson } from './storage';

export interface ProblemStat {
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
  mastered: boolean;
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
const EMPTY: ProblemStat = { attempts: 0, correct: 0, streak: 0, bestStreak: 0, mastered: false };

function isProblemStat(value: unknown): value is ProblemStat {
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
  if (!candidate.stats || typeof candidate.stats !== 'object' || !Array.isArray(candidate.mistakes)) return false;
  if (!candidate.mistakes.every((m: unknown) => {
    const item = m as Partial<Mistake>;
    return (
      typeof item.id === 'string' &&
      typeof item.problemId === 'string' &&
      typeof item.problemTitle === 'string' &&
      typeof item.prompt === 'string' &&
      typeof item.picked === 'string' &&
      typeof item.answer === 'string'
    );
  })) return false;
  return Object.values(candidate.stats).every((s) => isProblemStat(s));
}

function readMistakeSeq(mistakes: Mistake[]): number {
  let max = -1;
  for (const m of mistakes) {
    const match = /^m(\d+)$/.exec(m.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function load(): ProgressData {
  return readStorageJson(KEY, { stats: {}, mistakes: [] }, isProgressData);
}

const store = createSyncStore<ProgressData>(KEY, load);

let mistakeSeq = readMistakeSeq(store.get().mistakes);

export function recordAttempt(problemId: string, correct: boolean) {
  store.update((data) => {
    const prev = data.stats[problemId] ?? EMPTY;
    const streak = correct ? prev.streak + 1 : 0;
    const stat: ProblemStat = {
      attempts: prev.attempts + 1,
      correct: prev.correct + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      mastered: prev.mastered || streak >= 3,
    };
    return { ...data, stats: { ...data.stats, [problemId]: stat } };
  });
}

export function setMastered(problemId: string, mastered: boolean) {
  store.update((data) => {
    const prev = data.stats[problemId] ?? EMPTY;
    return { ...data, stats: { ...data.stats, [problemId]: { ...prev, mastered } } };
  });
}

export function logMistake(m: Omit<Mistake, 'id'>) {
  const entry: Mistake = { ...m, id: `m${mistakeSeq++}` };
  // keep the most recent 50
  store.update((data) => ({ ...data, mistakes: [entry, ...data.mistakes].slice(0, 50) }));
}

export function clearMistakes() {
  store.update((data) => ({ ...data, mistakes: [] }));
}

export function resetProgress() {
  store.set({ stats: {}, mistakes: [] });
}

export function useProgress(): ProgressData {
  return store.use();
}

export function statFor(d: ProgressData, problemId: string): ProblemStat {
  return d.stats[problemId] ?? EMPTY;
}
