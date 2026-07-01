import { useSyncExternalStore } from 'react';

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

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ProgressData;
  } catch {
    // ignore corrupt/blocked storage
  }
  return { stats: {}, mistakes: [] };
}

let data: ProgressData = load();
const listeners = new Set<() => void>();

function commit(next: ProgressData) {
  data = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota/private-mode failures — in-memory still works
  }
  listeners.forEach((l) => l());
}

let mistakeSeq = 0;

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
