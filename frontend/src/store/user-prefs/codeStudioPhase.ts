import { readStorageJson, readStorageText, removeStorageValue, writeStorageJson } from '@/store/persistence/storage';
export type CodeStudioPhase = 'quiz' | 'reassemble' | 'recall';

/** Which optional phases exist for the current problem + language variant. */
export interface PhaseAvailability {
  hasQuiz: boolean;
  hasPieces: boolean;
}

/** Ordered list of phases that actually exist, always ending in `recall`. */
export function phaseSequence({ hasQuiz, hasPieces }: PhaseAvailability): CodeStudioPhase[] {
  const seq: CodeStudioPhase[] = [];
  if (hasQuiz) seq.push('quiz');
  if (hasPieces) seq.push('reassemble');
  seq.push('recall');
  return seq;
}

export function firstPhase(av: PhaseAvailability): CodeStudioPhase {
  return phaseSequence(av)[0];
}

/** The phase after `current`, clamped to the last (recall). */
export function nextPhase(current: CodeStudioPhase, av: PhaseAvailability): CodeStudioPhase {
  const seq = phaseSequence(av);
  const i = seq.indexOf(current);
  if (i === -1) return firstPhase(av);
  return seq[Math.min(i + 1, seq.length - 1)];
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
}

function phaseKey(itemId: string, langIdx: number) {
  return `algo-moves:code-phase:${itemId}:${langIdx}`;
}

function progressKey(itemId: string, langIdx: number) {
  return `algo-moves:reassemble-progress:${itemId}:${langIdx}`;
}

function quizKey(itemId: string, langIdx: number) {
  return `algo-moves:code-quiz:${itemId}:${langIdx}`;
}

function isPhase(value: unknown): value is CodeStudioPhase {
  return value === 'quiz' || value === 'reassemble' || value === 'recall';
}

function isReassembleProgress(value: unknown): value is ReassembleProgress {
  const candidate = value as Partial<ReassembleProgress>;
  return (
    candidate &&
    typeof candidate === 'object' &&
    Array.isArray(candidate.placedIds) &&
    Array.isArray(candidate.trayIds) &&
    typeof candidate.mistakes === 'number'
  );
}

function isQuizProgress(value: unknown): value is QuizProgress {
  const candidate = value as Partial<QuizProgress>;
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    typeof candidate.index === 'number' &&
    typeof candidate.score === 'number' &&
    typeof candidate.done === 'boolean' &&
    (candidate.answered === undefined || candidate.answered === null || typeof candidate.answered === 'number')
  );
}

/** Resume the saved phase if it still exists for this problem, else the first phase. */
export function loadPhase(itemId: string, langIdx: number, av: PhaseAvailability): CodeStudioPhase {
  const seq = phaseSequence(av);
  const raw = readStorageText(phaseKey(itemId, langIdx));
  if (raw && isPhase(raw) && seq.includes(raw)) return raw;
  return seq[0];
}

export function savePhase(itemId: string, langIdx: number, phase: CodeStudioPhase) {
  if (isPhase(phase)) writeStorageJson(phaseKey(itemId, langIdx), phase);
}

export function loadReassembleProgress(itemId: string, langIdx: number): ReassembleProgress | null {
  return readStorageJson(progressKey(itemId, langIdx), null, isReassembleProgress);
}

export function saveReassembleProgress(itemId: string, langIdx: number, progress: ReassembleProgress) {
  writeStorageJson(progressKey(itemId, langIdx), progress);
}

export function clearReassembleProgress(itemId: string, langIdx: number) {
  removeStorageValue(progressKey(itemId, langIdx));
}

export function loadQuizProgress(itemId: string, langIdx: number): QuizProgress | null {
  return readStorageJson(quizKey(itemId, langIdx), null, isQuizProgress);
}

export function saveQuizProgress(itemId: string, langIdx: number, progress: QuizProgress) {
  writeStorageJson(quizKey(itemId, langIdx), progress);
}

export function clearQuizProgress(itemId: string, langIdx: number) {
  removeStorageValue(quizKey(itemId, langIdx));
}
