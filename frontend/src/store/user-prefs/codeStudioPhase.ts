import { readStorageJson, removeStorageValue, writeStorageJson } from '@/store/persistence/storage';
import { STORAGE_KEYS } from '@/store/storageKeys';
export type CodeStudioPhase = 'quiz' | 'reassemble' | 'recall';

/** Which optional phases exist for the current problem + language variant. */
export interface PhaseAvailability {
  hasQuiz: boolean;
  hasPieces: boolean;
}

/** Ordered list of phases that actually exist, always ending in `recall`. */
export function phaseSequence({ hasQuiz, hasPieces }: PhaseAvailability): CodeStudioPhase[] {
  const seq: CodeStudioPhase[] = [];
  if (hasQuiz === true) seq.push('quiz');
  if (hasPieces === true) seq.push('reassemble');
  seq.push('recall');
  return seq;
}

export function firstPhase(av: PhaseAvailability): CodeStudioPhase {
  return phaseSequence(av)[0] ?? 'recall';
}

/** The phase after `current`, clamped to the last (recall). */
export function nextPhase(current: CodeStudioPhase, av: PhaseAvailability): CodeStudioPhase {
  const seq = phaseSequence(av);
  const i = seq.indexOf(current);
  if (i === -1) return firstPhase(av);
  return seq[Math.min(i + 1, seq.length - 1)] ?? 'recall';
}

export interface ReassembleProgress {
  placedIds: string[];
  trayIds: string[];
  mistakes: number;
}

export interface QuizProgress {
  index: number;
  score: number;
  done: boolean;
  /** Picked choice index for the current question, so a resume restores the answered state. */
  answered?: number | null;
  /** Choice-order seed for the current run; keeps resumed answered indexes stable. */
  shuffleSeed?: number;
}

function phaseKey(itemId: string, langIdx: number): string {
  return STORAGE_KEYS.CODE_PHASE(itemId, langIdx);
}

function progressKey(itemId: string, langIdx: number): string {
  return STORAGE_KEYS.REASSEMBLE_PROGRESS(itemId, langIdx);
}

function quizKey(itemId: string, langIdx: number): string {
  return STORAGE_KEYS.CODE_QUIZ(itemId, langIdx);
}

function isPhase(value: unknown): value is CodeStudioPhase {
  return value === 'quiz' || value === 'reassemble' || value === 'recall';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isReassembleProgress(value: unknown): value is Partial<ReassembleProgress> {
  const candidate = value as Partial<ReassembleProgress>;
  return isObject(value) && Array.isArray(candidate.placedIds) && Array.isArray(candidate.trayIds);
}

function isQuizProgress(value: unknown): value is Partial<QuizProgress> {
  const candidate = value as Partial<QuizProgress>;
  return (
    isObject(value) &&
    (candidate.answered === undefined ||
      candidate.answered === null ||
      typeof candidate.answered === 'number')
  );
}

function compactStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const id = entry.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function nonNegativeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function normalizeReassembleProgress(progress: Partial<ReassembleProgress>): ReassembleProgress {
  return {
    placedIds: compactStringIds(progress.placedIds),
    trayIds: compactStringIds(progress.trayIds),
    mistakes: nonNegativeInt(progress.mistakes),
  };
}

function normalizeQuizProgress(progress: Partial<QuizProgress>): QuizProgress {
  const next: QuizProgress = {
    index: nonNegativeInt(progress.index),
    score: nonNegativeInt(progress.score),
    done: progress.done === true,
  };
  if (progress.answered === null) next.answered = null;
  if (typeof progress.answered === 'number') next.answered = nonNegativeInt(progress.answered);
  if (typeof progress.shuffleSeed === 'number')
    next.shuffleSeed = nonNegativeInt(progress.shuffleSeed);
  return next;
}

/** Resume the saved phase if it still exists for this problem, else the first phase. */
export function loadPhase(itemId: string, langIdx: number, av: PhaseAvailability): CodeStudioPhase {
  const seq = phaseSequence(av);
  const raw = readStorageJson(phaseKey(itemId, langIdx), null as CodeStudioPhase | null, isPhase);
  if (raw && isPhase(raw) && seq.includes(raw)) return raw;
  return seq[0] ?? 'recall';
}

export function savePhase(itemId: string, langIdx: number, phase: CodeStudioPhase): void {
  if (isPhase(phase)) writeStorageJson(phaseKey(itemId, langIdx), phase);
}

export function loadReassembleProgress(itemId: string, langIdx: number): ReassembleProgress | null {
  const progress = readStorageJson(progressKey(itemId, langIdx), null, isReassembleProgress);
  return progress ? normalizeReassembleProgress(progress) : null;
}

export function saveReassembleProgress(
  itemId: string,
  langIdx: number,
  progress: ReassembleProgress,
): void {
  writeStorageJson(progressKey(itemId, langIdx), normalizeReassembleProgress(progress));
}

export function clearReassembleProgress(itemId: string, langIdx: number): void {
  removeStorageValue(progressKey(itemId, langIdx));
}

export function loadQuizProgress(itemId: string, langIdx: number): QuizProgress | null {
  const progress = readStorageJson(quizKey(itemId, langIdx), null, isQuizProgress);
  return progress ? normalizeQuizProgress(progress) : null;
}

export function saveQuizProgress(itemId: string, langIdx: number, progress: QuizProgress): void {
  writeStorageJson(quizKey(itemId, langIdx), normalizeQuizProgress(progress));
}

export function clearQuizProgress(itemId: string, langIdx: number): void {
  removeStorageValue(quizKey(itemId, langIdx));
}
