import type { QuizQuestion } from '@/core/types';

export type QuizState = {
  index: number;
  picked: number | null;
  score: number;
  done: boolean;
  shuffleSeed: number;
};

export type QuizAction =
  | { type: 'PICK'; index: number; correct: boolean }
  | { type: 'NEXT' }
  | { type: 'FINISH' }
  | { type: 'RESTART'; seed: number };

export function initialQuizState(): QuizState {
  return { index: 0, picked: null, score: 0, done: false, shuffleSeed: 0 };
}

export function quizReducer(state: QuizState, action: QuizAction, total: number): QuizState {
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  switch (action.type) {
    case 'PICK':
      if (state.picked !== null || state.done) return state;
      return {
        ...state,
        picked: action.index,
        score: action.correct ? state.score + 1 : state.score,
      };
    case 'NEXT':
      if (state.index >= safeTotal - 1) return { ...state, done: true, picked: null };
      return { ...state, index: state.index + 1, picked: null };
    case 'FINISH':
      return { ...state, done: true, picked: null };
    case 'RESTART':
      return { index: 0, picked: null, score: 0, done: false, shuffleSeed: action.seed };
    default:
      return state;
  }
}

export function quizAccuracy(score: number, total: number): number {
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  return safeTotal > 0 ? Math.round((safeScore / safeTotal) * 100) : 0;
}

export function currentQuizQuestion(
  quiz: QuizQuestion[],
  state: QuizState,
): QuizQuestion | undefined {
  const index = Number.isFinite(state.index) ? Math.max(0, Math.floor(state.index)) : 0;
  return quiz[index];
}
