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

/** Resume the saved phase if it still exists for this problem, else the first phase. */
export function loadPhase(itemId: string, langIdx: number, av: PhaseAvailability): CodeStudioPhase {
  const seq = phaseSequence(av);
  try {
    const raw = localStorage.getItem(phaseKey(itemId, langIdx)) as CodeStudioPhase | null;
    if (raw && seq.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return seq[0];
}

export function savePhase(itemId: string, langIdx: number, phase: CodeStudioPhase) {
  try {
    localStorage.setItem(phaseKey(itemId, langIdx), phase);
  } catch {
    /* ignore */
  }
}

export function loadReassembleProgress(itemId: string, langIdx: number): ReassembleProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(itemId, langIdx));
    if (!raw) return null;
    return JSON.parse(raw) as ReassembleProgress;
  } catch {
    return null;
  }
}

export function saveReassembleProgress(itemId: string, langIdx: number, progress: ReassembleProgress) {
  try {
    localStorage.setItem(progressKey(itemId, langIdx), JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function clearReassembleProgress(itemId: string, langIdx: number) {
  try {
    localStorage.removeItem(progressKey(itemId, langIdx));
  } catch {
    /* ignore */
  }
}

export function loadQuizProgress(itemId: string, langIdx: number): QuizProgress | null {
  try {
    const raw = localStorage.getItem(quizKey(itemId, langIdx));
    if (!raw) return null;
    return JSON.parse(raw) as QuizProgress;
  } catch {
    return null;
  }
}

export function saveQuizProgress(itemId: string, langIdx: number, progress: QuizProgress) {
  try {
    localStorage.setItem(quizKey(itemId, langIdx), JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function clearQuizProgress(itemId: string, langIdx: number) {
  try {
    localStorage.removeItem(quizKey(itemId, langIdx));
  } catch {
    /* ignore */
  }
}
