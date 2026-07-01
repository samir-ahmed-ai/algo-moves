import { useSyncExternalStore } from 'react';
import { readStorageJson, writeStorageJson } from './storage';

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

const KEY = 'algo-moves:progress';
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

let data: ProgressData = load();
const listeners = new Set<() => void>();

function commit(next: ProgressData) {
  data = next;
  writeStorageJson(KEY, data);
  listeners.forEach((l) => l());
}

let mistakeSeq = readMistakeSeq(data.mistakes);

export function recordAttempt(problemId: string, correct: boolean) {
  const prev = data.stats[problemId] ?? EMPTY;
  const streak = correct ? prev.streak + 1 : 0;
  const stat: ProblemStat = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    mastered: prev.mastered || streak >= 3,
  };
  commit({ ...data, stats: { ...data.stats, [problemId]: stat } });
}

export function setMastered(problemId: string, mastered: boolean) {
  const prev = data.stats[problemId] ?? EMPTY;
  commit({ ...data, stats: { ...data.stats, [problemId]: { ...prev, mastered } } });
}

export function logMistake(m: Omit<Mistake, 'id'>) {
  const entry: Mistake = { ...m, id: `m${mistakeSeq++}` };
  // keep the most recent 50
  commit({ ...data, mistakes: [entry, ...data.mistakes].slice(0, 50) });
}

export function clearMistakes() {
  commit({ ...data, mistakes: [] });
}

export function resetProgress() {
  commit({ stats: {}, mistakes: [] });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(subscribe, () => data, () => data);
}

export function statFor(d: ProgressData, problemId: string): ProblemStat {
  return d.stats[problemId] ?? EMPTY;
}
